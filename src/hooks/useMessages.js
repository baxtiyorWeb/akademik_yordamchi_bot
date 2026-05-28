import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { streamGeminiResponse } from '../api/gemini';
import { streamOpenRouterResponse } from '../api/openrouter';

const USE_OPENROUTER = false; // Disabled as per user request to use gemini.js instead

export const useMessages = (session) => {
  const queryClient = useQueryClient();
  const userId = session?.user?.id;

  const messagesQuery = useQuery({
    queryKey: ['messages', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        isNew: false
      }));
    },
    enabled: !!userId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ userText, currentMessages, attachment, mode = 'TUTOR' }) => {
      if (!userId) return;

      // 1. Save User Message
      let dbContent = userText;
      if (attachment) {
        const fileName = attachment.name || `image_${Date.now()}.png`;
        dbContent += `\n\n[Ilova: ${fileName}]`;
      }
      const { data: userMsg, error: userErr } = await supabase
        .from('messages')
        .insert([{ user_id: userId, role: 'user', content: dbContent }])
        .select()
        .single();
      
      if (userErr) throw userErr;

      // 2. Prepare AI Stream
      const tempAiId = `a-temp-${Date.now()}`;
      queryClient.setQueryData(['messages', userId], (old = []) => [
        ...old.filter(m => !m.id.toString().startsWith('temp-')), // Remove optimistic user message
        { id: userMsg.id, role: 'user', content: dbContent },    // Add real user message
        { id: tempAiId, role: 'ai', content: '', isNew: true }   // Add temp AI message
      ]);

      const streamFn = USE_OPENROUTER ? streamOpenRouterResponse : streamGeminiResponse;

      const fullReply = await streamFn(userText, currentMessages, attachment, mode, (text) => {
        queryClient.setQueryData(['messages', userId], (old = []) => {
          return old.map(m => m.id === tempAiId ? { ...m, content: text } : m);
        });
      });

      // 3. Save AI Message
      await supabase.from('messages').insert([{ user_id: userId, role: 'ai', content: fullReply }]);

      return { userText, replyText: fullReply };
    },
    onMutate: async ({ userText }) => {
      await queryClient.cancelQueries({ queryKey: ['messages', userId] });
      const previousMessages = queryClient.getQueryData(['messages', userId]);

      // Optimistic user message
      queryClient.setQueryData(['messages', userId], (old = []) => [
        ...old,
        { id: `temp-u-${Date.now()}`, role: 'user', content: userText }
      ]);

      return { previousMessages };
    },
    onError: (err, newTodo, context) => {
      queryClient.setQueryData(['messages', userId], context.previousMessages);
    },
    onSettled: () => {
      // Delay invalidation to allow streaming to finish smoothly
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['messages', userId] });
      }, 500);
    },
  });

  const clearChatMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('messages').delete().eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.setQueryData(['messages', userId], []);
    },
  });

  return {
    messages: messagesQuery.data || [],
    isLoading: messagesQuery.isLoading,
    isSending: sendMessageMutation.isPending,
    setMessages: (newMsgs) => queryClient.setQueryData(['messages', userId], newMsgs),
    sendMessage: sendMessageMutation.mutate,
    clearChat: clearChatMutation.mutate,
  };
};

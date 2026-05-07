import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { fetchGeminiResponse, streamGeminiResponse } from '../api/gemini';

export const useMessages = (session) => {
  const queryClient = useQueryClient();
  const userId = session?.user?.id;

  // Xabarlar tarixini olish
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

  // Yangi xabar qo'shish (User + AI Streaming)
  const sendMessageMutation = useMutation({
    mutationFn: async ({ userText, currentMessages, attachment, mode = 'TUTOR' }) => {
      if (!userId) return;

      // 1. User xabarini DB ga saqlash
      let dbContent = userText;
      if (attachment) dbContent += `\n\n[Ilova: ${attachment.name}]`;
      await supabase.from('messages').insert([{ user_id: userId, role: 'user', content: dbContent }]);

      // 2. AI dan oqim shaklida javob olish
      const tempAiId = `a-${Date.now()}`;
      
      // Lokal cache ni yangilash (AI xabari uchun joy ochish)
      queryClient.setQueryData(['messages', userId], (old = []) => [
        ...old,
        { id: tempAiId, role: 'ai', content: '', isNew: true }
      ]);

      const fullReply = await streamGeminiResponse(userText, currentMessages, attachment, mode, (text) => {
        // Har bir chunk kelganda lokal cache ni yangilaymiz
        queryClient.setQueryData(['messages', userId], (old = []) => {
          return old.map(m => m.id === tempAiId ? { ...m, content: text } : m);
        });
      });

      // 3. AI xabarini DB ga saqlash
      await supabase.from('messages').insert([{ user_id: userId, role: 'ai', content: fullReply }]);

      return { userText, replyText: fullReply, attachment };
    },
    onMutate: async ({ userText, attachment }) => {
      await queryClient.cancelQueries({ queryKey: ['messages', userId] });
      const previousMessages = queryClient.getQueryData(['messages', userId]);

      const attachmentPreview = attachment && attachment.type.startsWith('image/') 
        ? URL.createObjectURL(attachment) 
        : null;

      queryClient.setQueryData(['messages', userId], (old = []) => [
        ...old,
        { 
          id: `temp-u-${Date.now()}`, 
          role: 'user', 
          content: userText, 
          attachment: attachmentPreview,
          isNew: false 
        }
      ]);

      return { previousMessages };
    },
    // onSuccess ni olib tashlaymiz, chunki biz lokal cache ni stream davomida yangilab bo'ldik
    onError: (err, newTodo, context) => {
      queryClient.setQueryData(['messages', userId], context.previousMessages);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', userId] });
    },
  });

  // Suhbatni tozalash
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
    sendMessage: sendMessageMutation.mutate,
    clearChat: clearChatMutation.mutate,
  };
};

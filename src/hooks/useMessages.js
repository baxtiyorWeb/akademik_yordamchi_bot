import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { streamGeminiResponse } from '../api/gemini';
import { streamOpenRouterResponse } from '../api/openrouter';

import { useState, useMemo } from 'react';

const USE_OPENROUTER = false;

export const useMessages = (session) => {
  const queryClient = useQueryClient();
  const userId = session?.user?.id;

  const [activeSessionId, setActiveSessionId] = useState(() => {
    return localStorage.getItem('typer_session_id') || null;
  });

  const changeSession = (id) => {
    setActiveSessionId(id);
    if (id) localStorage.setItem('typer_session_id', id);
    else localStorage.removeItem('typer_session_id');
  };

  const sessionsQuery = useQuery({
    queryKey: ['tutor_sessions', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('tutor_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const messagesQuery = useQuery({
    queryKey: ['messages', activeSessionId],
    queryFn: async () => {
      if (!activeSessionId) return [];
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', activeSessionId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!activeSessionId,
    staleTime: 1000 * 60 * 5, // 5 daqiqa davomida qayta yuklamaydi (stream uzilib qolmasligi uchun)
  });

  const activeMessages = useMemo(() => {
    const data = messagesQuery.data || [];
    return data.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      isNew: false
    }));
  }, [messagesQuery.data]);

  const sendMessageMutation = useMutation({
    mutationFn: async ({ userText, currentMessages, attachment, mode = 'TUTOR' }) => {
      if (!userId) return;

      let currentSessionId = activeSessionId;

      // 1. Agar joriy sessiya bo'lmasa, yangi 'tutor_sessions' yaratamiz
      if (!currentSessionId) {
        const { data: newSession, error: sessionErr } = await supabase
          .from('tutor_sessions')
          .insert([{ user_id: userId, title: userText.substring(0, 30) + '...' }])
          .select()
          .single();
        if (sessionErr) throw sessionErr;
        
        currentSessionId = newSession.id;
        changeSession(currentSessionId);
        queryClient.invalidateQueries({ queryKey: ['tutor_sessions', userId] });
      }

      // 2. Foydalanuvchi xabarini saqlash
      let dbContent = userText;
      if (attachment) {
        const fileName = attachment.name || `image_${Date.now()}.png`;
        dbContent += `\n\n[Ilova: ${fileName}]`;
      }
      
      const { data: userMsg, error: userErr } = await supabase
        .from('messages')
        .insert([{ user_id: userId, session_id: currentSessionId, role: 'user', content: dbContent }])
        .select()
        .single();
      
      if (userErr) throw userErr;

      // 3. AI streamni tayyorlash
      const tempAiId = `a-temp-${Date.now()}`;
      queryClient.setQueryData(['messages', currentSessionId], (old = []) => [
        ...old.filter(m => !m.id?.toString().startsWith('temp-')), 
        { id: userMsg.id, role: 'user', content: dbContent },
        { id: tempAiId, role: 'ai', content: '', isNew: true }
      ]);

      const streamFn = USE_OPENROUTER ? streamOpenRouterResponse : streamGeminiResponse;

      const limitedMessages = currentMessages.slice(-6);

      const fullReply = await streamFn(userText, limitedMessages, attachment, mode, (text) => {
        queryClient.setQueryData(['messages', currentSessionId], (old = []) => {
          return old.map(m => m.id === tempAiId ? { ...m, content: text } : m);
        });
      });

      // 4. AI xabarini bazaga saqlash
      await supabase.from('messages').insert([{ 
        user_id: userId, 
        session_id: currentSessionId, 
        role: 'ai', 
        content: fullReply 
      }]);

      return { userText, replyText: fullReply, sessionId: currentSessionId };
    },
    onMutate: async ({ userText }) => {
      if (!activeSessionId) return; // Agar hali sessiya yo'q bo'lsa optimistik qilish shartmas
      await queryClient.cancelQueries({ queryKey: ['messages', activeSessionId] });
      const previousMessages = queryClient.getQueryData(['messages', activeSessionId]);

      queryClient.setQueryData(['messages', activeSessionId], (old = []) => [
        ...old,
        { id: `temp-u-${Date.now()}`, role: 'user', content: userText }
      ]);

      return { previousMessages };
    },
    onError: (err, variables, context) => {
      if (context?.previousMessages && activeSessionId) {
        queryClient.setQueryData(['messages', activeSessionId], context.previousMessages);
      }
    },
    onSettled: (data) => {
      const sId = data?.sessionId || activeSessionId;
      setTimeout(() => {
        if (sId) queryClient.invalidateQueries({ queryKey: ['messages', sId] });
      }, 500);
    },
  });

  return {
    messages: activeMessages,
    chatSessions: sessionsQuery.data || [],
    activeSessionId,
    changeSession,
    isLoading: messagesQuery.isLoading || sessionsQuery.isLoading,
    isSending: sendMessageMutation.isPending,
    setMessages: (newMsgs) => queryClient.setQueryData(['messages', activeSessionId], (old = []) => [...old, ...newMsgs]),
    sendMessage: sendMessageMutation.mutate,
    clearChat: () => changeSession(null),
  };
};

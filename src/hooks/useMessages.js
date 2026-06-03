import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { streamGeminiResponse } from './../lib/gemini.js';
import { streamOpenRouterResponse } from '../api/openrouter';
import { recordMessageEvaluation } from '../api/tutor';

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
    mutationFn: async ({ userText, currentMessages, attachment, mode = 'TUTOR', hidden = false, visibleText }) => {
      if (!userId) return;

      let currentSessionId = activeSessionId;

      // 1. Agar joriy sessiya bo'lmasa, yangi 'tutor_sessions' yaratamiz
      if (!currentSessionId) {
        const title = hidden ? 'Masterclass Plan' : (visibleText ?? userText).substring(0, 30) + '...';
        const { data: newSession, error: sessionErr } = await supabase
          .from('tutor_sessions')
          .insert([{ user_id: userId, title }])
          .select()
          .single();
        if (sessionErr) throw sessionErr;
        
        currentSessionId = newSession.id;
        changeSession(currentSessionId);
        queryClient.invalidateQueries({ queryKey: ['tutor_sessions', userId] });
      }

      let dbContent = visibleText ?? userText;
      if (attachment) {
        const fileName = attachment.name || `image_${Date.now()}.png`;
        dbContent += `\n\n[Ilova: ${fileName}]`;
      }

      let userMsg = null;
      if (!hidden) {
        const { data: userData, error: userErr } = await supabase
          .from('messages')
          .insert([{ user_id: userId, session_id: currentSessionId, role: 'user', content: dbContent }])
          .select()
          .single();
        if (userErr) throw userErr;
        userMsg = userData;

        queryClient.setQueryData(['messages', currentSessionId], (old = []) => [
          ...old.filter(m => !m.id?.toString().startsWith('temp-')), 
          { id: userMsg.id, role: 'user', content: dbContent },
        ]);
      }

      // 3. AI streamni tayyorlash
      const tempAiId = `a-temp-${Date.now()}`;
      queryClient.setQueryData(['messages', currentSessionId], (old = []) => [
        ...old.filter(m => !m.id?.toString().startsWith('temp-')),
        ...(!hidden && userMsg ? [] : []),
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

      // 5. Agar AI javobi ichida baholovchi JSON bo'lsa, uni ajratib olib Supabase'ga yozamiz
      try {
        const jsonMatch = fullReply.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const grade = parsed.current_message_grade || parsed.current_message_score || parsed.grade || null;
          const note = parsed.ai_response || parsed.feedback || null;
          const topics = parsed.topic_status ? [parsed.topic_status] : (parsed.topics || []);
          if (grade !== null && grade !== undefined) {
            // record evaluation in daily_reports
            await recordMessageEvaluation({ userId, messageGrade: Number(grade), topics, note: note || '' });
            // invalidate related queries so UI widgets update
            queryClient.invalidateQueries({ queryKey: ['daily_reports', userId] });
            queryClient.invalidateQueries({ queryKey: ['messages', currentSessionId] });
          }
        }
      } catch (e) {
        // ignore parse errors
      }

      return { userText, replyText: fullReply, sessionId: currentSessionId };
    },
    onMutate: async ({ userText, hidden, visibleText }) => {
      if (!activeSessionId || hidden) return; // Agar hali sessiya yo'q bo'lsa optimistik qilish shartmas
      await queryClient.cancelQueries({ queryKey: ['messages', activeSessionId] });
      const previousMessages = queryClient.getQueryData(['messages', activeSessionId]);

      queryClient.setQueryData(['messages', activeSessionId], (old = []) => [
        ...old,
        { id: `temp-u-${Date.now()}`, role: 'user', content: visibleText ?? userText }
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

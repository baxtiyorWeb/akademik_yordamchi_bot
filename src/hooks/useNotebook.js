import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';

export const useNotebook = (session) => {
  const queryClient = useQueryClient();
  const userId = session?.user?.id;

  const notebookQuery = useQuery({
    queryKey: ['notebook', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('notebook_entries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const saveToNotebookMutation = useMutation({
    mutationFn: async (content) => {
      const title = content.replace(/[#*`]/g, '').substring(0, 40).trim() + '…';
      const { data, error } = await supabase
        .from('notebook_entries')
        .insert([{ user_id: userId, title, content }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (newEntry) => {
      queryClient.setQueryData(['notebook', userId], (old = []) => [newEntry, ...old]);
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('notebook_entries').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(['notebook', userId], (old = []) => 
        old.filter(entry => entry.id !== deletedId)
      );
    },
  });

  return {
    entries: notebookQuery.data || [],
    isLoading: notebookQuery.isLoading,
    saveEntry: saveToNotebookMutation.mutate,
    deleteEntry: deleteEntryMutation.mutate,
  };
};

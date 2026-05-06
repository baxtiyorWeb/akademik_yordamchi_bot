import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';

export const useProfile = (session) => {
  const queryClient = useQueryClient();
  const userId = session?.user?.id;

  // Profil ma'lumotlarini olish (kreditlar bilan)
  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Kreditlarni yangilash (kamaytirish)
  const updateCreditsMutation = useMutation({
    mutationFn: async (newCredits) => {
      const { error } = await supabase
        .from('profiles')
        .update({ credits: newCredits })
        .eq('id', userId);
      
      if (error) throw error;
      return newCredits;
    },
    onSuccess: (newCredits) => {
      queryClient.setQueryData(['profile', userId], (old) => ({
        ...old,
        credits: newCredits,
      }));
    },
  });

  // Kreditni RPC orqali kamaytirish (xavfsizroq)
  const decrementCreditsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('decrement_credits', { user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });

  return {
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading,
    error: profileQuery.error,
    updateCredits: updateCreditsMutation.mutate,
    decrementCredits: decrementCreditsMutation.mutateAsync, // Async version to wait for result
  };
};

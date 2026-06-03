import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '../supabase';

export const useProfile = (session) => {
  const queryClient = useQueryClient();
  const userId = session?.user?.id;
  const userMetadata = session?.user?.user_metadata || {};

  // Profil ma'lumotlarini olish (kreditlar bilan)
  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('credits, plan, plan_expires_at')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Profil va Metadata-ni birlashtirish
  const profile = useMemo(() => {
    if (!profileQuery.data) return null;
    return {
      ...profileQuery.data,
      country: userMetadata.country || null,
      learning_language: userMetadata.learning_language || null,
      onboarding_completed: userMetadata.onboarding_completed || false,
      personal_goals: userMetadata.personal_goals || null,
    };
  }, [profileQuery.data, userMetadata]);

  // Metadata-ni yangilash
  const updateMetadataMutation = useMutation({
    mutationFn: async (newMetadata) => {
      const { data, error } = await supabase.auth.updateUser({
        data: newMetadata,
      });
      if (error) throw error;
      
      // Sessiyani yangilab qo'yamiz, toza ma'lumotlar bilan ishlash uchun
      await supabase.auth.refreshSession();
      return data.user.user_metadata;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    },
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
      const { error } = await supabase.rpc('decrement_credits', { user_id: userId, amount: 1 });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });

  return {
    profile,
    isLoading: profileQuery.isLoading,
    error: profileQuery.error,
    updateCredits: updateCreditsMutation.mutate,
    decrementCredits: decrementCreditsMutation.mutateAsync, // Async version to wait for result
    updateMetadata: updateMetadataMutation.mutateAsync,
    isUpdatingMetadata: updateMetadataMutation.isPending,
  };
};


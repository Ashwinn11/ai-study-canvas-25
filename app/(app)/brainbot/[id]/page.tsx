'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import BrainBotPlayer from '@/components/brainbot/BrainBotPlayer';
import { getSupabaseClient } from '@/lib/supabase/client';

export default function BrainBotPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [material, setMaterial] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const materialId = params.id as string;

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    loadMaterial();
  }, [user, materialId]);

  const loadMaterial = async () => {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('seeds')
        .select('id, title, feynman_explanation')
        .eq('id', materialId)
        .single();

      if (error) throw error;

      setMaterial(data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading material:', error);
      router.back();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!material) {
    return null;
  }

  return (
    <BrainBotPlayer
      materialId={material.id}
      content={material.feynman_explanation || ''}
      title={material.title}
    />
  );
}

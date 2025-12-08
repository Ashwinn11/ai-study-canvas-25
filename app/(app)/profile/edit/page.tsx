
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { profileUpdateService } from '@/lib/api/profileUpdateService';
import { onboardingStorageService, type OnboardingData } from '@/lib/api/onboardingStorageService';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';

const DAILY_GOALS = [
  { value: 10, label: '10 cards daily (5-10 min)' },
  { value: 20, label: '20 cards daily (10-15 min)' },
  { value: 30, label: '30 cards daily (20-25 min)' },
  { value: 45, label: '45+ cards daily (30+ min)' },
];

const CURRENT_GRADES = [
  { value: 'A', label: 'A+ or A' },
  { value: 'B', label: 'B+ or B' },
  { value: 'C', label: 'C+ or C' },
  { value: 'D', label: 'D or below' },
];

interface ProfileFormData {
  fullName: string;
  dailyCardsGoal: number;
  currentGrade: string;
}

export default function EditProfilePage() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = getSupabaseClient();

  const [formData, setFormData] = useState<ProfileFormData>({
    fullName: '',
    dailyCardsGoal: 20,
    currentGrade: '',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadProfileData = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, daily_cards_goal, current_grade')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading profile:', error);
        setIsLoading(false);
        return;
      }

      if (data) {
        const dataRecord = data as Record<string, unknown>;
        setFormData({
          fullName: (dataRecord.full_name as string) || '',
          dailyCardsGoal: (dataRecord.daily_cards_goal as number) || 20,
          currentGrade: (dataRecord.current_grade as string) || '',
        });
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error loading profile data:', error);
      setIsLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    if (user) {
      loadProfileData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Name is required';
    } else if (formData.fullName.length > 100) {
      newErrors.fullName = 'Name must be 100 characters or less';
    }

    if (!formData.dailyCardsGoal) {
      newErrors.dailyCardsGoal = 'Daily goal is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!user || !validateForm()) return;

    setIsSaving(true);
    try {
      // Update profile with onboarding fields
      const { error: profileError } = await profileUpdateService.updateProfile(user.id, {
        full_name: formData.fullName.trim(),
        daily_cards_goal: formData.dailyCardsGoal,
        current_grade: formData.currentGrade || null,
      });

      if (profileError) {
        setErrors({ submit: profileError });
        return;
      }

      // Also update onboarding storage for consistency
      const onboardingData: OnboardingData = {
        completed: true,
        currentGrade: formData.currentGrade,
        dailyCardsGoal: formData.dailyCardsGoal,
      };

      await onboardingStorageService.saveOnboardingData(user.id, onboardingData);

      router.push('/profile');
    } catch (error) {
      console.error('Error saving profile:', error);
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to save profile',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center gap-4 pt-6 mb-8">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-white/10 rounded-lg transition-all"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold">Edit Profile</h1>
      </div>

      {/* Form */}
      <div className="space-y-6">
        {errors.submit && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-4">
            <p className="text-red-400 text-sm">{errors.submit}</p>
          </div>
        )}

        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Full Name
          </label>
          <input
            type="text"
            value={formData.fullName}
            onChange={(e) => {
              setFormData({ ...formData, fullName: e.target.value });
              if (errors.fullName) setErrors({ ...errors, fullName: '' });
            }}
            placeholder="Enter your full name"
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
            disabled={isSaving}
          />
          {errors.fullName && (
            <p className="text-red-400 text-sm mt-1">{errors.fullName}</p>
          )}
        </div>

        {/* Daily Cards Goal */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Daily Cards Goal
          </label>
          <select
            value={formData.dailyCardsGoal}
            onChange={(e) => {
              setFormData({ ...formData, dailyCardsGoal: Number(e.target.value) });
              if (errors.dailyCardsGoal) setErrors({ ...errors, dailyCardsGoal: '' });
            }}
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
            disabled={isSaving}
          >
            <option value="">Select daily goal</option>
            {DAILY_GOALS.map((goal) => (
              <option key={goal.value} value={goal.value}>
                {goal.label}
              </option>
            ))}
          </select>
          {errors.dailyCardsGoal && (
            <p className="text-red-400 text-sm mt-1">{errors.dailyCardsGoal}</p>
          )}
        </div>

        {/* Current Grade */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Current Grade
          </label>
          <select
            value={formData.currentGrade}
            onChange={(e) => setFormData({ ...formData, currentGrade: e.target.value })}
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
            disabled={isSaving}
          >
            <option value="">Select current grade</option>
            {CURRENT_GRADES.map((grade) => (
              <option key={grade.value} value={grade.value}>
                {grade.label}
              </option>
            ))}
          </select>
        </div>

        {/* Save Button */}
        <div className="flex gap-3 pt-6">
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="flex-1"
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 gap-2"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

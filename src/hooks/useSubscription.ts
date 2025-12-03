import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/api/supabaseWithTimeout';
import { logger } from '@/utils/logger';

export interface Subscription {
    id: string;
    status: 'active' | 'canceled' | 'past_due' | 'trialing';
    planId: string;
    currentPeriodEnd: string;
    isActive: boolean;
}

export const useSubscription = () => {
    const { user } = useAuth();
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSubscription = async () => {
            if (!user) {
                setSubscription(null);
                setIsLoading(false);
                return;
            }

            try {
                // Fetch subscription from Supabase
                // This assumes a 'subscriptions' table exists. Adjust as needed.
                const { data, error } = await supabase
                    .from('subscriptions')
                    .select('*')
                    .eq('user_id', user.id)
                    .in('status', ['active', 'trialing'])
                    .maybeSingle();

                if (error) {
                    logger.error('Error fetching subscription:', error);
                }

                if (data) {
                    setSubscription({
                        id: data.id,
                        status: data.status,
                        planId: data.price_id, // Assuming price_id maps to plan
                        currentPeriodEnd: data.current_period_end,
                        isActive: true,
                    });
                } else {
                    setSubscription(null);
                }
            } catch (error) {
                logger.error('Error in useSubscription:', error);
                setSubscription(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSubscription();
    }, [user]);

    // Helper to check if user has active subscription
    const hasActiveSubscription = !!subscription?.isActive;

    return {
        subscription,
        isLoading,
        hasActiveSubscription,
    };
};

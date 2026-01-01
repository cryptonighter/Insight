import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { UserContext, UserEconomy, Resolution, DailyEntry, ViewState } from '../types';

export const useResolutionEngine = (user: UserContext, setView: (view: ViewState) => void) => {
    const [userEconomy, setUserEconomy] = useState<UserEconomy>({ userId: 'mock', balance: 5 });
    const [activeResolution, setActiveResolution] = useState<Resolution | null>(null);
    const [todaysEntry, setTodaysEntry] = useState<DailyEntry | null>(null);

    const syncResolutionData = useCallback(async (userId: string) => {
        try {
            // 1. Fetch Economy
            const { data: eco } = await supabase.from('user_economy').select('*').eq('user_id', userId).single();
            if (eco) setUserEconomy({ userId, balance: eco.balance, lastDailyGrant: eco.last_daily_grant });

            // 2. Fetch Active Resolution
            const { data: res } = await supabase.from('resolutions').select('*').eq('user_id', userId).eq('status', 'active').single();
            if (res) {
                setActiveResolution({
                    id: res.id,
                    statement: res.statement,
                    rootMotivation: res.root_motivation,
                    status: 'active',
                    createdAt: res.created_at
                });

                // 3. Fetch Today's Entry
                const today = new Date().toISOString().split('T')[0];
                const { data: entry } = await supabase.from('daily_entries')
                    .select('*')
                    .eq('resolution_id', res.id)
                    .eq('date', today)
                    .maybeSingle();

                if (entry) {
                    setTodaysEntry({
                        id: entry.id,
                        resolutionId: res.id,
                        date: entry.date,
                        eveningCompleted: entry.evening_completed,
                        morningGenerated: entry.morning_generated
                    });
                }
            }
        } catch (e) {
            console.error("Sync failed", e);
        }
    }, []);

    useEffect(() => {
        if (user.supabaseId) {
            syncResolutionData(user.supabaseId);
        }
    }, [user.supabaseId, syncResolutionData]);

    const createNewResolution = async (statement: string, motivation: string) => {
        if (!user.supabaseId) return;

        // 1. Archive old ones
        await supabase.from('resolutions').update({ status: 'archived' }).eq('user_id', user.supabaseId);

        // 2. Create new Resolution
        const { data, error } = await supabase.from('resolutions').insert({
            user_id: user.supabaseId,
            statement,
            root_motivation: motivation,
            status: 'active'
        }).select().single();

        // 3. Initialize Economy
        await supabase.from('user_economy').upsert({
            user_id: user.supabaseId,
            balance: 5,
            last_daily_grant: new Date().toISOString()
        }, { onConflict: 'user_id' });

        if (data && !error) {
            setActiveResolution({
                id: data.id,
                statement: data.statement,
                rootMotivation: data.root_motivation,
                status: 'active',
                createdAt: data.created_at
            });
            setUserEconomy(prev => ({ ...prev, balance: 5 }));
            setView(ViewState.DASHBOARD);
        }
    };

    const debitToken = async () => {
        if (userEconomy.balance < 1) {
            alert("Insufficient tokens. Complete an evening reflection to earn more.");
            return false;
        }

        if (user.supabaseId) {
            await supabase.from('user_economy').update({ balance: userEconomy.balance - 1 }).eq('user_id', user.supabaseId);
            setUserEconomy(prev => ({ ...prev, balance: prev.balance - 1 }));
            return true;
        }
        return false;
    };

    const grantToken = async () => {
        if (user.supabaseId) {
            const { error: ecoError } = await supabase.from('user_economy').update({
                balance: userEconomy.balance + 1,
                last_daily_grant: new Date().toISOString()
            }).eq('user_id', user.supabaseId);

            if (!ecoError) {
                setUserEconomy(prev => ({ ...prev, balance: prev.balance + 1 }));
            }
        }
    };

    const updateDailyEntry = async (summary: string, transcript?: string) => {
        if (!user.supabaseId || !activeResolution) return;

        const today = new Date().toISOString().split('T')[0];
        if (todaysEntry) {
            await supabase.from('daily_entries').update({
                evening_completed: true,
                reflection_summary: summary,
                transcript: transcript
            }).eq('id', todaysEntry.id);
            setTodaysEntry(prev => prev ? ({ ...prev, eveningCompleted: true }) : null);
        } else {
            const { data: newEntry } = await supabase.from('daily_entries').insert({
                user_id: user.supabaseId,
                resolution_id: activeResolution.id,
                date: today,
                evening_completed: true,
                reflection_summary: summary,
                transcript: transcript
            }).select().single();

            if (newEntry) {
                setTodaysEntry({
                    id: newEntry.id,
                    resolutionId: activeResolution.id,
                    date: newEntry.date,
                    eveningCompleted: true,
                    morningGenerated: false
                });
            }
        }
    };

    return {
        userEconomy,
        activeResolution,
        todaysEntry,
        createNewResolution,
        debitToken,
        grantToken,
        updateDailyEntry,
        syncResolutionData
    };
};

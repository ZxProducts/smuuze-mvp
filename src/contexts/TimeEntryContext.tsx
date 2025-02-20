'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useToast } from '@chakra-ui/react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { TimeEntry, TimeEntryInsert } from '@/types/database.types';

export interface ActiveTimeEntry extends TimeEntry {
  task?: {
    title: string;
  } | null;
}

interface TimeEntryContextType {
  activeEntry: ActiveTimeEntry | null;
  startTimer: (projectId: string, taskId: string | null) => Promise<void>;
  stopTimer: () => Promise<void>;
  isLoading: boolean;
}

const TimeEntryContext = createContext<TimeEntryContextType | undefined>(undefined);

export const TimeEntryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeEntry, setActiveEntry] = useState<ActiveTimeEntry | null>(null);
  const { user } = useAuth();
  const toast = useToast();

  const fetchActiveEntry = async () => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*, task:task_id (title)')
        .eq('user_id', user.id)
        .is('end_time', null)
        .maybeSingle();

      if (error) throw error;
      setActiveEntry(data);
      return data;
    } catch (error) {
      console.error('Error fetching active entry:', error);
      return null;
    }
  };

  useEffect(() => {
    if (user) {
      fetchActiveEntry();
    }
  }, [user]);

  const startTimer = async (projectId: string, taskId: string | null = null) => {
    if (!user) return;

    setIsLoading(true);
    try {
      if (activeEntry) {
        toast({
          title: '既に作業時間の記録が開始されています',
          description: '新しい作業を開始する前に、現在の作業を終了してください',
          status: 'warning',
          duration: 5000,
        });
        return;
      }

      const newEntry: TimeEntryInsert = {
        user_id: user.id,
        project_id: projectId,
        start_time: new Date().toISOString(),
        task_id: taskId,
      };

      const { data, error } = await supabase
        .from('time_entries')
        .insert([newEntry])
        .select('*, task:task_id (title)')
        .single();

      if (error) throw error;

      setActiveEntry(data);
      toast({
        title: '作業時間の記録を開始しました',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error starting timer:', error);
      toast({
        title: '作業時間の記録開始に失敗しました',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const stopTimer = async () => {
    if (!user || !activeEntry) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('time_entries')
        .update({
          end_time: new Date().toISOString(),
        })
        .eq('id', activeEntry.id);

      if (error) throw error;

      setActiveEntry(null);
      toast({
        title: '作業時間の記録を終了しました',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error stopping timer:', error);
      toast({
        title: '作業時間の記録終了に失敗しました',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TimeEntryContext.Provider value={{ activeEntry, startTimer, stopTimer, isLoading }}>
      {children}
    </TimeEntryContext.Provider>
  );
}

export function useTimeEntry() {
  const context = useContext(TimeEntryContext);
  if (context === undefined) {
    throw new Error('useTimeEntryはTimeEntryProvider内で使用する必要があります');
  }
  return context;
}
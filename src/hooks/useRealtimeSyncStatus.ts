import { useState, useEffect, useCallback } from 'react';
import { supabase, isStaticBuild } from '../lib/supabase';

export function useRealtimeSyncStatus(intervalMs = 30000) {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkConnection = useCallback(async () => {
    setIsChecking(true);
    try {
      if (isStaticBuild || !supabase) {
        setIsOnline(false);
        return;
      }
      
      const checkPromise = supabase.from('usuarios').select('id').limit(1);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 4000)
      );
      
      await Promise.race([checkPromise, timeoutPromise]);
      setIsOnline(true);
    } catch (error) {
      setIsOnline(false);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, intervalMs);
    return () => clearInterval(interval);
  }, [checkConnection, intervalMs]);

  return { isOnline, isChecking, checkConnection };
}

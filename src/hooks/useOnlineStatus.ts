import { useState, useEffect, useCallback } from 'react';
import { SupabaseService } from '../lib/supabaseService';

export interface OnlineStatusDetails {
  isOnline: boolean;
  latencyMs: number | null;
  isChecking: boolean;
  recheck: () => Promise<void>;
}

export function useOnlineStatus(): OnlineStatusDetails {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const checkConnectivity = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
      setLatencyMs(null);
      return;
    }

    setIsChecking(true);
    const start = Date.now();
    try {
      const ok = await SupabaseService.checkConnection();
      const duration = Date.now() - start;
      setIsOnline(Boolean(ok));
      setLatencyMs(ok ? duration : null);
    } catch {
      setIsOnline(false);
      setLatencyMs(null);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => checkConnectivity();
    const handleOffline = () => {
      setIsOnline(false);
      setLatencyMs(null);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    checkConnectivity();

    const interval = setInterval(checkConnectivity, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [checkConnectivity]);

  return { isOnline, latencyMs, isChecking, recheck: checkConnectivity };
}


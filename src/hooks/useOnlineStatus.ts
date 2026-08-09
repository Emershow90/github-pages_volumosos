import { useState, useEffect } from 'react';
import { SupabaseService } from '../lib/supabaseService';

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => checkConnectivity();
    const handleOffline = () => setIsOnline(false);

    async function checkConnectivity() {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setIsOnline(false);
        return;
      }
      try {
        const ok = await SupabaseService.checkConnection();
        setIsOnline(Boolean(ok));
      } catch {
        setIsOnline(false);
      }
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    checkConnectivity();

    const interval = setInterval(checkConnectivity, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return isOnline;
}

import { SupabaseService } from '../lib/supabaseService';

export const clearQueue = () => {
  localStorage.removeItem('radar_offline_queue');
  console.log('Fila limpa!');
};

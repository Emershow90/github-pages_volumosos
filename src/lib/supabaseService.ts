import { supabase } from './supabase';

export class SupabaseService {
  static async upsertRecord(table: string, record: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from(table)
        .upsert(record, { onConflict: 'id' })
        .select();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error upserting to ${table}:`, error);
      throw error;
    }
  }

  static async deleteRecord(table: string, id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error(`Error deleting from ${table}:`, error);
      throw error;
    }
  }
}

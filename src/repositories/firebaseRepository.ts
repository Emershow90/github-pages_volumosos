import { FirebaseService } from '../lib/firebaseService';

export class FirebaseRepository {
  public static async getTable<T>(tableName: string, defaultData: T[] = []): Promise<T[]> {
    return await FirebaseService.fetchTable<T>(tableName, defaultData);
  }

  public static async saveRecord<T extends { updated_at?: string; id?: any; lista?: string; key?: string; chave?: string }>(
    tableName: string,
    record: T,
    keyField: keyof T = 'id' as keyof T
  ): Promise<T> {
    return await FirebaseService.upsertRecord<T>(tableName, record, keyField);
  }

  public static async removeRecord(tableName: string, keyVal: any, keyField: string = 'id'): Promise<void> {
    await FirebaseService.deleteRecord(tableName, keyVal, keyField);
  }

  public static listenToChanges(tableName: string, callback: (payload: any) => void): () => void {
    return FirebaseService.subscribe(tableName, callback);
  }
}

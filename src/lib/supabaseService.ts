import { supabase } from './supabase';
import { PostgrestError } from '@supabase/supabase-js';

// ============================================
// TIPOS
// ============================================
export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: PostgrestError | string;
  message?: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

// ============================================
// SERVIÇO PRINCIPAL
// ============================================
export class SupabaseService {
  
  /**
   * Busca todos os registros de uma tabela
   */
  static async getAll<T>(
    table: string,
    options?: {
      select?: string;
      orderBy?: { column: string; ascending?: boolean };
      filters?: Record<string, any>;
    }
  ): Promise<ServiceResult<T[]>> {
    try {
      let query = supabase.from(table).select(options?.select || '*');
      
      // Aplica filtros
      if (options?.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }
      
      // Aplica ordenação
      if (options?.orderBy) {
        query = query.order(options.orderBy.column, {
          ascending: options.orderBy.ascending ?? true
        });
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return {
        success: true,
        data: data as T[],
      };
    } catch (error) {
      console.error(`[SupabaseService] Erro ao buscar ${table}:`, error);
      return {
        success: false,
        error: error as PostgrestError,
        message: `Erro ao buscar dados de ${table}`,
      };
    }
  }

  /**
   * Busca um registro por ID
   */
  static async getById<T>(
    table: string,
    id: string | number,
    select?: string
  ): Promise<ServiceResult<T>> {
    try {
      const { data, error } = await supabase
        .from(table)
        .select(select || '*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      return {
        success: true,
        data: data as T,
      };
    } catch (error) {
      console.error(`[SupabaseService] Erro ao buscar ${table} por ID:`, error);
      return {
        success: false,
        error: error as PostgrestError,
        message: `Registro não encontrado em ${table}`,
      };
    }
  }

  /**
   * Busca registros com filtro personalizado
   */
  static async query<T>(
    table: string,
    filters: Record<string, any>,
    options?: {
      select?: string;
      orderBy?: { column: string; ascending?: boolean };
      limit?: number;
    }
  ): Promise<ServiceResult<T[]>> {
    try {
      let query = supabase.from(table).select(options?.select || '*');
      
      // Aplica filtros
      Object.entries(filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else if (typeof value === 'string' && value.includes('%')) {
          query = query.ilike(key, value);
        } else {
          query = query.eq(key, value);
        }
      });
      
      // Aplica ordenação
      if (options?.orderBy) {
        query = query.order(options.orderBy.column, {
          ascending: options.orderBy.ascending ?? true
        });
      }
      
      // Aplica limite
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return {
        success: true,
        data: data as T[],
      };
    } catch (error) {
      console.error(`[SupabaseService] Erro na query ${table}:`, error);
      return {
        success: false,
        error: error as PostgrestError,
        message: `Erro na consulta em ${table}`,
      };
    }
  }

  /**
   * Insere um novo registro
   */
  static async insert<T>(
    table: string,
    record: T
  ): Promise<ServiceResult<T>> {
    try {
      const { data, error } = await supabase
        .from(table)
        .insert([record])
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        success: true,
        data: data as T,
        message: 'Registro criado com sucesso!',
      };
    } catch (error) {
      console.error(`[SupabaseService] Erro ao inserir em ${table}:`, error);
      return {
        success: false,
        error: error as PostgrestError,
        message: `Erro ao criar registro em ${table}`,
      };
    }
  }

  /**
   * Insere múltiplos registros
   */
  static async insertMany<T>(
    table: string,
    records: T[]
  ): Promise<ServiceResult<T[]>> {
    try {
      const { data, error } = await supabase
        .from(table)
        .insert(records)
        .select();
      
      if (error) throw error;
      
      return {
        success: true,
        data: data as T[],
        message: `${records.length} registros criados com sucesso!`,
      };
    } catch (error) {
      console.error(`[SupabaseService] Erro ao inserir múltiplos em ${table}:`, error);
      return {
        success: false,
        error: error as PostgrestError,
        message: `Erro ao criar registros em ${table}`,
      };
    }
  }

  /**
   * Atualiza um registro (UPSERT)
   */
  static async upsert<T>(
    table: string,
    record: T & { id: string | number }
  ): Promise<ServiceResult<T>> {
    try {
      const { data, error } = await supabase
        .from(table)
        .upsert(record, { onConflict: 'id' })
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        success: true,
        data: data as T,
        message: 'Registro atualizado com sucesso!',
      };
    } catch (error) {
      console.error(`[SupabaseService] Erro ao upsert em ${table}:`, error);
      return {
        success: false,
        error: error as PostgrestError,
        message: `Erro ao atualizar registro em ${table}`,
      };
    }
  }

  /**
   * Atualiza um registro existente
   */
  static async update<T>(
    table: string,
    id: string | number,
    updates: Partial<T>
  ): Promise<ServiceResult<T>> {
    try {
      const { data, error } = await supabase
        .from(table)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        success: true,
        data: data as T,
        message: 'Registro atualizado com sucesso!',
      };
    } catch (error) {
      console.error(`[SupabaseService] Erro ao atualizar ${table}:`, error);
      return {
        success: false,
        error: error as PostgrestError,
        message: `Erro ao atualizar registro em ${table}`,
      };
    }
  }

  /**
   * Deleta um registro
   */
  static async delete(
    table: string,
    id: string | number
  ): Promise<ServiceResult> {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      return {
        success: true,
        message: 'Registro removido com sucesso!',
      };
    } catch (error) {
      console.error(`[SupabaseService] Erro ao deletar de ${table}:`, error);
      return {
        success: false,
        error: error as PostgrestError,
        message: `Erro ao remover registro de ${table}`,
      };
    }
  }

  /**
   * Deleta múltiplos registros
   */
  static async deleteMany(
    table: string,
    ids: (string | number)[]
  ): Promise<ServiceResult> {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .in('id', ids);
      
      if (error) throw error;
      
      return {
        success: true,
        message: `${ids.length} registros removidos com sucesso!`,
      };
    } catch (error) {
      console.error(`[SupabaseService] Erro ao deletar múltiplos de ${table}:`, error);
      return {
        success: false,
        error: error as PostgrestError,
        message: `Erro ao remover registros de ${table}`,
      };
    }
  }

  /**
   * Conta registros em uma tabela
   */
  static async count(
    table: string,
    filters?: Record<string, any>
  ): Promise<ServiceResult<number>> {
    try {
      let query = supabase.from(table).select('*', { count: 'exact', head: true });
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }
      
      const { count, error } = await query;
      
      if (error) throw error;
      
      return {
        success: true,
        data: count || 0,
      };
    } catch (error) {
      console.error(`[SupabaseService] Erro ao contar ${table}:`, error);
      return {
        success: false,
        error: error as PostgrestError,
        message: `Erro ao contar registros em ${table}`,
      };
    }
  }

  /**
   * Executa uma query SQL personalizada (apenas com RPC)
   */
  static async rpc<T>(
    functionName: string,
    params?: Record<string, any>
  ): Promise<ServiceResult<T>> {
    try {
      const { data, error } = await supabase.rpc(functionName, params);
      
      if (error) throw error;
      
      return {
        success: true,
        data: data as T,
      };
    } catch (error) {
      console.error(`[SupabaseService] Erro no RPC ${functionName}:`, error);
      return {
        success: false,
        error: error as PostgrestError,
        message: `Erro ao executar função ${functionName}`,
      };
    }
  }

  /**
   * Escuta mudanças em tempo real em uma tabela
   */
  static subscribe(
    table: string,
    callback: (payload: any) => void,
    filter?: { event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'; filter?: string }
  ) {
    const event = filter?.event || '*';
    const filterStr = filter?.filter || '';
    
    const channel = supabase
      .channel(`table-changes-${table}`)
      .on(
        'postgres_changes',
        {
          event: event,
          schema: 'public',
          table: table,
          filter: filterStr || undefined,
        },
        callback
      )
      .subscribe();
    
    return channel;
  }

  /**
   * Remove inscrição em tempo real
   */
  static unsubscribe(channel: any) {
    if (channel) {
      supabase.removeChannel(channel);
    }
  }
}

// ============================================
// EXPORT PARA BACKWARD COMPATIBILITY
// ============================================
export default SupabaseService;

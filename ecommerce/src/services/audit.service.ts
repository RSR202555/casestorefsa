/**
 * Serviço de auditoria.
 * Registra todas as ações de admin: criação/edição de produtos,
 * mudanças de status de pedido, ajustes de estoque etc.
 * Usa service client para garantir que os logs sejam gravados
 * independentemente das políticas RLS do usuário.
 */

import { createServiceClient } from '@/lib/supabase/server';

export interface AuditPayload {
  user_id?: string | null;
  action: string;          // Ex: 'product.created', 'order.status_changed'
  entity_type: string;     // Ex: 'product', 'order', 'inventory'
  entity_id?: string | null;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

export const AuditService = {
  /**
   * Registra uma entrada de auditoria.
   * Falha silenciosa — um erro de log não deve interromper a operação principal.
   */
  async log(payload: AuditPayload): Promise<void> {
    try {
      const supabase = createServiceClient();
      const { error } = await supabase.from('audit_logs').insert({
        user_id: payload.user_id ?? null,
        action: payload.action,
        entity_type: payload.entity_type,
        entity_id: payload.entity_id ?? null,
        old_data: payload.old_data ?? null,
        new_data: payload.new_data ?? null,
        ip_address: payload.ip_address ?? null,
        user_agent: payload.user_agent ?? null,
      });

      if (error) {
        console.error('[AuditService] Falha ao registrar log:', error.message);
      }
    } catch (err) {
      // Nunca lançar — auditoria não deve quebrar fluxos de negócio
      console.error('[AuditService] Exceção ao registrar log:', err);
    }
  },

  /**
   * Registra ação de criação.
   */
  async logCreate(
    entityType: string,
    entityId: string,
    newData: Record<string, unknown>,
    meta: { userId?: string; ip?: string; userAgent?: string }
  ): Promise<void> {
    await AuditService.log({
      user_id: meta.userId,
      action: `${entityType}.created`,
      entity_type: entityType,
      entity_id: entityId,
      new_data: newData,
      ip_address: meta.ip,
      user_agent: meta.userAgent,
    });
  },

  /**
   * Registra ação de atualização.
   */
  async logUpdate(
    entityType: string,
    entityId: string,
    oldData: Record<string, unknown>,
    newData: Record<string, unknown>,
    meta: { userId?: string; ip?: string; userAgent?: string }
  ): Promise<void> {
    await AuditService.log({
      user_id: meta.userId,
      action: `${entityType}.updated`,
      entity_type: entityType,
      entity_id: entityId,
      old_data: oldData,
      new_data: newData,
      ip_address: meta.ip,
      user_agent: meta.userAgent,
    });
  },

  /**
   * Registra ação de deleção.
   */
  async logDelete(
    entityType: string,
    entityId: string,
    oldData: Record<string, unknown>,
    meta: { userId?: string; ip?: string; userAgent?: string }
  ): Promise<void> {
    await AuditService.log({
      user_id: meta.userId,
      action: `${entityType}.deleted`,
      entity_type: entityType,
      entity_id: entityId,
      old_data: oldData,
      ip_address: meta.ip,
      user_agent: meta.userAgent,
    });
  },
};

/**
 * Entidades e Motor de Conciliação Idempotente de Webhooks (Asaas PIX & Pluggy Open Finance).
 *
 * Inspirado na arquitetura de 3 travas do ecossistema Exímia Tech (ArenaX):
 * 1. Validação estrita de token de webhook (`asaas-access-token` / `x-pluggy-webhook-secret`).
 * 2. Conferência cruzada (Double-Check) do status real na API oficial antes de liquidar.
 * 3. Trava de Idempotência para garantir que reenvios (`PAYMENT_CONFIRMED` + `PAYMENT_RECEIVED`)
 *    jamais dupliquem lançamentos no extrato ou saldo bancário.
 */

import {
  InstitutionCode,
  TransactionCategory,
  ValidationFailure,
  type Either,
  type Failure,
  hasNumberField,
  hasStringField,
  isPlainRecord,
  left,
  right,
} from '@/core';
import type { TransactionType } from './financial-primitives';

export type AsaasWebhookEventName =
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_CONFIRMED'
  | 'TRANSFER_DONE'
  | 'TRANSFER_FAILED';

export type PluggyWebhookEventName =
  | 'item/created'
  | 'item/updated'
  | 'item/error'
  | 'transactions/created'
  | 'connector/status_updated';

export type WebhookProvider = 'ASAAS_PIX' | 'PLUGGY_OPEN_FINANCE';

export interface WebhookAuditRecord {
  readonly idempotencyKey: string;
  readonly provider: WebhookProvider;
  readonly eventName: string;
  readonly resourceId: string;
  readonly amountCents: number;
  readonly verifiedWithRemoteApi: boolean;
  readonly outcome:
    | 'SETTLED_CREDIT'
    | 'SETTLED_DEBIT'
    | 'BALANCE_UPDATED'
    | 'ALREADY_PROCESSED'
    | 'IGNORED';
  readonly description: string;
  readonly processedAtIso: string;
  readonly suggestedTransaction?: {
    readonly id: string;
    readonly title: string;
    readonly merchantName: string;
    readonly amountCents: number;
    readonly type: TransactionType;
    readonly category: TransactionCategory;
    readonly institution: InstitutionCode;
    readonly dateIso: string;
    readonly reconciled: boolean;
  };
}

const HANDLED_ASAAS_EVENTS = new Set<string>([
  'PAYMENT_RECEIVED',
  'PAYMENT_CONFIRMED',
  'TRANSFER_DONE',
  'TRANSFER_FAILED',
]);

const HANDLED_PLUGGY_EVENTS = new Set<string>([
  'item/created',
  'item/updated',
  'item/error',
  'transactions/created',
  'connector/status_updated',
]);

/**
 * Motor de Conciliação e Idempotência para Webhooks Bancários.
 */
export class WebhookReconciliationEngine {
  private readonly _processedKeys = new Set<string>();
  private readonly _auditLog: WebhookAuditRecord[] = [];

  public getProcessedCount(): number {
    return this._processedKeys.size;
  }

  public getAuditLog(): readonly WebhookAuditRecord[] {
    return [...this._auditLog];
  }

  public hasProcessed(idempotencyKey: string): boolean {
    return this._processedKeys.has(idempotencyKey);
  }

  /**
   * Valida e interpreta um payload bruto do Webhook Asaas PIX.
   */
  public parseAsaasPayload(rawBody: unknown): Either<
    Failure,
    {
      readonly eventName: string;
      readonly resourceId: string;
      readonly rawAmount: number;
      readonly description: string;
      readonly isHandled: boolean;
    }
  > {
    if (!isPlainRecord(rawBody) || !hasStringField(rawBody, 'event')) {
      return left(
        new ValidationFailure(
          'Payload Asaas inválido: campo "event" ausente.',
          'event',
        ),
      );
    }

    const eventName = rawBody.event.trim();
    const isHandled = HANDLED_ASAAS_EVENTS.has(eventName);

    // Extrai payment ou transfer do payload
    const paymentObj = isPlainRecord(rawBody.payment) ? rawBody.payment : null;
    const transferObj = isPlainRecord(rawBody.transfer)
      ? rawBody.transfer
      : null;
    const resource = paymentObj ?? transferObj;

    const resourceId =
      resource && hasStringField(resource, 'id')
        ? resource.id.trim()
        : hasStringField(rawBody, 'id')
          ? rawBody.id.trim()
          : '';

    if (!resourceId) {
      return left(
        new ValidationFailure(
          'Payload Asaas sem identificador de pagamento ou transferência (payment.id / transfer.id).',
          'resourceId',
        ),
      );
    }

    const rawAmount =
      resource && hasNumberField(resource, 'value') && resource.value > 0
        ? resource.value
        : 0;

    const description =
      resource && hasStringField(resource, 'description')
        ? resource.description.trim()
        : eventName.startsWith('PAYMENT_')
          ? `Recebimento PIX Asaas (${resourceId})`
          : `Transferência PIX Asaas (${resourceId})`;

    return right({
      eventName,
      resourceId,
      rawAmount,
      description,
      isHandled,
    });
  }

  /**
   * Liquida um evento Asaas com trava de idempotência (evita que PAYMENT_CONFIRMED e PAYMENT_RECEIVED
   * do mesmo paymentId dupliquem o crédito na conta).
   */
  public settleAsaasEvent(params: {
    readonly eventName: string;
    readonly resourceId: string;
    readonly confirmedValueBrl: number;
    readonly description: string;
    readonly verifiedWithRemoteApi: boolean;
  }): WebhookAuditRecord {
    const isPaymentCredit =
      params.eventName === 'PAYMENT_RECEIVED' ||
      params.eventName === 'PAYMENT_CONFIRMED';

    // Chave de idempotência agrupa PAYMENT_RECEIVED e PAYMENT_CONFIRMED pelo mesmo resourceId,
    // exatamente como no ArenaX (`asaas_payments/{paymentId}` status === 'paid').
    const idempotencyKey = isPaymentCredit
      ? `ASAAS_PIX:PAYMENT_SETTLEMENT:${params.resourceId}`
      : `ASAAS_PIX:${params.eventName}:${params.resourceId}`;

    const amountCents = Math.round(Math.max(0, params.confirmedValueBrl) * 100);
    const nowIso = new Date().toISOString();

    if (!HANDLED_ASAAS_EVENTS.has(params.eventName)) {
      const ignoredRecord: WebhookAuditRecord = {
        idempotencyKey,
        provider: 'ASAAS_PIX',
        eventName: params.eventName,
        resourceId: params.resourceId,
        amountCents,
        verifiedWithRemoteApi: params.verifiedWithRemoteApi,
        outcome: 'IGNORED',
        description: `Evento ${params.eventName} ignorado pela política de conciliação.`,
        processedAtIso: nowIso,
      };
      this._recordAudit(ignoredRecord);
      return ignoredRecord;
    }

    if (this._processedKeys.has(idempotencyKey)) {
      const duplicateRecord: WebhookAuditRecord = {
        idempotencyKey,
        provider: 'ASAAS_PIX',
        eventName: params.eventName,
        resourceId: params.resourceId,
        amountCents,
        verifiedWithRemoteApi: params.verifiedWithRemoteApi,
        outcome: 'ALREADY_PROCESSED',
        description: `Idempotência ativa: recurso ${params.resourceId} já foi liquidado anteriormente.`,
        processedAtIso: nowIso,
      };
      this._recordAudit(duplicateRecord);
      return duplicateRecord;
    }

    this._processedKeys.add(idempotencyKey);

    const outcome = isPaymentCredit
      ? 'SETTLED_CREDIT'
      : params.eventName === 'TRANSFER_DONE'
        ? 'SETTLED_DEBIT'
        : 'IGNORED';

    const record: WebhookAuditRecord = {
      idempotencyKey,
      provider: 'ASAAS_PIX',
      eventName: params.eventName,
      resourceId: params.resourceId,
      amountCents,
      verifiedWithRemoteApi: params.verifiedWithRemoteApi,
      outcome,
      description: params.description,
      processedAtIso: nowIso,
      suggestedTransaction:
        outcome === 'SETTLED_CREDIT' || outcome === 'SETTLED_DEBIT'
          ? {
              id: `tx-wh-asaas-${params.resourceId}`,
              title: params.description,
              merchantName: 'Asaas IP S.A. (Webhook PIX)',
              amountCents,
              type: outcome === 'SETTLED_CREDIT' ? 'INCOME' : 'EXPENSE',
              category: TransactionCategory.PIX,
              institution: InstitutionCode.ASAAS,
              dateIso: nowIso,
              reconciled: true,
            }
          : undefined,
    };

    this._recordAudit(record);
    return record;
  }

  /**
   * Valida e processa um evento push do Open Finance via Pluggy (`item/updated`, `transactions/created`, etc.).
   */
  public settlePluggyEvent(rawBody: unknown, verifiedWithRemoteApi: boolean): Either<
    Failure,
    WebhookAuditRecord
  > {
    if (!isPlainRecord(rawBody) || !hasStringField(rawBody, 'event')) {
      return left(
        new ValidationFailure(
          'Payload Pluggy inválido: campo "event" obrigatório.',
          'event',
        ),
      );
    }

    const eventName = rawBody.event.trim();
    const itemId = hasStringField(rawBody, 'itemId')
      ? rawBody.itemId.trim()
      : hasStringField(rawBody, 'id')
        ? rawBody.id.trim()
        : 'pluggy-item-sync';

    const eventId = hasStringField(rawBody, 'eventId')
      ? rawBody.eventId.trim()
      : `${eventName}:${itemId}`;

    const idempotencyKey = `PLUGGY_OPEN_FINANCE:${eventId}`;
    const nowIso = new Date().toISOString();
    const rawBalance = hasNumberField(rawBody, 'balance') ? rawBody.balance : 0;
    const amountCents = Math.round(Math.max(0, rawBalance) * 100);

    if (!HANDLED_PLUGGY_EVENTS.has(eventName)) {
      const ignored: WebhookAuditRecord = {
        idempotencyKey,
        provider: 'PLUGGY_OPEN_FINANCE',
        eventName,
        resourceId: itemId,
        amountCents,
        verifiedWithRemoteApi,
        outcome: 'IGNORED',
        description: `Evento Open Finance ${eventName} ignorado.`,
        processedAtIso: nowIso,
      };
      this._recordAudit(ignored);
      return right(ignored);
    }

    if (this._processedKeys.has(idempotencyKey)) {
      const duplicate: WebhookAuditRecord = {
        idempotencyKey,
        provider: 'PLUGGY_OPEN_FINANCE',
        eventName,
        resourceId: itemId,
        amountCents,
        verifiedWithRemoteApi,
        outcome: 'ALREADY_PROCESSED',
        description: `Sincronização Open Finance (${itemId}) já processada.`,
        processedAtIso: nowIso,
      };
      this._recordAudit(duplicate);
      return right(duplicate);
    }

    this._processedKeys.add(idempotencyKey);

    const record: WebhookAuditRecord = {
      idempotencyKey,
      provider: 'PLUGGY_OPEN_FINANCE',
      eventName,
      resourceId: itemId,
      amountCents,
      verifiedWithRemoteApi,
      outcome: 'BALANCE_UPDATED',
      description: `Open Finance Pluggy (${eventName}) — Item ${itemId} sincronizado com sucesso.`,
      processedAtIso: nowIso,
    };

    this._recordAudit(record);
    return right(record);
  }

  private _recordAudit(record: WebhookAuditRecord): void {
    this._auditLog.unshift(record);
    if (this._auditLog.length > 50) {
      this._auditLog.pop();
    }
  }
}

export const globalWebhookEngine = new WebhookReconciliationEngine();

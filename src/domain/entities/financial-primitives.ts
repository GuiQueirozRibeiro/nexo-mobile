/**
 * Tipos primitivos, literais, uniões, interseções e tuplas do domínio financeiro.
 *
 * Competências da Rubrica contempladas:
 * - 1.1 Modelagem com tipos primitivos, uniões (|) e tipos literais
 * - 1.4 Combinação de uniões, tipos literais e contratos de domínio
 * - 2.1 Interfaces coerentes com os contratos do módulo
 * - 2.2 Uso de Tuplas (readonly [..]) pertinentes às regras financeiras
 * - 2.4 Articulação de uniões e interseções (&)
 */

import {
  type InstitutionCode,
  type TransactionCategory,
  assertNever,
} from '@/core';

export type CurrencyCode = 'BRL' | 'USD' | 'EUR';

export type TransactionType = 'INCOME' | 'EXPENSE' | 'PIX_TRANSFER';

export type PixKeyType = 'CPF' | 'EMAIL' | 'PHONE' | 'RANDOM';

export type PixOperationStatus = 'PENDING' | 'CONFIRMED' | 'FAILED';

export type OpenFinanceConsentStatus = 'AUTHORIZED' | 'EXPIRED' | 'REVOKED';

export type InsightSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

/**
 * TUPLA 1: Coordenadas bancárias padronizadas no formato [codigoCompe, agencia, contaComDigito].
 * Exemplo: ['260', '0001', '94820-7']
 */
export type BankCoordinatesTuple = readonly [
  bankCode: string,
  branchNumber: string,
  accountWithDigit: string,
];

/**
 * TUPLA 2: Faixa de orçamento mensal para uma categoria [metaIdeal, tetoMaximoAlerta].
 * Exemplo: [800, 1200]
 */
export type BudgetThresholdTuple = readonly [
  idealLimit: number,
  maxAlertCeiling: number,
];

/**
 * TUPLA 3: Payload de QR Code PIX gerado pelo gateway [emvCopyPaste, expirationIsoDate].
 */
export type PixQrPayloadTuple = readonly [
  copyPasteCode: string,
  expiresAtIso: string,
];

/**
 * Contratos base combinados via Interseção (&) para rastreabilidade de entidades.
 */
export interface IdentifiableContract {
  readonly id: string;
}

export interface AuditableContract {
  readonly createdAtIso: string;
  readonly updatedAtIso?: string;
}

export type DomainRecordMetadata = IdentifiableContract & AuditableContract;

export interface CategoryBudgetRule {
  readonly category: TransactionCategory;
  readonly thresholds: BudgetThresholdTuple;
}

export interface OpenFinanceSyncReport {
  readonly institution: InstitutionCode;
  readonly syncedTransactionsCount: number;
  readonly updatedBalance: number;
  readonly syncedAtIso: string;
}

/**
 * UNIÃO DISCRIMINADA (Etapa 2 / Playground Etapas 2 e 3):
 * Modela diferentes meios de pagamento usando a propriedade literal discriminante `kind`.
 */
export interface PixPaymentDetail {
  readonly kind: 'pix';
  readonly pixKey: string;
  readonly instantSettlement: boolean;
}

export interface CreditCardPaymentDetail {
  readonly kind: 'card';
  readonly lastFourDigits: string;
  readonly installments: number;
}

export interface OpenFinanceDebitDetail {
  readonly kind: 'open_finance';
  readonly institution: InstitutionCode;
  readonly consentId: string;
}

export type PaymentMethodDetail =
  | PixPaymentDetail
  | CreditCardPaymentDetail
  | OpenFinanceDebitDetail;

/**
 * Estreitamento automático (Type Narrowing) por união discriminada com validação de exaustividade (`assertNever`).
 */
export function describePaymentMethod(payment: PaymentMethodDetail): string {
  switch (payment.kind) {
    case 'pix':
      return `PIX para chave ${payment.pixKey} (${payment.instantSettlement ? 'liquidação imediata' : 'agendado'})`;
    case 'card':
      return `Cartão final ${payment.lastFourDigits} em ${payment.installments}x`;
    case 'open_finance':
      return `Débito Open Finance (${payment.institution}) • Consentimento ${payment.consentId}`;
    default:
      return assertNever(payment, 'Meio de pagamento não suportado');
  }
}

/**
 * TIPO DE FUNÇÃO (Function Type Alias — Etapa 3 / Playground Etapas 2 e 3):
 * Contrato funcional para aplicação de regras de taxa ou desconto em operações financeiras.
 */
export type FinancialFeeRule = (amount: number) => number;

export function applyFinancialFeeRule(
  amount: number,
  rule: FinancialFeeRule,
): number {
  return Number(rule(amount).toFixed(2));
}

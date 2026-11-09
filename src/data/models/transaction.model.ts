/**
 * TransactionModel — Camada Data (inspirado em core/lib/src/services/media/data/models/media_model.dart do App_Nasa).
 *
 * Competências da Rubrica contempladas:
 * - 2.2 Operadores spread (...) em copyWith
 * - 2.3 Herança OOP (TransactionModel extends Transaction)
 * - 3.1 Tratamento seguro de `unknown` via Type Guards (`isPlainRecord`, `hasStringField`, `hasNumberField`) sem usar `any`
 * - 3.2 Uso de asserções de tipo seguras após estreitamento (narrowing)
 */

import {
  type Either,
  type Failure,
  InstitutionCode,
  ValidationFailure,
  hasNumberField,
  hasStringField,
  isPlainRecord,
  left,
  parseTransactionCategory,
  right,
} from '@/core';
import {
  Transaction,
  type TransactionProps,
  type TransactionType,
} from '@/domain';

const VALID_TRANSACTION_TYPES: readonly TransactionType[] = [
  'INCOME',
  'EXPENSE',
  'PIX_TRANSFER',
] as const;

function isTransactionType(value: unknown): value is TransactionType {
  return (
    typeof value === 'string' &&
    (VALID_TRANSACTION_TYPES as readonly string[]).includes(value)
  );
}

function isInstitutionCode(value: unknown): value is InstitutionCode {
  return (
    typeof value === 'string' &&
    Object.values(InstitutionCode).includes(value as InstitutionCode)
  );
}

export class TransactionModel extends Transaction {
  public constructor(props: TransactionProps) {
    super(props);
  }

  /**
   * Converte o Model de infraestrutura para a Entidade pura de domínio
   * (equivalente a `Media toMedia()` no App_Nasa).
   */
  public toEntity(): Transaction {
    return new Transaction({
      id: this.id,
      title: this.title,
      amount: this.amount,
      type: this.type,
      category: this.category,
      institution: this.institution,
      dateIso: this.dateIso,
      currency: this.currency,
      isRecurring: this.isRecurring,
      merchantName: this.merchantName,
      tags: [...this.tags],
      reconciled: this.isReconciled,
    });
  }

  /**
   * Serializa o modelo para persistência JSON (`toJson()` do App_Nasa).
   */
  public toJson(): Record<string, unknown> {
    return {
      id: this.id,
      title: this.title,
      amount: this.amount,
      type: this.type,
      category: this.category,
      institution: this.institution,
      dateIso: this.dateIso,
      currency: this.currency,
      isRecurring: this.isRecurring,
      merchantName: this.merchantName,
      tags: [...this.tags],
      reconciled: this.isReconciled,
    };
  }

  /**
   * Cria uma cópia imutável alterando apenas os campos desejados via operador spread (`...`)
   * (equivalente a `MediaModel copyWith(...)` no App_Nasa).
   */
  public copyWith(patch: Partial<TransactionProps>): TransactionModel {
    const currentProps: TransactionProps = {
      id: this.id,
      title: this.title,
      amount: this.amount,
      type: this.type,
      category: this.category,
      institution: this.institution,
      dateIso: this.dateIso,
      currency: this.currency,
      isRecurring: this.isRecurring,
      merchantName: this.merchantName,
      tags: [...this.tags],
      reconciled: this.isReconciled,
    };

    return new TransactionModel({
      ...currentProps,
      ...patch,
    });
  }

  /**
   * Desserializa um payload `unknown` vindo de API ou localStorage com narrowing completo,
   * evitando o uso inseguro de `any`.
   */
  public static fromUnknown(raw: unknown): Either<Failure, TransactionModel> {
    if (!isPlainRecord(raw)) {
      return left(
        new ValidationFailure(
          'Payload de transação inválido: esperado um objeto JSON.',
        ),
      );
    }

    if (
      !hasStringField(raw, 'id') ||
      !hasStringField(raw, 'title') ||
      !hasNumberField(raw, 'amount') ||
      !hasStringField(raw, 'dateIso')
    ) {
      return left(
        new ValidationFailure(
          'Payload de transação incompleto: id, title, amount e dateIso são obrigatórios.',
        ),
      );
    }

    const type: TransactionType = isTransactionType(raw.type)
      ? raw.type
      : 'EXPENSE';

    const institution: InstitutionCode = isInstitutionCode(raw.institution)
      ? raw.institution
      : InstitutionCode.NUBANK;

    const category =
      typeof raw.category === 'string'
        ? parseTransactionCategory(raw.category)
        : parseTransactionCategory('PIX');

    const tags = Array.isArray(raw.tags)
      ? raw.tags.filter((item): item is string => typeof item === 'string')
      : [];

    return right(
      new TransactionModel({
        id: raw.id,
        title: raw.title,
        amount: raw.amount,
        type,
        category,
        institution,
        dateIso: raw.dateIso,
        currency: 'BRL',
        isRecurring: typeof raw.isRecurring === 'boolean' ? raw.isRecurring : false,
        merchantName:
          typeof raw.merchantName === 'string' ? raw.merchantName : raw.title,
        tags,
        reconciled: typeof raw.reconciled === 'boolean' ? raw.reconciled : true,
      }),
    );
  }
}

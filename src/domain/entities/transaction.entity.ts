/**
 * Entidade de domínio Transaction (inspirada em Media no App_Nasa, expandida com POO em TypeScript).
 *
 * Competências da Rubrica contempladas:
 * - 1.3 Objetos tipados e funções com parâmetros e retornos coerentes
 * - 2.2 Arrays tipados e operadores spread/rest (...transactions)
 * - 2.3 Classes com encapsulamento (private, protected, public, readonly) e membros estáticos
 */

import {
  type Either,
  type Failure,
  type InstitutionCode,
  type TransactionCategory,
  ValidationFailure,
  getCategoryLabel,
  left,
  right,
} from '@/core';
import type { CurrencyCode, TransactionType } from './financial-primitives';

export interface TransactionProps {
  readonly id: string;
  readonly title: string;
  readonly amount: number;
  readonly type: TransactionType;
  readonly category: TransactionCategory;
  readonly institution: InstitutionCode;
  readonly dateIso: string;
  readonly currency?: CurrencyCode;
  readonly isRecurring?: boolean;
  readonly merchantName?: string;
  readonly tags?: readonly string[];
  readonly reconciled?: boolean;
}

export class Transaction {
  private static readonly _MAX_SINGLE_TRANSACTION_BRL = 500_000;

  public readonly id: string;
  public readonly title: string;
  public readonly type: TransactionType;
  public readonly category: TransactionCategory;
  public readonly institution: InstitutionCode;
  public readonly dateIso: string;
  public readonly currency: CurrencyCode;
  public readonly isRecurring: boolean;
  public readonly merchantName: string;
  public readonly tags: readonly string[];

  protected readonly _rawAmount: number;
  private _reconciled: boolean;

  public constructor(props: TransactionProps) {
    this.id = props.id;
    this.title = props.title.trim();
    this._rawAmount = Math.abs(props.amount);
    this.type = props.type;
    this.category = props.category;
    this.institution = props.institution;
    this.dateIso = props.dateIso;
    this.currency = props.currency ?? 'BRL';
    this.isRecurring = props.isRecurring ?? false;
    this.merchantName = props.merchantName ?? props.title.trim();
    this.tags = props.tags ? [...props.tags] : [];
    this._reconciled = props.reconciled ?? true;
  }

  public get amount(): number {
    return this._rawAmount;
  }

  public get signedAmount(): number {
    return this.type === 'INCOME' ? this._rawAmount : -this._rawAmount;
  }

  public get isIncome(): boolean {
    return this.type === 'INCOME';
  }

  public get isExpense(): boolean {
    return this.type === 'EXPENSE' || this.type === 'PIX_TRANSFER';
  }

  public get isReconciled(): boolean {
    return this._reconciled;
  }

  public get categoryLabel(): string {
    return getCategoryLabel(this.category);
  }

  public markAsReconciled(): void {
    this._reconciled = true;
  }

  public matchesSearchQuery(rawQuery: string): boolean {
    const query = rawQuery.trim().toLowerCase();
    if (!query) {
      return true;
    }
    const inTitle = this.title.toLowerCase().includes(query);
    const inMerchant = this.merchantName.toLowerCase().includes(query);
    const inCategory = this.categoryLabel.toLowerCase().includes(query);
    const inDate = this.dateIso.toLowerCase().includes(query);
    const inTags = this.tags.some((tag) => tag.toLowerCase().includes(query));
    return inTitle || inMerchant || inCategory || inDate || inTags;
  }

  /**
   * Método estático de validação de regras de negócio para criação de transação.
   */
  public static validateProps(
    props: TransactionProps,
  ): Either<Failure, Transaction> {
    if (!props.title || props.title.trim().length < 2) {
      return left(
        new ValidationFailure(
          'A descrição da transação deve ter pelo menos 2 caracteres.',
          'title',
        ),
      );
    }
    if (!Number.isFinite(props.amount) || props.amount <= 0) {
      return left(
        new ValidationFailure(
          'O valor da transação deve ser um número positivo maior que zero.',
          'amount',
        ),
      );
    }
    if (props.amount > Transaction._MAX_SINGLE_TRANSACTION_BRL) {
      return left(
        new ValidationFailure(
          `Valor excede o teto operacional de R$ ${Transaction._MAX_SINGLE_TRANSACTION_BRL.toLocaleString('pt-BR')}.`,
          'amount',
        ),
      );
    }
    return right(new Transaction(props));
  }

  /**
   * Demonstração do operador rest (...items) e inferência em acumuladores para somar saldo líquido.
   */
  public static calculateNetBalance(
    ...items: readonly Transaction[]
  ): number {
    const total = items.reduce((acc, tx) => acc + tx.signedAmount, 0);
    return Number(total.toFixed(2));
  }

  /**
   * SOBRECARGA DE FUNÇÕES (Function Overloading — Etapa 3 / Playground Etapas 2 e 3):
   * - Quando acionado com `index: number`, retorna uma única `Transaction | undefined`.
   * - Quando acionado com `category: TransactionCategory`, retorna `readonly Transaction[]`.
   */
  public static lookupTransaction(
    items: readonly Transaction[],
    index: number,
  ): Transaction | undefined;
  public static lookupTransaction(
    items: readonly Transaction[],
    category: TransactionCategory,
  ): readonly Transaction[];
  public static lookupTransaction(
    items: readonly Transaction[],
    key: number | TransactionCategory,
  ): Transaction | undefined | readonly Transaction[] {
    if (typeof key === 'number') {
      return items[key];
    }
    return items.filter((tx) => tx.category === key);
  }
}

/**
 * Entidades OOP dos Módulos Corporativos e Bancários do Nexo Finance:
 * - Tabela 3: Cartões de Crédito & Faturas Open Finance (`CreditCardAccount`)
 * - Tabela 4: Centros de Custo & Metas de Orçamento (`CostCenterBudget`)
 * - Tabela 5: Radar de Assinaturas & Contratos Recorrentes (`RecurringSubscription`)
 * - Tabela 6: Chaves PIX Registradas & Favoritos (`RegisteredPixKey`)
 *
 * Competências TypeScript contempladas:
 * - Classes OOP com encapsulamento (`private`, `readonly`, getters e métodos de negócio retornando `Either<Failure, T>`)
 * - Tuplas imutáveis (`CardLimitTuple`, `BudgetThresholdTuple`)
 * - Uniões de tipos literais e validação estrita sem `any`
 */

import {
  type Either,
  type Failure,
  type InstitutionCode,
  type TransactionCategory,
  ValidationFailure,
  getCategoryLabel,
  getInstitutionDisplayName,
  left,
  right,
} from '@/core';
import type { BudgetThresholdTuple, PixKeyType } from './financial-primitives';
import { PixKeyValidator } from './pix-operation.entity';

/**
 * TUPLA 4: Limite de cartão de crédito [valorUtilizado, limiteTotalAprovado].
 */
export type CardLimitTuple = readonly [usedAmount: number, totalLimit: number];

export type CardInvoiceStatus = 'OPEN' | 'CLOSED' | 'PAID';

export type CardBrand = 'MASTERCARD_BLACK' | 'VISA_INFINITE' | 'ELO_NANQUIM';

export interface CreditCardAccountProps {
  readonly id: string;
  readonly institution: InstitutionCode;
  readonly cardName: string;
  readonly lastFourDigits: string;
  readonly brand: CardBrand;
  readonly limits: CardLimitTuple;
  readonly closingDay: number;
  readonly dueDay: number;
  readonly invoiceStatus: CardInvoiceStatus;
}

export class CreditCardAccount {
  public readonly id: string;
  public readonly institution: InstitutionCode;
  public readonly cardName: string;
  public readonly lastFourDigits: string;
  public readonly brand: CardBrand;
  public readonly closingDay: number;
  public readonly dueDay: number;

  private _usedAmount: number;
  private _totalLimit: number;
  private _invoiceStatus: CardInvoiceStatus;

  public constructor(props: CreditCardAccountProps) {
    this.id = props.id;
    this.institution = props.institution;
    this.cardName = props.cardName;
    this.lastFourDigits = props.lastFourDigits;
    this.brand = props.brand;
    this._usedAmount = props.limits[0];
    this._totalLimit = props.limits[1];
    this.closingDay = props.closingDay;
    this.dueDay = props.dueDay;
    this._invoiceStatus = props.invoiceStatus;
  }

  public get usedAmount(): number {
    return this._usedAmount;
  }

  public get totalLimit(): number {
    return this._totalLimit;
  }

  public get availableLimit(): number {
    return Math.max(0, Number((this._totalLimit - this._usedAmount).toFixed(2)));
  }

  public get limitsTuple(): CardLimitTuple {
    return [this._usedAmount, this._totalLimit];
  }

  public get usagePercentage(): number {
    if (this._totalLimit <= 0) {
      return 0;
    }
    return Math.min(100, Math.round((this._usedAmount / this._totalLimit) * 100));
  }

  public get invoiceStatus(): CardInvoiceStatus {
    return this._invoiceStatus;
  }

  public get institutionLabel(): string {
    return getInstitutionDisplayName(this.institution);
  }

  public payInvoice(): Either<Failure, number> {
    if (this._usedAmount <= 0 || this._invoiceStatus === 'PAID') {
      return left(
        new ValidationFailure('Esta fatura já está quitada.', 'invoiceStatus'),
      );
    }
    const paidAmount = this._usedAmount;
    this._usedAmount = 0;
    this._invoiceStatus = 'PAID';
    return right(paidAmount);
  }

  public addPurchase(amount: number): Either<Failure, number> {
    if (!Number.isFinite(amount) || amount <= 0) {
      return left(
        new ValidationFailure(
          'O valor da compra no cartão deve ser maior que zero.',
          'amount',
        ),
      );
    }
    if (this._usedAmount + amount > this._totalLimit) {
      return left(
        new ValidationFailure(
          `Limite insuficiente no cartão ${this.cardName} (Disponível: R$ ${this.availableLimit.toFixed(2)}).`,
          'amount',
        ),
      );
    }
    this._usedAmount = Number((this._usedAmount + amount).toFixed(2));
    if (this._invoiceStatus === 'PAID') {
      this._invoiceStatus = 'OPEN';
    }
    return right(this._usedAmount);
  }

  public adjustLimit(newTotalLimit: number): Either<Failure, CardLimitTuple> {
    if (!Number.isFinite(newTotalLimit) || newTotalLimit < this._usedAmount) {
      return left(
        new ValidationFailure(
          'O novo limite não pode ser inferior ao valor já utilizado na fatura.',
          'totalLimit',
        ),
      );
    }
    this._totalLimit = Number(newTotalLimit.toFixed(2));
    return right(this.limitsTuple);
  }

  public toProps(): CreditCardAccountProps {
    return {
      id: this.id,
      institution: this.institution,
      cardName: this.cardName,
      lastFourDigits: this.lastFourDigits,
      brand: this.brand,
      limits: [this._usedAmount, this._totalLimit],
      closingDay: this.closingDay,
      dueDay: this.dueDay,
      invoiceStatus: this._invoiceStatus,
    };
  }
}

/**
 * TABELA 4: Centro de Custo e Orçamento Mensal (`CostCenterBudget`).
 */
export interface CostCenterBudgetProps {
  readonly id: string;
  readonly category: TransactionCategory;
  readonly costCenterName: string;
  readonly responsibleArea: string;
  readonly thresholds: BudgetThresholdTuple;
}

export class CostCenterBudget {
  public readonly id: string;
  public readonly category: TransactionCategory;
  public readonly costCenterName: string;
  public readonly responsibleArea: string;
  private _thresholds: BudgetThresholdTuple;

  public constructor(props: CostCenterBudgetProps) {
    this.id = props.id;
    this.category = props.category;
    this.costCenterName = props.costCenterName;
    this.responsibleArea = props.responsibleArea;
    this._thresholds = props.thresholds;
  }

  public get thresholds(): BudgetThresholdTuple {
    return this._thresholds;
  }

  public get idealLimit(): number {
    return this._thresholds[0];
  }

  public get maxAlertCeiling(): number {
    return this._thresholds[1];
  }

  public get categoryLabel(): string {
    return getCategoryLabel(this.category);
  }

  public updateThresholds(
    newIdeal: number,
    newCeiling: number,
  ): Either<Failure, BudgetThresholdTuple> {
    if (!Number.isFinite(newIdeal) || newIdeal <= 0) {
      return left(
        new ValidationFailure('A meta ideal deve ser maior que zero.', 'ideal'),
      );
    }
    if (!Number.isFinite(newCeiling) || newCeiling < newIdeal) {
      return left(
        new ValidationFailure(
          'O teto máximo de alerta deve ser maior ou igual à meta ideal.',
          'ceiling',
        ),
      );
    }
    this._thresholds = [
      Number(newIdeal.toFixed(2)),
      Number(newCeiling.toFixed(2)),
    ];
    return right(this._thresholds);
  }

  public evaluateSpend(spentAmount: number): {
    readonly status: 'WITHIN_IDEAL' | 'NEAR_LIMIT' | 'EXCEEDED';
    readonly usagePercentOfCeiling: number;
    readonly varianceFromIdeal: number;
  } {
    const [ideal, ceiling] = this._thresholds;
    const status: 'WITHIN_IDEAL' | 'NEAR_LIMIT' | 'EXCEEDED' =
      spentAmount > ceiling
        ? 'EXCEEDED'
        : spentAmount > ideal
          ? 'NEAR_LIMIT'
          : 'WITHIN_IDEAL';
    const usagePercentOfCeiling =
      ceiling > 0 ? Math.min(100, Math.round((spentAmount / ceiling) * 100)) : 0;
    return {
      status,
      usagePercentOfCeiling,
      varianceFromIdeal: Number((ideal - spentAmount).toFixed(2)),
    };
  }

  public toProps(): CostCenterBudgetProps {
    return {
      id: this.id,
      category: this.category,
      costCenterName: this.costCenterName,
      responsibleArea: this.responsibleArea,
      thresholds: this._thresholds,
    };
  }
}

/**
 * TABELA 5: Assinaturas e Contratos Recorrentes (`RecurringSubscription`).
 */
export type SubscriptionAuditStatus = 'ACTIVE' | 'DUPLICATE_ALERT' | 'PAUSED';

export interface RecurringSubscriptionProps {
  readonly id: string;
  readonly serviceName: string;
  readonly category: TransactionCategory;
  readonly institution: InstitutionCode;
  readonly monthlyAmount: number;
  readonly billingDay: number;
  readonly status: SubscriptionAuditStatus;
}

export class RecurringSubscription {
  public readonly id: string;
  public readonly serviceName: string;
  public readonly category: TransactionCategory;
  public readonly institution: InstitutionCode;
  public readonly monthlyAmount: number;
  public readonly billingDay: number;
  private _status: SubscriptionAuditStatus;

  public constructor(props: RecurringSubscriptionProps) {
    this.id = props.id;
    this.serviceName = props.serviceName;
    this.category = props.category;
    this.institution = props.institution;
    this.monthlyAmount = props.monthlyAmount;
    this.billingDay = props.billingDay;
    this._status = props.status;
  }

  public get status(): SubscriptionAuditStatus {
    return this._status;
  }

  public get annualProjection(): number {
    return this._status === 'PAUSED'
      ? 0
      : Number((this.monthlyAmount * 12).toFixed(2));
  }

  public togglePause(): void {
    this._status = this._status === 'PAUSED' ? 'ACTIVE' : 'PAUSED';
  }

  public resolveDuplicate(): void {
    if (this._status === 'DUPLICATE_ALERT') {
      this._status = 'PAUSED';
    }
  }

  public toProps(): RecurringSubscriptionProps {
    return {
      id: this.id,
      serviceName: this.serviceName,
      category: this.category,
      institution: this.institution,
      monthlyAmount: this.monthlyAmount,
      billingDay: this.billingDay,
      status: this._status,
    };
  }
}

/**
 * TABELA 6: Chaves PIX Registradas e Favoritos (`RegisteredPixKey`).
 */
export interface RegisteredPixKeyProps {
  readonly id: string;
  readonly label: string;
  readonly keyType: PixKeyType;
  readonly keyValue: string;
  readonly institution: InstitutionCode;
  readonly isPrimary: boolean;
}

export class RegisteredPixKey {
  public readonly id: string;
  public readonly label: string;
  public readonly keyType: PixKeyType;
  public readonly keyValue: string;
  public readonly institution: InstitutionCode;
  public readonly isPrimary: boolean;

  public constructor(props: RegisteredPixKeyProps) {
    this.id = props.id;
    this.label = props.label;
    this.keyType = props.keyType;
    this.keyValue = props.keyValue;
    this.institution = props.institution;
    this.isPrimary = props.isPrimary;
  }

  public static createValidated(
    props: RegisteredPixKeyProps,
  ): Either<Failure, RegisteredPixKey> {
    const keyCheck = PixKeyValidator.validate(props.keyType, props.keyValue);
    if (keyCheck.isLeft()) {
      return left(keyCheck.value);
    }
    return right(
      new RegisteredPixKey({
        ...props,
        label: props.label.trim() || 'Chave PIX',
        keyValue: keyCheck.value,
      }),
    );
  }

  public toProps(): RegisteredPixKeyProps {
    return {
      id: this.id,
      label: this.label,
      keyType: this.keyType,
      keyValue: this.keyValue,
      institution: this.institution,
      isPrimary: this.isPrimary,
    };
  }
}


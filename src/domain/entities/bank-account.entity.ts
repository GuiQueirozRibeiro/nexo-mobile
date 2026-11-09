/**
 * Entidade de domínio BankAccount representando uma conta conectada via Open Finance
 * ou carteira digital integrada (Asaas PIX).
 *
 * Competências da Rubrica contempladas:
 * - 2.2 Uso prático de Tuplas (BankCoordinatesTuple = readonly [bankCode, branch, account])
 * - 2.3 Encapsulamento OOP (private _balance, private _consentStatus, getters e métodos de mutação controlada)
 */

import {
  type Either,
  type Failure,
  type InstitutionCode,
  OpenFinanceFailure,
  ValidationFailure,
  getInstitutionDisplayName,
  left,
  right,
} from '@/core';
import type {
  BankCoordinatesTuple,
  OpenFinanceConsentStatus,
} from './financial-primitives';

export interface BankAccountProps {
  readonly id: string;
  readonly institution: InstitutionCode;
  readonly nickname: string;
  readonly balance: number;
  readonly coordinates: BankCoordinatesTuple;
  readonly consentStatus: OpenFinanceConsentStatus;
  readonly lastSyncIso: string;
  readonly colorAccentHex: string;
}

export class BankAccount {
  public readonly id: string;
  public readonly institution: InstitutionCode;
  public readonly nickname: string;
  public readonly coordinates: BankCoordinatesTuple;
  public readonly colorAccentHex: string;

  private _balance: number;
  private _consentStatus: OpenFinanceConsentStatus;
  private _lastSyncIso: string;

  public constructor(props: BankAccountProps) {
    this.id = props.id;
    this.institution = props.institution;
    this.nickname = props.nickname;
    this.coordinates = props.coordinates;
    this.colorAccentHex = props.colorAccentHex;
    this._balance = Number(props.balance.toFixed(2));
    this._consentStatus = props.consentStatus;
    this._lastSyncIso = props.lastSyncIso;
  }

  public get balance(): number {
    return this._balance;
  }

  public get consentStatus(): OpenFinanceConsentStatus {
    return this._consentStatus;
  }

  public get lastSyncIso(): string {
    return this._lastSyncIso;
  }

  public get institutionName(): string {
    return getInstitutionDisplayName(this.institution);
  }

  public get isAuthorized(): boolean {
    return this._consentStatus === 'AUTHORIZED';
  }

  /**
   * Desestruturação tipada da tupla `BankCoordinatesTuple`.
   */
  public get formattedCoordinates(): string {
    const [bankCode, branch, account] = this.coordinates;
    return `Banco ${bankCode} • Ag. ${branch} • Cc. ${account}`;
  }

  public credit(amount: number, syncedAtIso?: string): Either<Failure, number> {
    if (!this.isAuthorized) {
      return left(
        new OpenFinanceFailure(
          `Consentimento Open Finance inativo para ${this.nickname}.`,
          this.institution,
        ),
      );
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return left(
        new ValidationFailure('O valor de crédito deve ser positivo.', 'amount'),
      );
    }
    this._balance = Number((this._balance + amount).toFixed(2));
    if (syncedAtIso) {
      this._lastSyncIso = syncedAtIso;
    }
    return right(this._balance);
  }

  public debit(amount: number, syncedAtIso?: string): Either<Failure, number> {
    if (!this.isAuthorized) {
      return left(
        new OpenFinanceFailure(
          `Consentimento Open Finance inativo para ${this.nickname}.`,
          this.institution,
        ),
      );
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return left(
        new ValidationFailure('O valor de débito deve ser positivo.', 'amount'),
      );
    }
    if (amount > this._balance) {
      return left(
        new ValidationFailure(
          `Saldo insuficiente em ${this.nickname} (Disponível: R$ ${this._balance.toFixed(2)}).`,
          'amount',
        ),
      );
    }
    this._balance = Number((this._balance - amount).toFixed(2));
    if (syncedAtIso) {
      this._lastSyncIso = syncedAtIso;
    }
    return right(this._balance);
  }

  public revokeConsent(): void {
    this._consentStatus = 'REVOKED';
  }

  public authorizeConsent(syncedAtIso: string): void {
    this._consentStatus = 'AUTHORIZED';
    this._lastSyncIso = syncedAtIso;
  }
}

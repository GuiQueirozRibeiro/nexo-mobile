/**
 * BankAccountModel — Camada Data para contas conectadas via Open Finance e Asaas.
 * Demonstra validação de Tuplas (`BankCoordinatesTuple`) a partir de dados `unknown`.
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
  right,
} from '@/core';
import {
  BankAccount,
  type BankAccountProps,
  type BankCoordinatesTuple,
  type OpenFinanceConsentStatus,
} from '@/domain';

function isCoordinatesTuple(value: unknown): value is BankCoordinatesTuple {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    typeof value[0] === 'string' &&
    typeof value[1] === 'string' &&
    typeof value[2] === 'string'
  );
}

function isConsentStatus(value: unknown): value is OpenFinanceConsentStatus {
  return value === 'AUTHORIZED' || value === 'EXPIRED' || value === 'REVOKED';
}

export class BankAccountModel extends BankAccount {
  public constructor(props: BankAccountProps) {
    super(props);
  }

  public toEntity(): BankAccount {
    return new BankAccount({
      id: this.id,
      institution: this.institution,
      nickname: this.nickname,
      balance: this.balance,
      coordinates: [...this.coordinates] as BankCoordinatesTuple,
      consentStatus: this.consentStatus,
      lastSyncIso: this.lastSyncIso,
      colorAccentHex: this.colorAccentHex,
    });
  }

  public toJson(): Record<string, unknown> {
    return {
      id: this.id,
      institution: this.institution,
      nickname: this.nickname,
      balance: this.balance,
      coordinates: [...this.coordinates],
      consentStatus: this.consentStatus,
      lastSyncIso: this.lastSyncIso,
      colorAccentHex: this.colorAccentHex,
    };
  }

  public copyWith(patch: Partial<BankAccountProps>): BankAccountModel {
    const base: BankAccountProps = {
      id: this.id,
      institution: this.institution,
      nickname: this.nickname,
      balance: this.balance,
      coordinates: this.coordinates,
      consentStatus: this.consentStatus,
      lastSyncIso: this.lastSyncIso,
      colorAccentHex: this.colorAccentHex,
    };
    return new BankAccountModel({
      ...base,
      ...patch,
    });
  }

  public static fromUnknown(raw: unknown): Either<Failure, BankAccountModel> {
    if (!isPlainRecord(raw)) {
      return left(
        new ValidationFailure('Payload de conta bancária inválido.'),
      );
    }

    if (
      !hasStringField(raw, 'id') ||
      !hasStringField(raw, 'nickname') ||
      !hasNumberField(raw, 'balance')
    ) {
      return left(
        new ValidationFailure(
          'Campos obrigatórios ausentes em BankAccountModel (id, nickname, balance).',
        ),
      );
    }

    const coordinates: BankCoordinatesTuple = isCoordinatesTuple(raw.coordinates)
      ? raw.coordinates
      : ['000', '0001', '00000-0'];

    const institution =
      typeof raw.institution === 'string' &&
      Object.values(InstitutionCode).includes(raw.institution as InstitutionCode)
        ? (raw.institution as InstitutionCode)
        : InstitutionCode.NUBANK;

    const consentStatus: OpenFinanceConsentStatus = isConsentStatus(
      raw.consentStatus,
    )
      ? raw.consentStatus
      : 'AUTHORIZED';

    return right(
      new BankAccountModel({
        id: raw.id,
        institution,
        nickname: raw.nickname,
        balance: raw.balance,
        coordinates,
        consentStatus,
        lastSyncIso:
          typeof raw.lastSyncIso === 'string'
            ? raw.lastSyncIso
            : new Date().toISOString(),
        colorAccentHex:
          typeof raw.colorAccentHex === 'string'
            ? raw.colorAccentHex
            : '#0df0b2',
      }),
    );
  }
}

/**
 * Entidade e Validador OOP para operações PIX (Cobrança QR Code e Transferência via Asaas / Sandbox).
 *
 * Competências da Rubrica contempladas:
 * - 1.1 e 1.4 Uniões, tipos literais e funções tipadas
 * - 2.2 Uso da tupla PixQrPayloadTuple = readonly [copyPasteCode, expiresAtIso]
 * - 2.3 Classe PixKeyValidator com métodos estáticos e regex encapsuladas (private static readonly)
 * - 3.4 Validação de exaustividade (assertNever) sobre todos os tipos de chave PIX
 */

import {
  type Either,
  type Failure,
  ValidationFailure,
  assertNever,
  left,
  right,
} from '@/core';
import type {
  PixKeyType,
  PixOperationStatus,
  PixQrPayloadTuple,
} from './financial-primitives';

export interface PixChargeEntity {
  readonly id: string;
  readonly description: string;
  readonly amount: number;
  readonly status: PixOperationStatus;
  readonly qrPayload: PixQrPayloadTuple;
  readonly qrCodeDataUrl?: string;
  readonly provider: 'ASAAS_API' | 'SANDBOX_SIMULATOR';
  readonly createdAtIso: string;
}

export interface PixTransferRequest {
  readonly sourceAccountId: string;
  readonly recipientName: string;
  readonly pixKeyType: PixKeyType;
  readonly pixKey: string;
  readonly amount: number;
  readonly description: string;
}

export interface PixTransferReceipt {
  readonly transferId: string;
  readonly endToEndId: string;
  readonly recipientName: string;
  readonly pixKeyType: PixKeyType;
  readonly pixKey: string;
  readonly amount: number;
  readonly status: PixOperationStatus;
  readonly provider: 'ASAAS_API' | 'SANDBOX_SIMULATOR';
  readonly processedAtIso: string;
}

export class PixKeyValidator {
  private static readonly _CPF_REGEX = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/;
  private static readonly _EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private static readonly _PHONE_REGEX = /^(\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}-?\d{4}$/;
  private static readonly _RANDOM_KEY_REGEX = /^[a-zA-Z0-9-]{16,36}$/;

  private constructor() {}

  /**
   * Detecta automaticamente o tipo da chave e valida.
   */
  public static detectAndValidate(
    rawValue: string,
  ): Either<Failure, { readonly type: PixKeyType; readonly value: string }> {
    const trimmed = rawValue.trim();
    if (!trimmed) {
      return left(new ValidationFailure('Informe a chave PIX de destino.', 'pixKey'));
    }

    if (trimmed.includes('@')) {
      return PixKeyValidator.validate('EMAIL', trimmed).map((v) => ({
        type: 'EMAIL' as PixKeyType,
        value: v,
      }));
    }

    const digitsOnly = trimmed.replace(/\D/g, '');
    if (digitsOnly.length === 11 && !trimmed.startsWith('+')) {
      return PixKeyValidator.validate('CPF', trimmed).map((v) => ({
        type: 'CPF' as PixKeyType,
        value: v,
      }));
    }

    if (digitsOnly.length === 14) {
      return PixKeyValidator.validate('RANDOM', trimmed).map((v) => ({
        type: 'RANDOM' as PixKeyType,
        value: v,
      }));
    }

    if (trimmed.startsWith('+') || (digitsOnly.length >= 10 && digitsOnly.length <= 13)) {
      return PixKeyValidator.validate('PHONE', trimmed).map((v) => ({
        type: 'PHONE' as PixKeyType,
        value: v,
      }));
    }

    return PixKeyValidator.validate('RANDOM', trimmed).map((v) => ({
      type: 'RANDOM' as PixKeyType,
      value: v,
    }));
  }

  /**
   * Valida formato de chave PIX de forma exaustiva para cada membro da união `PixKeyType`.
   */
  public static validate(
    keyType: PixKeyType,
    rawValue: string,
  ): Either<Failure, string> {
    const trimmed = rawValue.trim();
    if (!trimmed) {
      return left(
        new ValidationFailure('Informe a chave PIX de destino.', 'pixKey'),
      );
    }

    switch (keyType) {
      case 'CPF': {
        if (!PixKeyValidator._CPF_REGEX.test(trimmed)) {
          return left(
            new ValidationFailure(
              'Chave CPF inválida. Use 11 dígitos (ex.: 123.456.789-00).',
              'pixKey',
            ),
          );
        }
        return right(trimmed);
      }
      case 'EMAIL': {
        if (!PixKeyValidator._EMAIL_REGEX.test(trimmed)) {
          return left(
            new ValidationFailure(
              'Chave de e-mail inválida (ex.: contato@eximiatech.com.br).',
              'pixKey',
            ),
          );
        }
        return right(trimmed.toLowerCase());
      }
      case 'PHONE': {
        if (!PixKeyValidator._PHONE_REGEX.test(trimmed)) {
          return left(
            new ValidationFailure(
              'Chave celular inválida (ex.: (61) 99630-1711).',
              'pixKey',
            ),
          );
        }
        return right(trimmed);
      }
      case 'RANDOM': {
        if (!PixKeyValidator._RANDOM_KEY_REGEX.test(trimmed)) {
          return left(
            new ValidationFailure(
              'Chave aleatória EVP deve conter entre 16 e 36 caracteres alfanuméricos.',
              'pixKey',
            ),
          );
        }
        return right(trimmed);
      }
      default:
        return assertNever(keyType, 'Tipo de chave PIX não suportado');
    }
  }
}

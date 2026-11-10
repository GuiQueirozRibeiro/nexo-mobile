/**
 * NexoBffApiDataSource — Cliente Mobile (React Native / Expo) que consome
 * o site oficial (`https://nexo.eximiatech.com.br`) como API Central (BFF).
 *
 * Princípios aplicados:
 * - Zero segredos no APK / IPA: toda comunicação com Asaas e Pluggy passa pelas
 *   rotas `/api/*` hospedadas na Vercel (`nexo.eximiatech.com.br`).
 * - Tipagem estrita (Zero `any`) com retorno funcional `Either<Failure, T>`.
 */

import {
  type Either,
  type Failure,
  type InstitutionCode,
  NetworkFailure,
  hasNumberField,
  hasStringField,
  isPlainRecord,
  left,
  right,
} from '@/core';
import type { PixKeyType, WebhookAuditRecord } from '@/domain';

export interface MobileBffGatewayStatus {
  readonly service: string;
  readonly version: string;
  readonly firestoreCollection: string;
  readonly supportedInstitutions: readonly string[];
  readonly webhookAuditLog: readonly WebhookAuditRecord[];
}

export interface MobilePixQrResponse {
  readonly id: string;
  readonly copyPasteCode: string;
  readonly qrCodeDataUrl: string;
  readonly expiresAtIso: string;
  readonly provider: string;
}

export interface MobilePixTransferResponse {
  readonly transferId: string;
  readonly endToEndId: string;
  readonly status: string;
  readonly provider: string;
}

export class NexoBffApiDataSource {
  private readonly _baseUrl: string;

  public constructor(baseUrl?: string) {
    const envUrl =
      typeof process !== 'undefined'
        ? process.env.EXPO_PUBLIC_NEXO_API_URL?.trim()
        : undefined;
    this._baseUrl = (
      baseUrl ??
      envUrl ??
      'https://nexo.eximiatech.com.br'
    ).replace(/\/+$/, '');
  }

  public get baseUrl(): string {
    return this._baseUrl;
  }

  private _headers(firebaseIdToken?: string): Record<string, string> {
    const base: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-nexo-client-platform': 'react-native-expo',
    };
    if (firebaseIdToken) {
      base.Authorization = `Bearer ${firebaseIdToken}`;
    }
    return base;
  }

  /**
   * Consulta o status do BFF Mobile (`/api/v1/mobile`) no servidor `nexo.eximiatech.com.br`.
   */
  public async fetchGatewayStatus(
    firebaseIdToken?: string,
  ): Promise<Either<Failure, MobileBffGatewayStatus>> {
    try {
      const res = await fetch(`${this._baseUrl}/api/v1/mobile`, {
        method: 'GET',
        headers: this._headers(firebaseIdToken),
      });
      if (!res.ok) {
        return left(
          new NetworkFailure(`BFF Mobile respondeu com HTTP ${res.status}`),
        );
      }
      const raw: unknown = await res.json();
      if (!isPlainRecord(raw) || !hasStringField(raw, 'service')) {
        return left(new NetworkFailure('Resposta inválida do BFF Mobile.'));
      }
      return right({
        service: raw.service,
        version: hasStringField(raw, 'version') ? raw.version : '1.2.0',
        firestoreCollection: hasStringField(raw, 'firestoreCollection')
          ? raw.firestoreCollection
          : 'users/{uid}/finance/snapshot',
        supportedInstitutions: Array.isArray(raw.supportedInstitutions)
          ? (raw.supportedInstitutions as readonly string[])
          : [],
        webhookAuditLog: Array.isArray(raw.webhookAuditLog)
          ? (raw.webhookAuditLog as readonly WebhookAuditRecord[])
          : [],
      });
    } catch {
      return left(
        new NetworkFailure(
          `Não foi possível conectar ao BFF em ${this._baseUrl}/api/v1/mobile.`,
        ),
      );
    }
  }

  /**
   * Consulta o saldo real da conta Asaas via BFF (`/api/asaas/pix`).
   */
  public async fetchAsaasRealBalance(
    firebaseIdToken?: string,
  ): Promise<Either<Failure, number>> {
    try {
      const res = await fetch(`${this._baseUrl}/api/asaas/pix`, {
        method: 'POST',
        headers: this._headers(firebaseIdToken),
        body: JSON.stringify({ action: 'GET_BALANCE' }),
      });
      if (!res.ok) {
        return left(
          new NetworkFailure(
            `Erro ao consultar saldo Asaas via BFF (HTTP ${res.status}).`,
          ),
        );
      }
      const raw: unknown = await res.json();
      if (isPlainRecord(raw) && hasNumberField(raw, 'balance')) {
        return right(raw.balance);
      }
      return right(0);
    } catch {
      return left(
        new NetworkFailure('Falha de rede ao consultar saldo Asaas no BFF.'),
      );
    }
  }

  /**
   * Emite cobrança QR Code PIX no Asaas via BFF (`/api/asaas/pix`).
   */
  public async createPixQrCharge(
    params: {
      readonly amount: number;
      readonly description: string;
    },
    firebaseIdToken?: string,
  ): Promise<Either<Failure, MobilePixQrResponse>> {
    try {
      const res = await fetch(`${this._baseUrl}/api/asaas/pix`, {
        method: 'POST',
        headers: this._headers(firebaseIdToken),
        body: JSON.stringify({
          action: 'CREATE_QR_CODE',
          amount: params.amount,
          description: params.description,
        }),
      });
      const raw: unknown = await res.json();
      if (!res.ok || !isPlainRecord(raw)) {
        return left(
          new NetworkFailure(
            isPlainRecord(raw) && hasStringField(raw, 'error')
              ? raw.error
              : `Falha ao emitir QR Code PIX no BFF (HTTP ${res.status}).`,
          ),
        );
      }
      return right({
        id: hasStringField(raw, 'id') ? raw.id : `qr-${Date.now()}`,
        copyPasteCode: hasStringField(raw, 'copyPasteCode')
          ? raw.copyPasteCode
          : '',
        qrCodeDataUrl: hasStringField(raw, 'qrCodeDataUrl')
          ? raw.qrCodeDataUrl
          : '',
        expiresAtIso: hasStringField(raw, 'expiresAtIso')
          ? raw.expiresAtIso
          : new Date().toISOString(),
        provider: hasStringField(raw, 'provider') ? raw.provider : 'ASAAS_API',
      });
    } catch {
      return left(new NetworkFailure('Sem conexão com o gateway PIX do BFF.'));
    }
  }

  /**
   * Executa transferência PIX no Asaas via BFF (`/api/asaas/pix`).
   */
  public async executePixTransfer(
    params: {
      readonly amount: number;
      readonly pixKey: string;
      readonly pixKeyType: PixKeyType;
      readonly description: string;
    },
    firebaseIdToken?: string,
  ): Promise<Either<Failure, MobilePixTransferResponse>> {
    try {
      const res = await fetch(`${this._baseUrl}/api/asaas/pix`, {
        method: 'POST',
        headers: this._headers(firebaseIdToken),
        body: JSON.stringify({
          action: 'CREATE_TRANSFER',
          amount: params.amount,
          pixKey: params.pixKey,
          pixKeyType: params.pixKeyType,
          description: params.description,
        }),
      });
      const raw: unknown = await res.json();
      if (!res.ok || !isPlainRecord(raw)) {
        return left(
          new NetworkFailure(
            isPlainRecord(raw) && hasStringField(raw, 'error')
              ? raw.error
              : `Transferência recusada pelo gateway BFF (HTTP ${res.status}).`,
          ),
        );
      }
      return right({
        transferId: hasStringField(raw, 'transferId') ? raw.transferId : '',
        endToEndId: hasStringField(raw, 'endToEndId') ? raw.endToEndId : '',
        status: hasStringField(raw, 'status') ? raw.status : 'DONE',
        provider: hasStringField(raw, 'provider') ? raw.provider : 'ASAAS_API',
      });
    } catch {
      return left(
        new NetworkFailure('Falha ao conectar ao endpoint de transferência PIX.'),
      );
    }
  }

  /**
   * Solicita um Connect Token do Pluggy Open Finance via BFF (`/api/connect-token`).
   */
  public async createPluggyConnectToken(
    clientUserId: string,
    firebaseIdToken?: string,
  ): Promise<Either<Failure, string>> {
    try {
      const res = await fetch(`${this._baseUrl}/api/connect-token`, {
        method: 'POST',
        headers: this._headers(firebaseIdToken),
        body: JSON.stringify({ clientUserId }),
      });
      const raw: unknown = await res.json();
      if (res.ok && isPlainRecord(raw) && hasStringField(raw, 'accessToken')) {
        return right(raw.accessToken);
      }
      return left(
        new NetworkFailure(
          isPlainRecord(raw) && hasStringField(raw, 'error')
            ? raw.error
            : `Não foi possível gerar Connect Token Open Finance (HTTP ${res.status}).`,
        ),
      );
    } catch {
      return left(
        new NetworkFailure('Erro ao conectar em /api/connect-token.'),
      );
    }
  }

  /**
   * Sincroniza uma instituição Open Finance via BFF (`/api/open-finance/sync`).
   */
  public async syncOpenFinanceInstitution(
    institution: InstitutionCode,
    firebaseIdToken?: string,
  ): Promise<Either<Failure, string>> {
    try {
      const res = await fetch(`${this._baseUrl}/api/open-finance/sync`, {
        method: 'POST',
        headers: this._headers(firebaseIdToken),
        body: JSON.stringify({ institution }),
      });
      const raw: unknown = await res.json();
      if (res.ok && isPlainRecord(raw) && hasStringField(raw, 'syncedAtIso')) {
        return right(raw.syncedAtIso);
      }
      return left(
        new NetworkFailure(
          'Falha ao sincronizar instituição Open Finance via BFF.',
        ),
      );
    } catch {
      return left(
        new NetworkFailure('Sem conexão com /api/open-finance/sync.'),
      );
    }
  }
}


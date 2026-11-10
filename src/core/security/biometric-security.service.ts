/**
 * BiometricSecurityService — Serviço de Segurança Biométrica Flexível (Face ID / Sensor Digital Touch ID / PIN)
 *
 * Padrão Bancário (Nubank, C6, Inter, Santander, KeyClub):
 * - Prioridade absoluta para Face ID: abre direto ao iniciar o app.
 * - Suporte flexível para sensor biométrico digital (Touch ID / Fingerprint em Android e iPhones com botão).
 * - Fallback para a senha nativa do dispositivo (Device Passcode) e PIN bancário de 4 dígitos.
 * - Zero bloqueio artificial: invoca a API nativa do sistema operacional diretamente.
 */

import * as LocalAuthentication from 'expo-local-authentication';
import { type Either, left, right } from '../either/either';
import { type Failure, ValidationFailure } from '../errors/failures';

export type BiometricType = 'FACIAL_RECOGNITION' | 'FINGERPRINT' | 'IRIS' | 'NONE';

export interface BiometricCapability {
  readonly hasHardware: boolean;
  readonly isEnrolled: boolean;
  readonly biometricTypes: readonly BiometricType[];
  readonly primaryType: BiometricType;
  readonly label: string;
  readonly shortLabel: string;
  readonly icon: string;
}

export class BiometricSecurityService {
  /**
   * Identifica os recursos de biometria disponíveis no dispositivo,
   * priorizando Face ID quando presente, ou ativando Sensor Digital / Touch ID como alternativa.
   */
  public async getCapabilities(): Promise<BiometricCapability> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      const biometricTypes: BiometricType[] = [];
      for (const t of supportedTypes) {
        if (t === LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) {
          biometricTypes.push('FACIAL_RECOGNITION');
        } else if (t === LocalAuthentication.AuthenticationType.FINGERPRINT) {
          biometricTypes.push('FINGERPRINT');
        } else if (t === LocalAuthentication.AuthenticationType.IRIS) {
          biometricTypes.push('IRIS');
        }
      }

      if (biometricTypes.length === 0) {
        biometricTypes.push('NONE');
      }

      // Prioridade 1: Face ID (Reconhecimento Facial)
      // Prioridade 2: Sensor Biométrico (Digital / Touch ID)
      // Prioridade 3: Reconhecimento de Íris
      // Fallback: PIN de segurança
      let primaryType: BiometricType = 'NONE';
      let label = 'PIN de Segurança';
      let shortLabel = 'PIN';
      let icon = '🔢';

      if (hasHardware) {
        if (biometricTypes.includes('FACIAL_RECOGNITION')) {
          primaryType = 'FACIAL_RECOGNITION';
          label = 'Face ID';
          shortLabel = 'Face ID';
          icon = '👤';
        } else if (biometricTypes.includes('FINGERPRINT')) {
          primaryType = 'FINGERPRINT';
          label = 'Sensor Biométrico (Digital)';
          shortLabel = 'Digital';
          icon = '👆';
        } else if (biometricTypes.includes('IRIS')) {
          primaryType = 'IRIS';
          label = 'Leitura de Íris';
          shortLabel = 'Íris';
          icon = '👁️';
        }
      }

      return {
        hasHardware,
        isEnrolled,
        biometricTypes,
        primaryType,
        label,
        shortLabel,
        icon,
      };
    } catch {
      return {
        hasHardware: false,
        isEnrolled: false,
        biometricTypes: ['NONE'],
        primaryType: 'NONE',
        label: 'PIN de Segurança',
        shortLabel: 'PIN',
        icon: '🔢',
      };
    }
  }

  /**
   * Solicita autenticação biométrica para desbloquear o aplicativo Nexo.
   * Abre a caixa nativa do iOS (Face ID) ou Android (Biometria/Digital) diretamente.
   */
  public async authenticateAppUnlock(options?: {
    readonly promptMessage?: string;
    readonly allowDevicePasscode?: boolean;
  }): Promise<Either<Failure, boolean>> {
    try {
      const capabilities = await this.getCapabilities();

      const defaultPrompt =
        capabilities.primaryType === 'FACIAL_RECOGNITION'
          ? 'Acesse sua conta Nexo com Face ID'
          : capabilities.primaryType === 'FINGERPRINT'
            ? 'Toque no sensor biométrico para entrar'
            : 'Acesse sua conta Nexo';

      const promptMessage = options?.promptMessage ?? defaultPrompt;

      // Executa a autenticação nativa sem bloqueios sintéticos prévios
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: 'Digitar PIN',
        fallbackLabel:
          options?.allowDevicePasscode !== false
            ? 'Usar Senha do Aparelho'
            : 'Digitar PIN',
        disableDeviceFallback: options?.allowDevicePasscode === false,
      });

      if (result.success) {
        return right(true);
      }

      return left(
        new ValidationFailure(
          result.error === 'user_cancel'
            ? 'Autenticação cancelada.'
            : result.error === 'not_enrolled'
              ? 'Biometria não cadastrada no aparelho. Digite seu PIN.'
              : 'Reconhecimento biométrico não confirmado.',
        ),
      );
    } catch (err) {
      return left(
        new ValidationFailure(
          err instanceof Error
            ? err.message
            : 'Falha no serviço biométrico do dispositivo.',
        ),
      );
    }
  }

  /**
   * Solicita confirmação biométrica obrigatória para autorizar transferência PIX.
   */
  public async authenticatePixTransfer(params: {
    readonly amountFormatted: string;
    readonly recipientName: string;
  }): Promise<Either<Failure, boolean>> {
    try {
      const capabilities = await this.getCapabilities();

      const isFaceId = capabilities.primaryType === 'FACIAL_RECOGNITION';
      const isFingerprint = capabilities.primaryType === 'FINGERPRINT';

      const promptTitle = isFaceId
        ? `Confirmar PIX de ${params.amountFormatted} com Face ID`
        : isFingerprint
          ? `Confirmar PIX de ${params.amountFormatted} no Sensor Digital`
          : `Confirmar PIX de ${params.amountFormatted} com Biometria`;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptTitle,
        cancelLabel: 'Cancelar Operação',
        fallbackLabel: 'Usar Senha do Aparelho',
        disableDeviceFallback: false,
      });

      if (result.success) {
        return right(true);
      }

      return left(
        new ValidationFailure(
          result.error === 'user_cancel'
            ? 'Transferência PIX cancelada.'
            : 'Validação biométrica transacional rejeitada.',
        ),
      );
    } catch (err) {
      return left(
        new ValidationFailure(
          err instanceof Error
            ? err.message
            : 'Erro ao invocar biometria para autorização do PIX.',
        ),
      );
    }
  }
}

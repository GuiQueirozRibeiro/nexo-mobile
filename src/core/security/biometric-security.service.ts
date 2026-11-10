/**
 * BiometricSecurityService — Serviço de Segurança Biométrica Flexível (Face ID / Sensor Digital Touch ID / PIN)
 *
 * Utiliza o Expo LocalAuthentication com padrões bancários:
 * - Prioridade inteligente: Reconhecimento Facial (Face ID) primeiro; se não suportado,
 *   ativa automaticamente o Sensor Biométrico de Impressão Digital (Touch ID / Fingerprint).
 * - Identificação dinâmica do hardware do aparelho (iOS e Android).
 * - Desbloqueio seguro do aplicativo (App Lock).
 * - Autorização obrigatória para transferências e pagamentos PIX.
 * - Fallback transparente para PIN bancário de segurança.
 */

import * as LocalAuthentication from 'expo-local-authentication';
import { left, right, type Either, type Failure, ValidationFailure } from '../index';

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

      if (hasHardware && isEnrolled) {
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
   * Dá preferência para Face ID, e se não houver, solicita o sensor de impressão digital.
   */
  public async authenticateAppUnlock(): Promise<Either<Failure, boolean>> {
    try {
      const capabilities = await this.getCapabilities();

      if (!capabilities.hasHardware || !capabilities.isEnrolled) {
        return left(
          new ValidationFailure(
            'Biometria não cadastrada no dispositivo. Utilize seu PIN de segurança.',
          ),
        );
      }

      const promptMessage =
        capabilities.primaryType === 'FACIAL_RECOGNITION'
          ? 'Desbloquear Nexo Finance com Face ID'
          : capabilities.primaryType === 'FINGERPRINT'
            ? 'Toque no sensor biométrico para desbloquear'
            : 'Desbloquear Nexo Finance com Biometria';

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: 'Cancelar',
        fallbackLabel: 'Usar PIN de segurança',
        disableDeviceFallback: false,
      });

      if (result.success) {
        return right(true);
      }

      return left(
        new ValidationFailure(
          result.error === 'user_cancel'
            ? 'Autenticação cancelada pelo usuário.'
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
   * Utiliza Face ID por padrão ou o sensor biométrico digital se o aparelho não possuir Face ID.
   */
  public async authenticatePixTransfer(params: {
    readonly amountFormatted: string;
    readonly recipientName: string;
  }): Promise<Either<Failure, boolean>> {
    try {
      const capabilities = await this.getCapabilities();

      if (!capabilities.hasHardware || !capabilities.isEnrolled) {
        return left(
          new ValidationFailure(
            'Biometria não habilitada para autorizar transferências. Digite seu PIN.',
          ),
        );
      }

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
        fallbackLabel: 'Usar PIN Transacional',
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

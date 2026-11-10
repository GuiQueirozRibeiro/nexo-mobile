/**
 * BiometricSecurityService — Serviço de Segurança Biométrica (Face ID / Touch ID / Biometria Android)
 *
 * Utiliza o Expo LocalAuthentication com padrões bancários:
 * - Validação de hardware presente e biometria configurada.
 * - Desbloqueio seguro do aplicativo (App Lock).
 * - Autorização obrigatória para transferências e pagamentos PIX.
 * - Fallback para PIN de segurança bancário de 4 a 6 dígitos.
 */

import * as LocalAuthentication from 'expo-local-authentication';
import { left, right, type Either, type Failure, ValidationFailure } from '../index';

export type BiometricType = 'FACIAL_RECOGNITION' | 'FINGERPRINT' | 'IRIS' | 'NONE';

export interface BiometricCapability {
  readonly hasHardware: boolean;
  readonly isEnrolled: boolean;
  readonly biometricTypes: readonly BiometricType[];
  readonly primaryType: BiometricType;
}

export class BiometricSecurityService {
  /**
   * Identifica os recursos de biometria disponíveis no dispositivo.
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

      const primaryType: BiometricType = biometricTypes.includes('FACIAL_RECOGNITION')
        ? 'FACIAL_RECOGNITION'
        : biometricTypes.includes('FINGERPRINT')
          ? 'FINGERPRINT'
          : 'NONE';

      return {
        hasHardware,
        isEnrolled,
        biometricTypes,
        primaryType,
      };
    } catch {
      return {
        hasHardware: false,
        isEnrolled: false,
        biometricTypes: ['NONE'],
        primaryType: 'NONE',
      };
    }
  }

  /**
   * Solicita autenticação biométrica para desbloquear o aplicativo Nexo.
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

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Desbloquear Nexo Finance',
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
      const promptTitle = isFaceId
        ? `Confirmar PIX de ${params.amountFormatted} com Face ID`
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


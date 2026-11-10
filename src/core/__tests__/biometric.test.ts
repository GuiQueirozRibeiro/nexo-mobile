import * as LocalAuthMock from 'expo-local-authentication';
import { describe, expect, it } from 'vitest';
import { BiometricSecurityService } from '../security/biometric-security.service';

describe('BiometricSecurityService — Segurança Bancária Mobile', () => {
  it('deve priorizar Reconhecimento Facial (Face ID) quando disponível no aparelho', async () => {
    // Configura mock para simular aparelho com Face ID (iPhone moderno)
    const mock = LocalAuthMock as unknown as {
      AuthenticationType: { FACIAL_RECOGNITION: number; FINGERPRINT: number };
      __setMockSupportedTypes: (types: number[]) => void;
    };
    mock.__setMockSupportedTypes([
      mock.AuthenticationType.FACIAL_RECOGNITION,
      mock.AuthenticationType.FINGERPRINT,
    ]);

    const service = new BiometricSecurityService();
    const cap = await service.getCapabilities();

    expect(cap.hasHardware).toBe(true);
    expect(cap.isEnrolled).toBe(true);
    expect(cap.primaryType).toBe('FACIAL_RECOGNITION');
    expect(cap.label).toBe('Face ID');
    expect(cap.icon).toBe('👤');
  });

  it('deve ativar automaticamente o Sensor Biométrico (Digital) quando não houver Face ID', async () => {
    // Configura mock para simular aparelho sem Face ID (Android com digital ou iPhone com Touch ID)
    const mock = LocalAuthMock as unknown as {
      AuthenticationType: { FINGERPRINT: number };
      __setMockSupportedTypes: (types: number[]) => void;
    };
    mock.__setMockSupportedTypes([mock.AuthenticationType.FINGERPRINT]);

    const service = new BiometricSecurityService();
    const cap = await service.getCapabilities();

    expect(cap.hasHardware).toBe(true);
    expect(cap.isEnrolled).toBe(true);
    expect(cap.primaryType).toBe('FINGERPRINT');
    expect(cap.label).toBe('Sensor Biométrico (Digital)');
    expect(cap.shortLabel).toBe('Digital');
    expect(cap.icon).toBe('👆');
  });

  it('deve autorizar desbloqueio do app com sucesso via biometria', async () => {
    const service = new BiometricSecurityService();
    const result = await service.authenticateAppUnlock();

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value).toBe(true);
    }
  });

  it('deve autorizar transferência PIX via biometria (Face ID ou Sensor Digital)', async () => {
    const service = new BiometricSecurityService();
    const result = await service.authenticatePixTransfer({
      amountFormatted: 'R$ 250,00',
      recipientName: 'contato@eximiatech.com.br',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value).toBe(true);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { BiometricSecurityService } from '../security/biometric-security.service';

describe('BiometricSecurityService — Segurança Bancária Mobile', () => {
  it('deve identificar presença de hardware biométrico e reconhecimento facial (Face ID)', async () => {
    const service = new BiometricSecurityService();
    const cap = await service.getCapabilities();

    expect(cap.hasHardware).toBe(true);
    expect(cap.isEnrolled).toBe(true);
    expect(cap.primaryType).toBe('FACIAL_RECOGNITION');
  });

  it('deve autorizar desbloqueio do app com sucesso via biometria', async () => {
    const service = new BiometricSecurityService();
    const result = await service.authenticateAppUnlock();

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value).toBe(true);
    }
  });

  it('deve autorizar transferência PIX via Face ID', async () => {
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

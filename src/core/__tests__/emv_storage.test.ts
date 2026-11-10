import { describe, expect, it } from 'vitest';
import {
  PixEmvParserService,
  SecureStorageService,
} from '../index';

describe('PixEmvParserService & SecureStorageService', () => {
  it('deve decodificar payload EMV / BR Code com chave e valor', () => {
    const raw = '00020126570014br.gov.bcb.pix0135guilherme.queiroz@eximiatech.com.br520400005303986540545.905802BR5916Eximia Tech Ltda6009Sao Paulo62070503***6304ABCD';
    const parsed = PixEmvParserService.parse(raw);

    expect(parsed.isValid).toBe(true);
    expect(parsed.merchantName).toBe('Eximia Tech Ltda');
    expect(parsed.merchantCity).toBe('Sao Paulo');
    expect(parsed.amount).toBe(45.9);
    expect(parsed.pixKey).toBe('guilherme.queiroz@eximiatech.com.br');
  });

  it('deve identificar chave PIX digitada diretamente', () => {
    const key = 'contato@eximiatech.com.br';
    const parsed = PixEmvParserService.parse(key);

    expect(parsed.isValid).toBe(true);
    expect(parsed.pixKey).toBe(key);
  });

  it('deve salvar e recuperar sessão segura criptografada', async () => {
    await SecureStorageService.clearSession();

    const saved = await SecureStorageService.saveUserSession({
      uid: 'user-001',
      email: 'guilherme@eximiatech.com.br',
      displayName: 'Guilherme Ribeiro',
      lastLoginIso: new Date().toISOString(),
      isBiometricsEnabled: true,
    });

    expect(saved).toBe(true);

    const session = await SecureStorageService.getUserSession();
    expect(session).not.toBeNull();
    expect(session?.displayName).toBe('Guilherme Ribeiro');
    expect(session?.email).toBe('guilherme@eximiatech.com.br');
  });

  it('deve validar PIN bancário transacional', async () => {
    await SecureStorageService.saveUserPin('4321');

    const valid = await SecureStorageService.verifyUserPin('4321');
    const invalid = await SecureStorageService.verifyUserPin('0000');

    expect(valid).toBe(true);
    expect(invalid).toBe(false);
  });
});

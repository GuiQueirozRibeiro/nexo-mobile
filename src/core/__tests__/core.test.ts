import { describe, expect, it } from 'vitest';
import {
  AppFlavor,
  BrowserConnectionChecker,
  Failure,
  FlavorConfig,
  InstitutionCode,
  NoParams,
  ThemeManager,
  ThemeMode,
  TransactionCategory,
  ValidationFailure,
  getCategoryLabel,
  getInstitutionDisplayName,
  getPropertyByKey,
  getThemeModeLabel,
  hasNumberField,
  hasStringField,
  isPlainRecord,
  left,
  pickObjectKeys,
  right,
  safeJsonParse,
} from '../index';

describe('Core Layer — Either<L, R> & Functional Error Handling', () => {
  it('deve encapsular valores de sucesso em Right e transformar com map/fold', () => {
    const outcome = right<number, Failure>(1500.5).map((val) => val * 2);

    expect(outcome.isRight()).toBe(true);
    expect(outcome.isLeft()).toBe(false);
    expect(outcome.getOrElse(0)).toBe(3001);

    const message = outcome.fold(
      (err) => `Erro: ${err.message}`,
      (val) => `Saldo: R$ ${val.toFixed(2)}`,
    );
    expect(message).toBe('Saldo: R$ 3001.00');
  });

  it('deve encapsular falhas de domínio em Left preservando a hierarquia OOP de Failure', () => {
    Failure.resetOccurrences();
    const failure = new ValidationFailure('Valor PIX deve ser maior que zero', 'amount');
    const outcome = left<Failure, number>(failure);

    expect(outcome.isLeft()).toBe(true);
    expect(outcome.getOrElse(99)).toBe(99);
    expect(Failure.totalOccurrences).toBe(1);
    expect(failure.toSummary()).toContain('Campo "amount": Valor PIX deve ser maior que zero');
  });
});

describe('Core Layer — Type Guards (unknown), keyof, typeof e Enums', () => {
  it('deve fazer parse seguro de JSON para unknown e refinar com Type Guards sem usar any', () => {
    const validRaw = '{"id":"tx-01","amount":249.9}';
    const parsedEither = safeJsonParse(validRaw);

    expect(parsedEither.isRight()).toBe(true);
    const payload: unknown = parsedEither.getOrElse(null);

    expect(isPlainRecord(payload)).toBe(true);
    if (isPlainRecord(payload)) {
      expect(hasStringField(payload, 'id')).toBe(true);
      expect(hasNumberField(payload, 'amount')).toBe(true);
    }

    const invalidEither = safeJsonParse('{json_quebrado');
    expect(invalidEither.isLeft()).toBe(true);
  });

  it('deve extrair propriedades com segurança usando keyof e pickObjectKeys', () => {
    const sample = {
      id: 'acc-1',
      bank: InstitutionCode.NUBANK,
      balance: 4200,
    } as const;

    expect(getPropertyByKey(sample, 'bank')).toBe(InstitutionCode.NUBANK);
    const picked = pickObjectKeys(sample, ['id', 'balance'] as const);
    expect(picked).toEqual({ id: 'acc-1', balance: 4200 });
  });

  it('deve resolver rótulos de Enums com switch exaustivo e alternar Flavors DEV/PROD', () => {
    expect(getCategoryLabel(TransactionCategory.SUBSCRIPTIONS)).toBe(
      'Assinaturas & Streaming',
    );
    expect(getInstitutionDisplayName(InstitutionCode.ASAAS)).toContain('Asaas');

    const prodProfile = FlavorConfig.switchFlavor(AppFlavor.PROD);
    expect(prodProfile.flavor).toBe(AppFlavor.PROD);
    expect(FlavorConfig.isProd).toBe(true);

    const devProfile = FlavorConfig.switchFlavor(AppFlavor.DEV);
    expect(devProfile.flavor).toBe(AppFlavor.DEV);
    expect(FlavorConfig.isDev).toBe(true);
    expect(NoParams.instance).toBe(NoParams.instance);
  });

  it('deve verificar conectividade via BrowserConnectionChecker', async () => {
    const offlineChecker = new BrowserConnectionChecker(false);
    expect(await offlineChecker.isConnected()).toBe(false);
  });

  it('deve alternar temas Claro, Escuro e Sistema no ThemeManager e selecionar a logo correta (FAVICON1 vs FAVICON2)', () => {
    expect(getThemeModeLabel(ThemeMode.SYSTEM)).toBe('Sistema');

    const lightSnap = ThemeManager.setMode(ThemeMode.LIGHT);
    expect(lightSnap.resolved).toBe('light');
    expect(lightSnap.logoPath).toBe('/EXIMIA-FAVICON1.png');

    const darkSnap = ThemeManager.setMode(ThemeMode.DARK);
    expect(darkSnap.resolved).toBe('dark');
    expect(darkSnap.logoPath).toBe('/EXIMIA-FAVICON2.png');
  });
});

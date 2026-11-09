import { describe, expect, it } from 'vitest';
import {
  BrowserConnectionChecker,
  InstitutionCode,
  NoParams,
  TransactionCategory,
} from '@/core';
import {
  CreatePixChargeUseCase,
  ExecutePixTransferUseCase,
  GetDashboardSnapshotUseCase,
  SearchTransactionsUseCase,
  SyncOpenFinanceInstitutionUseCase,
} from '@/domain';
import {
  BankAccountModel,
  FinanceLocalDataSourceImpl,
  OpenFinanceRepositoryImpl,
  PixGatewayDataSourceImpl,
  PixGatewayRepositoryImpl,
  TransactionModel,
  TransactionRepositoryImpl,
} from '../index';

describe('Data Layer — Models (fromUnknown sem any), copyWith e Repositories', () => {
  it('deve validar unknown em TransactionModel.fromUnknown e clonar com copyWith (...spread)', () => {
    const rawUnknown: unknown = {
      id: 'tx-900',
      title: 'Assinatura GitHub Copilot',
      amount: 55.0,
      type: 'EXPENSE',
      category: 'SUBSCRIPTIONS',
      institution: 'NUBANK',
      dateIso: '2026-11-09',
      isRecurring: true,
      tags: ['dev', 'ia'],
    };

    const parsed = TransactionModel.fromUnknown(rawUnknown);
    expect(parsed.isRight()).toBe(true);

    if (parsed.isRight()) {
      const updated = parsed.value.copyWith({ amount: 65.0 });
      expect(updated.amount).toBe(65.0);
      expect(updated.title).toBe('Assinatura GitHub Copilot');
      expect(updated.toJson().amount).toBe(65.0);
    }

    expect(TransactionModel.fromUnknown('invalido').isLeft()).toBe(true);
    expect(BankAccountModel.fromUnknown({ id: '1' }).isLeft()).toBe(true);
  });

  it('deve executar UseCases completos integrados aos Repositories da camada Data', async () => {
    const localDs = new FinanceLocalDataSourceImpl();
    localDs.resetToSeed();
    const checker = new BrowserConnectionChecker(true);

    const txRepo = new TransactionRepositoryImpl(localDs, checker);
    const ofRepo = new OpenFinanceRepositoryImpl(localDs, checker);
    const pixRepo = new PixGatewayRepositoryImpl(
      new PixGatewayDataSourceImpl(),
      checker,
    );

    const dashboardUc = new GetDashboardSnapshotUseCase(ofRepo, txRepo);
    const snapResult = await dashboardUc.execute(NoParams.instance);
    expect(snapResult.isRight()).toBe(true);

    const searchUc = new SearchTransactionsUseCase(txRepo);
    const searchResult = await searchUc.execute({ query: 'Spotify' });
    expect(searchResult.isRight()).toBe(true);
    if (searchResult.isRight()) {
      expect(searchResult.value.length).toBe(2);
    }

    const syncUc = new SyncOpenFinanceInstitutionUseCase(ofRepo);
    const syncResult = await syncUc.execute(InstitutionCode.NUBANK);
    expect(syncResult.isRight()).toBe(true);

    const pixChargeUc = new CreatePixChargeUseCase(pixRepo);
    const chargeResult = await pixChargeUc.execute({
      amount: 350,
      description: 'Mensalidade SaaS Exímia',
    });
    expect(chargeResult.isRight()).toBe(true);

    const pixTransferUc = new ExecutePixTransferUseCase(pixRepo, txRepo);
    const transferResult = await pixTransferUc.execute({
      sourceAccountId: 'acc-asaas-eximia',
      recipientName: 'Fornecedor Cloud',
      pixKeyType: 'EMAIL',
      pixKey: 'pagamentos@fornecedor.com.br',
      amount: 120,
      description: 'Pagamento servidor',
    });
    expect(transferResult.isRight()).toBe(true);
    expect(TransactionCategory.PIX).toBe('PIX');
  });
});

import { describe, expect, it } from 'vitest';
import { InstitutionCode, TransactionCategory } from '@/core';
import {
  BankAccount,
  CostCenterBudget,
  CreditCardAccount,
  PierreFinancialEngine,
  PixKeyValidator,
  RecurringSubscription,
  RegisteredPixKey,
  Transaction,
  WebhookReconciliationEngine,
  applyFinancialFeeRule,
  describePaymentMethod,
} from '../index';

describe('Domain Layer — Entities OOP, Tuplas e Regras de Negócio', () => {
  it('deve validar criação de Transaction e calcular saldo líquido com operador rest (...items)', () => {
    const incomeEither = Transaction.validateProps({
      id: 'tx-1',
      title: 'Consultoria Exímia Tech',
      amount: 12000,
      type: 'INCOME',
      category: TransactionCategory.SALARY,
      institution: InstitutionCode.ASAAS,
      dateIso: '2026-11-05',
    });

    const expenseEither = Transaction.validateProps({
      id: 'tx-2',
      title: 'Servidor Cloud AWS',
      amount: 850,
      type: 'EXPENSE',
      category: TransactionCategory.SUBSCRIPTIONS,
      institution: InstitutionCode.NUBANK,
      dateIso: '2026-11-06',
      isRecurring: true,
    });

    expect(incomeEither.isRight()).toBe(true);
    expect(expenseEither.isRight()).toBe(true);

    if (incomeEither.isRight() && expenseEither.isRight()) {
      const net = Transaction.calculateNetBalance(
        incomeEither.value,
        expenseEither.value,
      );
      expect(net).toBe(11150);
    }

    const invalidTx = Transaction.validateProps({
      id: 'tx-err',
      title: 'A',
      amount: -50,
      type: 'EXPENSE',
      category: TransactionCategory.FOOD,
      institution: InstitutionCode.ITAU,
      dateIso: '2026-11-06',
    });
    expect(invalidTx.isLeft()).toBe(true);
  });

  it('deve encapsular saldo e tupla de coordenadas em BankAccount respeitando consentimento Open Finance', () => {
    const account = new BankAccount({
      id: 'acc-nubank',
      institution: InstitutionCode.NUBANK,
      nickname: 'NuConta Principal',
      balance: 5000,
      coordinates: ['260', '0001', '98421-3'],
      consentStatus: 'AUTHORIZED',
      lastSyncIso: '2026-11-09T10:00:00Z',
      colorAccentHex: '#8A05BE',
    });

    expect(account.formattedCoordinates).toBe(
      'Banco 260 • Ag. 0001 • Cc. 98421-3',
    );
    expect(account.debit(1200).isRight()).toBe(true);
    expect(account.balance).toBe(3800);

    account.revokeConsent();
    expect(account.isAuthorized).toBe(false);
    expect(account.credit(500).isLeft()).toBe(true);
  });

  it('deve validar chaves PIX de forma exaustiva em PixKeyValidator', () => {
    expect(PixKeyValidator.validate('CPF', '123.456.789-01').isRight()).toBe(true);
    expect(PixKeyValidator.validate('CPF', '12345').isLeft()).toBe(true);
    expect(
      PixKeyValidator.validate('EMAIL', 'Financeiro@EximiaTech.com.br').getOrElse(''),
    ).toBe('financeiro@eximiatech.com.br');
    expect(PixKeyValidator.validate('PHONE', '(61) 99630-1711').isRight()).toBe(true);
  });

  it('deve detectar cobranças duplicadas e responder perguntas no PierreFinancialEngine', () => {
    const account = new BankAccount({
      id: 'acc-1',
      institution: InstitutionCode.ITAU,
      nickname: 'Itaú Personnalité',
      balance: 18400,
      coordinates: ['341', '0500', '11223-9'],
      consentStatus: 'AUTHORIZED',
      lastSyncIso: '2026-11-09T10:00:00Z',
      colorAccentHex: '#EC7000',
    });

    const dup1 = new Transaction({
      id: 'dup-1',
      title: 'Spotify Premium',
      merchantName: 'Spotify',
      amount: 34.9,
      type: 'EXPENSE',
      category: TransactionCategory.SUBSCRIPTIONS,
      institution: InstitutionCode.ITAU,
      dateIso: '2026-11-08',
      isRecurring: true,
    });
    const dup2 = new Transaction({
      id: 'dup-2',
      title: 'Spotify Premium',
      merchantName: 'Spotify',
      amount: 34.9,
      type: 'EXPENSE',
      category: TransactionCategory.SUBSCRIPTIONS,
      institution: InstitutionCode.NUBANK,
      dateIso: '2026-11-08',
      isRecurring: true,
    });

    const summary = PierreFinancialEngine.buildDashboardSummary(
      [account],
      [dup1, dup2],
    );

    expect(summary.insights.some((i) => i.severity === 'CRITICAL')).toBe(true);
    const answer = PierreFinancialEngine.answerNaturalLanguageQuery(
      'Tem alguma cobrança duplicada?',
      summary,
      [dup1, dup2],
    );
    expect(answer).toContain('Spotify');
  });

  it('deve suportar sobrecarga de funções (lookupTransaction), uniões discriminadas (describePaymentMethod) e tipos de função (applyFinancialFeeRule)', () => {
    const tx1 = new Transaction({
      id: 'ov-1',
      title: 'PIX Cliente',
      amount: 500,
      type: 'INCOME',
      category: TransactionCategory.PIX,
      institution: InstitutionCode.ASAAS,
      dateIso: '2026-11-09',
    });
    const tx2 = new Transaction({
      id: 'ov-2',
      title: 'Almoço Executivo',
      amount: 85,
      type: 'EXPENSE',
      category: TransactionCategory.FOOD,
      institution: InstitutionCode.NUBANK,
      dateIso: '2026-11-09',
    });

    // Sobrecarga 1: busca por índice (number) -> retorna Transaction | undefined
    const byIndex = Transaction.lookupTransaction([tx1, tx2], 0);
    expect(byIndex?.id).toBe('ov-1');

    // Sobrecarga 2: busca por categoria (TransactionCategory) -> retorna readonly Transaction[]
    const byCategory = Transaction.lookupTransaction(
      [tx1, tx2],
      TransactionCategory.FOOD,
    );
    expect(byCategory).toHaveLength(1);
    expect(byCategory[0]?.id).toBe('ov-2');

    // União discriminada
    const pixDesc = describePaymentMethod({
      kind: 'pix',
      pixKey: 'financeiro@eximiatech.com.br',
      instantSettlement: true,
    });
    expect(pixDesc).toContain('liquidação imediata');

    // Tipo de função (Function Type Alias)
    const netAfterAsaasFee = applyFinancialFeeRule(1000, (val) => val * 0.9901);
    expect(netAfterAsaasFee).toBe(990.1);
  });

  it('deve validar as entidades corporativas multi-tabelas (CreditCardAccount, CostCenterBudget, RecurringSubscription e RegisteredPixKey)', () => {
    const card = new CreditCardAccount({
      id: 'card-1',
      institution: InstitutionCode.NUBANK,
      cardName: 'Nubank Ultravioleta Black',
      lastFourDigits: '4829',
      brand: 'MASTERCARD_BLACK',
      limits: [2500, 10000],
      closingDay: 18,
      dueDay: 25,
      invoiceStatus: 'OPEN',
    });

    expect(card.usagePercentage).toBe(25);
    expect(card.availableLimit).toBe(7500);
    expect(card.payInvoice().isRight()).toBe(true);
    expect(card.usedAmount).toBe(0);
    expect(card.invoiceStatus).toBe('PAID');

    const budget = new CostCenterBudget({
      id: 'cc-1',
      category: TransactionCategory.SUBSCRIPTIONS,
      costCenterName: 'Cloud & IA',
      responsibleArea: 'Engenharia',
      thresholds: [400, 600],
    });
    expect(budget.evaluateSpend(450).status).toBe('NEAR_LIMIT');
    expect(budget.updateThresholds(500, 800).isRight()).toBe(true);

    const sub = new RecurringSubscription({
      id: 'sub-1',
      serviceName: 'Spotify Duplicado',
      category: TransactionCategory.SUBSCRIPTIONS,
      institution: InstitutionCode.ITAU,
      monthlyAmount: 34.9,
      billingDay: 8,
      status: 'DUPLICATE_ALERT',
    });
    expect(sub.annualProjection).toBe(418.8);
    sub.resolveDuplicate();
    expect(sub.status).toBe('PAUSED');
    expect(sub.annualProjection).toBe(0);

    const pixKeyEither = RegisteredPixKey.createValidated({
      id: 'pk-1',
      label: 'E-mail Comercial',
      keyType: 'EMAIL',
      keyValue: 'Contato@EximiaTech.com.br',
      institution: InstitutionCode.ASAAS,
      isPrimary: true,
    });
    expect(pixKeyEither.isRight()).toBe(true);
  });

  it('deve garantir liquidação idempotente nos Webhooks Asaas PIX e Pluggy Open Finance sem duplicar saldo', () => {
    const engine = new WebhookReconciliationEngine();

    const parsed = engine.parseAsaasPayload({
      event: 'PAYMENT_RECEIVED',
      payment: {
        id: 'pay_998877',
        value: 350.0,
        description: 'Cobrança QR Code PIX Cliente',
      },
    });
    expect(parsed.isRight()).toBe(true);

    // 1ª notificação Asaas (PAYMENT_RECEIVED): liquida crédito normalmente
    const firstSettlement = engine.settleAsaasEvent({
      eventName: 'PAYMENT_RECEIVED',
      resourceId: 'pay_998877',
      confirmedValueBrl: 350.0,
      description: 'Cobrança QR Code PIX Cliente',
      verifiedWithRemoteApi: true,
    });
    expect(firstSettlement.outcome).toBe('SETTLED_CREDIT');
    expect(firstSettlement.suggestedTransaction?.amountCents).toBe(35000);

    // 2ª notificação Asaas para o MESMO pagamento (PAYMENT_CONFIRMED): bloqueada pela trava de idempotência!
    const duplicateSettlement = engine.settleAsaasEvent({
      eventName: 'PAYMENT_CONFIRMED',
      resourceId: 'pay_998877',
      confirmedValueBrl: 350.0,
      description: 'Cobrança QR Code PIX Cliente',
      verifiedWithRemoteApi: true,
    });
    expect(duplicateSettlement.outcome).toBe('ALREADY_PROCESSED');
    expect(duplicateSettlement.suggestedTransaction).toBeUndefined();

    // Webhook Pluggy Open Finance (atualização noturna de saldo)
    const pluggyResult = engine.settlePluggyEvent(
      {
        event: 'item/updated',
        itemId: 'item_santander_033',
        eventId: 'evt_pluggy_01',
        balance: 15420.5,
      },
      true,
    );
    expect(pluggyResult.isRight()).toBe(true);
    if (pluggyResult.isRight()) {
      expect(pluggyResult.value.outcome).toBe('BALANCE_UPDATED');
    }
  });
});

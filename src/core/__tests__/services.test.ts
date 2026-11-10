import { describe, expect, it } from 'vitest';
import {
  PushNotificationService,
  StatementExporterService,
} from '../index';

describe('Serviços Adicionais Mobile (Notificações e Exportação OFX)', () => {
  it('deve gerar conteúdo no padrão bancário OFX com tags obrigatórias', () => {
    const ofx = StatementExporterService.generateOfx({
      bankName: 'Nexo Bank Pagamentos S.A.',
      bankCode: '341',
      accountNumber: '99412-8',
      transactions: [
        {
          id: 'tx-test-01',
          description: 'Transferência PIX Recebida',
          amount: 500.0,
          type: 'CREDIT',
          dateIso: '2026-11-10T08:00:00.000Z',
          category: 'PIX',
        },
        {
          id: 'tx-test-02',
          description: 'Pagamento Fatura',
          amount: 150.0,
          type: 'DEBIT',
          dateIso: '2026-11-10T09:00:00.000Z',
          category: 'Cartão',
        },
      ],
    });

    expect(ofx).toContain('<OFX>');
    expect(ofx).toContain('<BANKID>341</BANKID>');
    expect(ofx).toContain('<ACCTID>99412-8</ACCTID>');
    expect(ofx).toContain('<TRNTYPE>CREDIT</TRNTYPE>');
    expect(ofx).toContain('<TRNAMT>500.00</TRNAMT>');
    expect(ofx).toContain('<TRNTYPE>DEBIT</TRNTYPE>');
    expect(ofx).toContain('<TRNAMT>-150.00</TRNAMT>');
    expect(ofx).toContain('</OFX>');
  });

  it('deve gerar relatório contábil formatado em texto', () => {
    const report = StatementExporterService.generateAccountingReport({
      holderName: 'Guilherme Ribeiro',
      totalBalance: 350.0,
      transactions: [
        {
          id: 'tx-01',
          description: 'PIX Recebido',
          amount: 350.0,
          type: 'CREDIT',
          dateIso: '2026-11-10T08:00:00.000Z',
          category: 'Receitas',
        },
      ],
    });

    expect(report).toContain('NEXO BANK • EXTRATO CONSOLIDADO');
    expect(report).toContain('Guilherme Ribeiro');
    expect(report).toContain('R$ 350.00');
  });

  it('deve registrar notificação push de PIX recebido e manter histórico', async () => {
    const notifService = new PushNotificationService();
    notifService.clearHistory();

    const result = await notifService.notifyPixReceived({
      amount: 1250.5,
      payerName: 'Carlos Silva',
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.title).toContain('PIX Recebido');
      expect(result.value.body).toContain('Carlos Silva');
    }

    const history = notifService.getHistory();
    expect(history.length).toBe(1);
    expect(history[0]?.category).toBe('PIX_IN');
  });
});


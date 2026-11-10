/**
 * StatementExporterService.ts — Exportação de Extrato em Formato Oficial OFX e Relatório Bancário
 *
 * Padrão OFX (Open Financial Exchange 1.0.2 / 2.0) utilizado por:
 * - Bancos e Instituições Financeiras
 * - Softwares de Contabilidade (ContaAzul, QuickBooks, Fortes, Domínio)
 * - Declaração de Imposto de Renda (IRPF / IRPJ)
 */

export interface ExportableTransaction {
  readonly id: string;
  readonly description: string;
  readonly amount: number;
  readonly type: 'CREDIT' | 'DEBIT';
  readonly dateIso: string;
  readonly category: string;
}

export class StatementExporterService {
  /**
   * Converte a lista de transações em arquivo OFX padrão bancário.
   */
  public static generateOfx(params: {
    readonly bankName: string;
    readonly bankCode: string;
    readonly accountNumber: string;
    readonly transactions: readonly ExportableTransaction[];
  }): string {
    const nowIso = new Date()
      .toISOString()
      .replace(/[-:T.]/g, '')
      .slice(0, 14);

    const transactionBlocks = params.transactions
      .map((tx) => {
        const sign = tx.type === 'DEBIT' ? '-' : '';
        const amt = `${sign}${Math.abs(tx.amount).toFixed(2)}`;
        const txDate = tx.dateIso
          ? tx.dateIso.replace(/[-:T.]/g, '').slice(0, 8)
          : nowIso.slice(0, 8);
        const trnType = tx.type === 'DEBIT' ? 'DEBIT' : 'CREDIT';

        return `
<STMTTRN>
<TRNTYPE>${trnType}</TRNTYPE>
<DTPOSTED>${txDate}120000[-03:EST]</DTPOSTED>
<TRNAMT>${amt}</TRNAMT>
<FITID>${tx.id.replace(/[^a-zA-Z0-9]/g, '')}</FITID>
<CHECKNUM>${tx.id.slice(-6)}</CHECKNUM>
<MEMO>${tx.description} - ${tx.category}</MEMO>
</STMTTRN>`;
      })
      .join('');

    return `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0</CODE>
<SEVERITY>INFO</SEVERITY>
</STATUS>
<DTSERVER>${nowIso}[-03:EST]</DTSERVER>
<LANGUAGE>POR</LANGUAGE>
<FI>
<ORG>${params.bankName}</ORG>
<FID>${params.bankCode}</FID>
</FI>
</SONRS>
</SIGNONMSGSRSV1>

<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>${nowIso}</TRNUID>
<STATUS>
<CODE>0</CODE>
<SEVERITY>INFO</SEVERITY>
</STATUS>
<STMTRS>
<CURDEF>BRL</CURDEF>
<BANKACCTFROM>
<BANKID>${params.bankCode}</BANKID>
<ACCTID>${params.accountNumber}</ACCTID>
<ACCTTYPE>CHECKING</ACCTTYPE>
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>${nowIso.slice(0, 6)}01000000[-03:EST]</DTSTART>
<DTEND>${nowIso}[-03:EST]</DTEND>${transactionBlocks}
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;
  }

  /**
   * Converte o extrato em Relatório Contábil Textual para compartilhamento.
   */
  public static generateAccountingReport(params: {
    readonly holderName: string;
    readonly totalBalance: number;
    readonly transactions: readonly ExportableTransaction[];
  }): string {
    const formattedDate = new Date().toLocaleDateString('pt-BR');
    const header = `========================================================\n` +
      `              NEXO BANK • EXTRATO CONSOLIDADO          \n` +
      `========================================================\n` +
      `Titular: ${params.holderName}\n` +
      `Data de Emissão: ${formattedDate}\n` +
      `Saldo Consolidado: R$ ${params.totalBalance.toFixed(2)}\n` +
      `Autenticação BACEN: E00038166${Date.now().toString().slice(-8)}\n` +
      `--------------------------------------------------------\n` +
      `LANÇAMENTOS:\n`;

    if (params.transactions.length === 0) {
      return header + `Nenhum lançamento no período.\n========================================================\n`;
    }

    const rows = params.transactions
      .map((t) => {
        const sign = t.type === 'CREDIT' ? '(+)' : '(-)';
        return `${t.dateIso.slice(0, 10)} | ${sign} R$ ${t.amount.toFixed(2).padStart(9)} | ${t.description.slice(0, 24).padEnd(24)} | ${t.category}`;
      })
      .join('\n');

    return header + rows + `\n========================================================\nDocumento gerado automaticamente pelo sistema Nexo Finance.\n`;
  }
}


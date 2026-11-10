/**
 * Motor de Inteligência Financeira (inspirado no Pierre Finance).
 * Analisa transações consolidadas do Open Finance, detecta assinaturas recorrentes,
 * cobranças potencialmente duplicadas, desvios de teto de orçamento (usando BudgetThresholdTuple)
 * e responde perguntas em linguagem natural.
 *
 * Competências da Rubrica contempladas:
 * - 1.1 a 1.4 Tipagem estática, inferência controlada, uniões e funções seguras
 * - 2.1 a 2.4 Interfaces, tuplas (BudgetThresholdTuple), classes OOP e métodos estáticos
 */

import {
  TransactionCategory,
  getCategoryLabel,
} from '@/core';
import type { BankAccount } from './bank-account.entity';
import type {
  BudgetThresholdTuple,
  CategoryBudgetRule,
  InsightSeverity,
} from './financial-primitives';
import { Transaction } from './transaction.entity';

export interface FinancialInsight {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly severity: InsightSeverity;
  readonly category?: TransactionCategory;
  readonly impactAmountBrl?: number;
  readonly actionRecommendation: string;
}

export interface CategoryBreakdownItem {
  readonly category: TransactionCategory;
  readonly label: string;
  readonly totalSpent: number;
  readonly percentageOfExpenses: number;
  readonly budgetThresholds: BudgetThresholdTuple;
  readonly status: 'WITHIN_IDEAL' | 'NEAR_LIMIT' | 'EXCEEDED';
}

export interface DashboardSummary {
  readonly consolidatedBalance: number;
  readonly totalIncomeMonth: number;
  readonly totalExpensesMonth: number;
  readonly netCashFlowMonth: number;
  readonly savingsRatePercentage: number;
  readonly recurringSubscriptionsTotal: number;
  readonly authorizedAccountsCount: number;
  readonly categoryBreakdown: readonly CategoryBreakdownItem[];
  readonly insights: readonly FinancialInsight[];
}

export class PierreFinancialEngine {
  /**
   * Regras padrão de orçamento mensal usando a tupla `BudgetThresholdTuple` ([idealLimit, maxAlertCeiling]).
   */
  private static readonly _DEFAULT_BUDGET_RULES: readonly CategoryBudgetRule[] =
    [
      { category: TransactionCategory.HOUSING, thresholds: [2500, 3500] },
      { category: TransactionCategory.FOOD, thresholds: [1100, 1600] },
      { category: TransactionCategory.TRANSPORT, thresholds: [450, 750] },
      { category: TransactionCategory.SUBSCRIPTIONS, thresholds: [220, 380] },
      { category: TransactionCategory.HEALTH, thresholds: [400, 800] },
      { category: TransactionCategory.PIX, thresholds: [1000, 2200] },
    ];

  private constructor() {}

  public static buildDashboardSummary(
    accounts: readonly BankAccount[],
    transactions: readonly Transaction[],
  ): DashboardSummary {
    const authorizedAccounts = accounts.filter((acc) => acc.isAuthorized);
    const consolidatedBalance = Number(
      authorizedAccounts
        .reduce((sum, acc) => sum + acc.balance, 0)
        .toFixed(2),
    );

    const totalIncomeMonth = Number(
      transactions
        .filter((tx) => tx.isIncome)
        .reduce((sum, tx) => sum + tx.amount, 0)
        .toFixed(2),
    );

    const totalExpensesMonth = Number(
      transactions
        .filter((tx) => tx.isExpense)
        .reduce((sum, tx) => sum + tx.amount, 0)
        .toFixed(2),
    );

    const netCashFlowMonth = Transaction.calculateNetBalance(...transactions);

    const savingsRatePercentage =
      totalIncomeMonth > 0
        ? Number(
            (
              ((totalIncomeMonth - totalExpensesMonth) / totalIncomeMonth) *
              100
            ).toFixed(1),
          )
        : 0;

    const recurringSubscriptionsTotal = Number(
      transactions
        .filter(
          (tx) =>
            tx.isExpense &&
            (tx.isRecurring ||
              tx.category === TransactionCategory.SUBSCRIPTIONS),
        )
        .reduce((sum, tx) => sum + tx.amount, 0)
        .toFixed(2),
    );

    const categoryBreakdown = PierreFinancialEngine._computeCategoryBreakdown(
      transactions,
      totalExpensesMonth,
    );

    const insights = PierreFinancialEngine._generateInsights(
      transactions,
      categoryBreakdown,
      recurringSubscriptionsTotal,
      savingsRatePercentage,
    );

    return {
      consolidatedBalance,
      totalIncomeMonth,
      totalExpensesMonth,
      netCashFlowMonth,
      savingsRatePercentage,
      recurringSubscriptionsTotal,
      authorizedAccountsCount: authorizedAccounts.length,
      categoryBreakdown,
      insights,
    };
  }

  private static _computeCategoryBreakdown(
    transactions: readonly Transaction[],
    totalExpenses: number,
  ): readonly CategoryBreakdownItem[] {
    return PierreFinancialEngine._DEFAULT_BUDGET_RULES.map((rule) => {
      const spent = Number(
        transactions
          .filter((tx) => tx.isExpense && tx.category === rule.category)
          .reduce((sum, tx) => sum + tx.amount, 0)
          .toFixed(2),
      );

      const [idealLimit, maxCeiling] = rule.thresholds;
      const status: CategoryBreakdownItem['status'] =
        spent > maxCeiling
          ? 'EXCEEDED'
          : spent > idealLimit
            ? 'NEAR_LIMIT'
            : 'WITHIN_IDEAL';

      const percentageOfExpenses =
        totalExpenses > 0
          ? Number(((spent / totalExpenses) * 100).toFixed(1))
          : 0;

      return {
        category: rule.category,
        label: getCategoryLabel(rule.category),
        totalSpent: spent,
        percentageOfExpenses,
        budgetThresholds: rule.thresholds,
        status,
      };
    });
  }

  private static _generateInsights(
    transactions: readonly Transaction[],
    breakdown: readonly CategoryBreakdownItem[],
    recurringTotal: number,
    savingsRate: number,
  ): readonly FinancialInsight[] {
    const insights: FinancialInsight[] = [];

    // 1. Detector de cobranças duplicadas no mesmo estabelecimento
    const expenseByMerchant = new Map<string, Transaction[]>();
    for (const tx of transactions) {
      if (!tx.isExpense) continue;
      const key = `${tx.merchantName.toLowerCase()}__${tx.amount.toFixed(2)}`;
      const existing = expenseByMerchant.get(key) ?? [];
      existing.push(tx);
      expenseByMerchant.set(key, existing);
    }

    for (const [, grouped] of expenseByMerchant) {
      const sample = grouped[0];
      if (grouped.length >= 2 && sample) {
        insights.push({
          id: `insight-dup-${sample.id}`,
          title: `Possível cobrança duplicada: ${sample.merchantName}`,
          description: `Identificamos ${grouped.length} lançamentos idênticos de R$ ${sample.amount.toFixed(2)} em ${sample.merchantName}.`,
          severity: 'CRITICAL',
          category: sample.category,
          impactAmountBrl: sample.amount,
          actionRecommendation:
            'Verifique o comprovante no banco de origem ou solicite estorno via Open Finance.',
        });
      }
    }

    // 2. Verificação de categorias que ultrapassaram a tupla de teto [ideal, max]
    for (const item of breakdown) {
      const [idealLimit, maxCeiling] = item.budgetThresholds;
      if (item.status === 'EXCEEDED') {
        const excess = Number((item.totalSpent - maxCeiling).toFixed(2));
        insights.push({
          id: `insight-budget-${item.category}`,
          title: `Teto excedido em ${item.label}`,
          description: `Gasto acumulado de R$ ${item.totalSpent.toFixed(2)} superou o teto máximo de R$ ${maxCeiling.toFixed(2)} (meta ideal: R$ ${idealLimit.toFixed(2)}).`,
          severity: 'WARNING',
          category: item.category,
          impactAmountBrl: excess,
          actionRecommendation: `Reduza novos gastos em ${item.label} nos próximos 7 dias para reequilibrar o fluxo mensal.`,
        });
      }
    }

    // 3. Análise de assinaturas recorrentes
    if (recurringTotal > 0) {
      insights.push({
        id: 'insight-subscriptions',
        title: 'Radar de Assinaturas & Recorrências',
        description: `Seus compromissos recorrentes somam R$ ${recurringTotal.toFixed(2)}/mês (R$ ${(recurringTotal * 12).toFixed(2)}/ano).`,
        severity: recurringTotal > 380 ? 'WARNING' : 'INFO',
        category: TransactionCategory.SUBSCRIPTIONS,
        impactAmountBrl: recurringTotal,
        actionRecommendation:
          'Revise serviços de streaming ou softwares pouco utilizados para liberar margem de investimento.',
      });
    }

    // 4. Taxa de poupança mensal
    insights.push({
      id: 'insight-savings-rate',
      title:
        savingsRate >= 20
          ? 'Taxa de Poupança Saudável'
          : 'Margem de Poupança Abaixo de 20%',
      description: `Você está retendo ${savingsRate}% da sua receita mensal (fluxo líquido monitorado via Open Finance).`,
      severity: savingsRate >= 20 ? 'INFO' : 'WARNING',
      category: TransactionCategory.INVESTMENTS,
      actionRecommendation:
        savingsRate >= 20
          ? 'Considere alocar o excedente em CDB Liquidez Diária (102% CDI).'
          : 'Priorize quitar variáveis de alimentação e assinaturas para atingir 20% de reserva.',
    });

    return insights;
  }

  /**
   * Assistente conversacional inspirado no Pierre ("pergunte do seu jeito").
   */
  public static answerNaturalLanguageQuery(
    question: string,
    summary: DashboardSummary,
    transactions: readonly Transaction[],
  ): string {
    const q = question.trim().toLowerCase();

    if (q.includes('assinatura') || q.includes('recorrente') || q.includes('streaming')) {
      const subs = transactions.filter(
        (t) =>
          t.isExpense &&
          (t.isRecurring || t.category === TransactionCategory.SUBSCRIPTIONS),
      );
      const names = subs.map((s) => `${s.title} (R$ ${s.amount.toFixed(2)})`).join(', ');
      return `Você possui ${subs.length} itens recorrentes monitorados pelo Open Finance, totalizando R$ ${summary.recurringSubscriptionsTotal.toFixed(2)}/mês: ${names || 'nenhuma assinatura ativa'}.`;
    }

    if (q.includes('duplicad') || q.includes('alerta') || q.includes('anomalia')) {
      const critical = summary.insights.filter((i) => i.severity === 'CRITICAL');
      if (critical.length > 0) {
        return `Atenção: detectei ${critical.length} alerta(s) crítico(s): ${critical.map((c) => c.description).join(' ')}`;
      }
      return 'Nenhuma cobrança duplicada foi encontrada nas suas contas sincronizadas.';
    }

    if (q.includes('saldo') || q.includes('quanto eu tenho') || q.includes('patrim')) {
      return `Seu saldo consolidado nas ${summary.authorizedAccountsCount} instituições com Open Finance ativo é de R$ ${summary.consolidatedBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, com fluxo líquido no mês de R$ ${summary.netCashFlowMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`;
    }

    if (q.includes('comida') || q.includes('alimenta') || q.includes('ifood') || q.includes('gastei')) {
      const topCategory = [...summary.categoryBreakdown].sort(
        (a, b) => b.totalSpent - a.totalSpent,
      )[0];
      if (topCategory) {
        const [ideal, max] = topCategory.budgetThresholds;
        return `Sua maior saída monitorada é em ${topCategory.label}: R$ ${topCategory.totalSpent.toFixed(2)} (${topCategory.percentageOfExpenses}% das despesas). A faixa planejada é entre R$ ${ideal} e R$ ${max}.`;
      }
    }

    return `Resumo Nexo IA: Saldo consolidado R$ ${summary.consolidatedBalance.toFixed(2)} | Receitas R$ ${summary.totalIncomeMonth.toFixed(2)} | Despesas R$ ${summary.totalExpensesMonth.toFixed(2)} | Taxa de poupança: ${summary.savingsRatePercentage}%. Pergunte sobre "assinaturas", "cobranças duplicadas", "saldo" ou "maior gasto".`;
  }
}

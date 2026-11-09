/**
 * DataSource Híbrido (localStorage + Cloud Firestore em tempo real + memória Node/Vitest),
 * persistindo todas as 6 tabelas relacionais do Nexo Finance:
 * 1. accounts (`BankAccountModel`)
 * 2. transactions (`TransactionModel`)
 * 3. creditCards (`CreditCardAccount`)
 * 4. costCenters (`CostCenterBudget`)
 * 5. subscriptions (`RecurringSubscription`)
 * 6. pixKeys (`RegisteredPixKey`)
 */

import {
  CacheException,
  FirebaseClientManager,
  InstitutionCode,
  TransactionCategory,
  isPlainRecord,
  safeJsonParse,
} from '@/core';
import {
  CostCenterBudget,
  type CostCenterBudgetProps,
  CreditCardAccount,
  type CreditCardAccountProps,
  RecurringSubscription,
  type RecurringSubscriptionProps,
  RegisteredPixKey,
  type RegisteredPixKeyProps,
} from '@/domain';
import { BankAccountModel } from '../models/bank-account.model';
import { TransactionModel } from '../models/transaction.model';
import {
  INITIAL_BANK_ACCOUNTS,
  INITIAL_COST_CENTERS,
  INITIAL_CREDIT_CARDS,
  INITIAL_PIX_KEYS,
  INITIAL_SUBSCRIPTIONS,
  INITIAL_TRANSACTIONS,
} from './seed-data';

const ACCOUNTS_STORAGE_KEY = 'nexo_finance_accounts_v1';
const TRANSACTIONS_STORAGE_KEY = 'nexo_finance_transactions_v1';
const CARDS_STORAGE_KEY = 'nexo_finance_cards_v1';
const COSTS_STORAGE_KEY = 'nexo_finance_costs_v1';
const SUBS_STORAGE_KEY = 'nexo_finance_subs_v1';
const PIXKEYS_STORAGE_KEY = 'nexo_finance_pixkeys_v1';

export interface IFinanceLocalDataSource {
  getAccounts(): BankAccountModel[];
  saveAccounts(accounts: readonly BankAccountModel[]): void;
  getTransactions(): TransactionModel[];
  saveTransactions(transactions: readonly TransactionModel[]): void;
  getCreditCards(): CreditCardAccount[];
  saveCreditCards(cards: readonly CreditCardAccount[]): void;
  getCostCenters(): CostCenterBudget[];
  saveCostCenters(centers: readonly CostCenterBudget[]): void;
  getSubscriptions(): RecurringSubscription[];
  saveSubscriptions(subs: readonly RecurringSubscription[]): void;
  getPixKeys(): RegisteredPixKey[];
  savePixKeys(keys: readonly RegisteredPixKey[]): void;
  syncFromFirestore(): Promise<boolean>;
  resetToSeed(): void;
  resetToZero(): void;
}

export class FinanceLocalDataSourceImpl implements IFinanceLocalDataSource {
  private static _memoryAccounts: BankAccountModel[] | null = null;
  private static _memoryTransactions: TransactionModel[] | null = null;
  private static _memoryCards: CreditCardAccount[] | null = null;
  private static _memoryCosts: CostCenterBudget[] | null = null;
  private static _memorySubs: RecurringSubscription[] | null = null;
  private static _memoryPixKeys: RegisteredPixKey[] | null = null;

  private _hasBrowserStorage(): boolean {
    return (
      typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
    );
  }

  private _pushAllToFirestore(): void {
    if (!this._hasBrowserStorage()) {
      return;
    }
    const accountsJson = this.getAccounts().map((a) => a.toJson());
    const transactionsJson = this.getTransactions().map((t) => t.toJson());
    const cardsJson = this.getCreditCards().map((c) => c.toProps());
    const costsJson = this.getCostCenters().map((c) => c.toProps());
    const subsJson = this.getSubscriptions().map((s) => s.toProps());
    const pixKeysJson = this.getPixKeys().map((p) => p.toProps());

    void FirebaseClientManager.saveFullSnapshotToFirestore({
      accounts: accountsJson,
      transactions: transactionsJson,
      creditCards: cardsJson,
      costCenters: costsJson,
      subscriptions: subsJson,
      pixKeys: pixKeysJson,
    });
  }

  public getAccounts(): BankAccountModel[] {
    if (this._hasBrowserStorage()) {
      const raw = window.localStorage.getItem(ACCOUNTS_STORAGE_KEY);
      if (raw) {
        const parsedEither = safeJsonParse(raw);
        if (parsedEither.isRight() && Array.isArray(parsedEither.value)) {
          const validModels: BankAccountModel[] = [];
          for (const item of parsedEither.value) {
            const modelEither = BankAccountModel.fromUnknown(item);
            if (modelEither.isRight()) {
              validModels.push(modelEither.value);
            }
          }
          if (validModels.length > 0) {
            FinanceLocalDataSourceImpl._memoryAccounts = validModels;
            return validModels;
          }
        }
      }
      const seeded = INITIAL_BANK_ACCOUNTS.map(
        (props) => new BankAccountModel(props),
      );
      this.saveAccounts(seeded);
      return seeded;
    }

    if (!FinanceLocalDataSourceImpl._memoryAccounts) {
      FinanceLocalDataSourceImpl._memoryAccounts = INITIAL_BANK_ACCOUNTS.map(
        (props) => new BankAccountModel(props),
      );
    }
    return [...FinanceLocalDataSourceImpl._memoryAccounts];
  }

  public saveAccounts(accounts: readonly BankAccountModel[]): void {
    try {
      FinanceLocalDataSourceImpl._memoryAccounts = [...accounts];
      if (this._hasBrowserStorage()) {
        const jsonList = accounts.map((acc) => acc.toJson());
        window.localStorage.setItem(
          ACCOUNTS_STORAGE_KEY,
          JSON.stringify(jsonList),
        );
        this._pushAllToFirestore();
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Erro ao salvar contas.';
      throw new CacheException(msg, ACCOUNTS_STORAGE_KEY);
    }
  }

  public getTransactions(): TransactionModel[] {
    if (this._hasBrowserStorage()) {
      const raw = window.localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
      if (raw) {
        const parsedEither = safeJsonParse(raw);
        if (parsedEither.isRight() && Array.isArray(parsedEither.value)) {
          const validModels: TransactionModel[] = [];
          for (const item of parsedEither.value) {
            const modelEither = TransactionModel.fromUnknown(item);
            if (modelEither.isRight()) {
              validModels.push(modelEither.value);
            }
          }
          if (validModels.length > 0) {
            FinanceLocalDataSourceImpl._memoryTransactions = validModels;
            return validModels;
          }
        }
      }
      const seeded = INITIAL_TRANSACTIONS.map(
        (props) => new TransactionModel(props),
      );
      this.saveTransactions(seeded);
      return seeded;
    }

    if (!FinanceLocalDataSourceImpl._memoryTransactions) {
      FinanceLocalDataSourceImpl._memoryTransactions = INITIAL_TRANSACTIONS.map(
        (props) => new TransactionModel(props),
      );
    }
    return [...FinanceLocalDataSourceImpl._memoryTransactions];
  }

  public saveTransactions(transactions: readonly TransactionModel[]): void {
    try {
      FinanceLocalDataSourceImpl._memoryTransactions = [...transactions];
      if (this._hasBrowserStorage()) {
        const jsonList = transactions.map((tx) => tx.toJson());
        window.localStorage.setItem(
          TRANSACTIONS_STORAGE_KEY,
          JSON.stringify(jsonList),
        );
        this._pushAllToFirestore();
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Erro ao salvar transações.';
      throw new CacheException(msg, TRANSACTIONS_STORAGE_KEY);
    }
  }

  public getCreditCards(): CreditCardAccount[] {
    if (this._hasBrowserStorage()) {
      const raw = window.localStorage.getItem(CARDS_STORAGE_KEY);
      if (raw) {
        const parsed = safeJsonParse(raw);
        if (parsed.isRight() && Array.isArray(parsed.value)) {
          const cards: CreditCardAccount[] = [];
          for (const item of parsed.value) {
            if (isPlainRecord(item) && typeof item.id === 'string') {
              cards.push(
                new CreditCardAccount(item as unknown as CreditCardAccountProps),
              );
            }
          }
          if (cards.length > 0) {
            FinanceLocalDataSourceImpl._memoryCards = cards;
            return cards;
          }
        }
      }
      const seeded = INITIAL_CREDIT_CARDS.map(
        (props) => new CreditCardAccount(props),
      );
      this.saveCreditCards(seeded);
      return seeded;
    }
    if (!FinanceLocalDataSourceImpl._memoryCards) {
      FinanceLocalDataSourceImpl._memoryCards = INITIAL_CREDIT_CARDS.map(
        (props) => new CreditCardAccount(props),
      );
    }
    return [...FinanceLocalDataSourceImpl._memoryCards];
  }

  public saveCreditCards(cards: readonly CreditCardAccount[]): void {
    FinanceLocalDataSourceImpl._memoryCards = [...cards];
    if (this._hasBrowserStorage()) {
      window.localStorage.setItem(
        CARDS_STORAGE_KEY,
        JSON.stringify(cards.map((c) => c.toProps())),
      );
      this._pushAllToFirestore();
    }
  }

  public getCostCenters(): CostCenterBudget[] {
    if (this._hasBrowserStorage()) {
      const raw = window.localStorage.getItem(COSTS_STORAGE_KEY);
      if (raw) {
        const parsed = safeJsonParse(raw);
        if (parsed.isRight() && Array.isArray(parsed.value)) {
          const centers: CostCenterBudget[] = [];
          for (const item of parsed.value) {
            if (isPlainRecord(item) && typeof item.id === 'string') {
              centers.push(
                new CostCenterBudget(item as unknown as CostCenterBudgetProps),
              );
            }
          }
          if (centers.length > 0) {
            FinanceLocalDataSourceImpl._memoryCosts = centers;
            return centers;
          }
        }
      }
      const seeded = INITIAL_COST_CENTERS.map(
        (props) => new CostCenterBudget(props),
      );
      this.saveCostCenters(seeded);
      return seeded;
    }
    if (!FinanceLocalDataSourceImpl._memoryCosts) {
      FinanceLocalDataSourceImpl._memoryCosts = INITIAL_COST_CENTERS.map(
        (props) => new CostCenterBudget(props),
      );
    }
    return [...FinanceLocalDataSourceImpl._memoryCosts];
  }

  public saveCostCenters(centers: readonly CostCenterBudget[]): void {
    FinanceLocalDataSourceImpl._memoryCosts = [...centers];
    if (this._hasBrowserStorage()) {
      window.localStorage.setItem(
        COSTS_STORAGE_KEY,
        JSON.stringify(centers.map((c) => c.toProps())),
      );
      this._pushAllToFirestore();
    }
  }

  public getSubscriptions(): RecurringSubscription[] {
    if (this._hasBrowserStorage()) {
      const raw = window.localStorage.getItem(SUBS_STORAGE_KEY);
      if (raw) {
        const parsed = safeJsonParse(raw);
        if (parsed.isRight() && Array.isArray(parsed.value)) {
          const subs: RecurringSubscription[] = [];
          for (const item of parsed.value) {
            if (isPlainRecord(item) && typeof item.id === 'string') {
              subs.push(
                new RecurringSubscription(
                  item as unknown as RecurringSubscriptionProps,
                ),
              );
            }
          }
          if (subs.length > 0) {
            FinanceLocalDataSourceImpl._memorySubs = subs;
            return subs;
          }
        }
      }
      const seeded = INITIAL_SUBSCRIPTIONS.map(
        (props) => new RecurringSubscription(props),
      );
      this.saveSubscriptions(seeded);
      return seeded;
    }
    if (!FinanceLocalDataSourceImpl._memorySubs) {
      FinanceLocalDataSourceImpl._memorySubs = INITIAL_SUBSCRIPTIONS.map(
        (props) => new RecurringSubscription(props),
      );
    }
    return [...FinanceLocalDataSourceImpl._memorySubs];
  }

  public saveSubscriptions(subs: readonly RecurringSubscription[]): void {
    FinanceLocalDataSourceImpl._memorySubs = [...subs];
    if (this._hasBrowserStorage()) {
      window.localStorage.setItem(
        SUBS_STORAGE_KEY,
        JSON.stringify(subs.map((s) => s.toProps())),
      );
      this._pushAllToFirestore();
    }
  }

  public getPixKeys(): RegisteredPixKey[] {
    if (this._hasBrowserStorage()) {
      const raw = window.localStorage.getItem(PIXKEYS_STORAGE_KEY);
      if (raw) {
        const parsed = safeJsonParse(raw);
        if (parsed.isRight() && Array.isArray(parsed.value)) {
          const keys: RegisteredPixKey[] = [];
          for (const item of parsed.value) {
            if (isPlainRecord(item) && typeof item.id === 'string') {
              keys.push(
                new RegisteredPixKey(item as unknown as RegisteredPixKeyProps),
              );
            }
          }
          if (keys.length > 0) {
            FinanceLocalDataSourceImpl._memoryPixKeys = keys;
            return keys;
          }
        }
      }
      const seeded = INITIAL_PIX_KEYS.map(
        (props) => new RegisteredPixKey(props),
      );
      this.savePixKeys(seeded);
      return seeded;
    }
    if (!FinanceLocalDataSourceImpl._memoryPixKeys) {
      FinanceLocalDataSourceImpl._memoryPixKeys = INITIAL_PIX_KEYS.map(
        (props) => new RegisteredPixKey(props),
      );
    }
    return [...FinanceLocalDataSourceImpl._memoryPixKeys];
  }

  public savePixKeys(keys: readonly RegisteredPixKey[]): void {
    FinanceLocalDataSourceImpl._memoryPixKeys = [...keys];
    if (this._hasBrowserStorage()) {
      window.localStorage.setItem(
        PIXKEYS_STORAGE_KEY,
        JSON.stringify(keys.map((k) => k.toProps())),
      );
      this._pushAllToFirestore();
    }
  }

  /**
   * Hidrata o armazenamento local a partir do Cloud Firestore (`users/{uid}/finance/snapshot`),
   * ou envia os dados atuais para a nuvem se for o primeiro acesso do usuário.
   */
  public async syncFromFirestore(): Promise<boolean> {
    if (!this._hasBrowserStorage()) {
      return false;
    }
    const cloudSnap =
      await FirebaseClientManager.loadUserSnapshotFromFirestore();
    if (!cloudSnap) {
      // Usuário novo autenticado! Inicia limpo com R$ 0,00 e salva na nuvem
      this.resetToZero();
      return true;
    }

    if (cloudSnap.accounts.length > 0) {
      window.localStorage.setItem(
        ACCOUNTS_STORAGE_KEY,
        JSON.stringify(cloudSnap.accounts),
      );
    }
    if (cloudSnap.transactions.length > 0) {
      window.localStorage.setItem(
        TRANSACTIONS_STORAGE_KEY,
        JSON.stringify(cloudSnap.transactions),
      );
    }
    if (cloudSnap.creditCards && cloudSnap.creditCards.length > 0) {
      window.localStorage.setItem(
        CARDS_STORAGE_KEY,
        JSON.stringify(cloudSnap.creditCards),
      );
    }
    if (cloudSnap.costCenters && cloudSnap.costCenters.length > 0) {
      window.localStorage.setItem(
        COSTS_STORAGE_KEY,
        JSON.stringify(cloudSnap.costCenters),
      );
    }
    if (cloudSnap.subscriptions && cloudSnap.subscriptions.length > 0) {
      window.localStorage.setItem(
        SUBS_STORAGE_KEY,
        JSON.stringify(cloudSnap.subscriptions),
      );
    }
    if (cloudSnap.pixKeys && cloudSnap.pixKeys.length > 0) {
      window.localStorage.setItem(
        PIXKEYS_STORAGE_KEY,
        JSON.stringify(cloudSnap.pixKeys),
      );
    }
    return true;
  }

  public resetToZero(): void {
    const cleanAccount = new BankAccountModel({
      id: 'acc-nexo-primary',
      institution: InstitutionCode.ASAAS,
      nickname: 'Nexo Conta Digital (Asaas)',
      balance: 0,
      coordinates: ['461', '0001', '1001-0'],
      consentStatus: 'AUTHORIZED',
      lastSyncIso: new Date().toISOString(),
      colorAccentHex: '#ff5500',
    });

    FinanceLocalDataSourceImpl._memoryAccounts = [cleanAccount];
    FinanceLocalDataSourceImpl._memoryTransactions = [];
    FinanceLocalDataSourceImpl._memoryCards = [];
    FinanceLocalDataSourceImpl._memoryCosts = [
      new CostCenterBudget({
        id: 'cost-housing',
        category: TransactionCategory.HOUSING,
        costCenterName: 'Moradia e Infraestrutura Fixa',
        responsibleArea: 'Operações / Fixo',
        thresholds: [2000, 2500],
      }),
      new CostCenterBudget({
        id: 'cost-food',
        category: TransactionCategory.FOOD,
        costCenterName: 'Alimentação',
        responsibleArea: 'Cotidiano',
        thresholds: [1000, 1500],
      }),
      new CostCenterBudget({
        id: 'cost-transport',
        category: TransactionCategory.TRANSPORT,
        costCenterName: 'Mobilidade e Transporte',
        responsibleArea: 'Logística',
        thresholds: [400, 600],
      }),
      new CostCenterBudget({
        id: 'cost-subs',
        category: TransactionCategory.SUBSCRIPTIONS,
        costCenterName: 'Tecnologia e Assinaturas',
        responsibleArea: 'Tecnologia',
        thresholds: [300, 500],
      }),
    ];
    FinanceLocalDataSourceImpl._memorySubs = [];
    FinanceLocalDataSourceImpl._memoryPixKeys = [];

    if (this._hasBrowserStorage()) {
      window.localStorage.setItem(
        ACCOUNTS_STORAGE_KEY,
        JSON.stringify([cleanAccount.toJson()]),
      );
      window.localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify([]));
      window.localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify([]));
      window.localStorage.setItem(
        COSTS_STORAGE_KEY,
        JSON.stringify(
          FinanceLocalDataSourceImpl._memoryCosts.map((c) => c.toProps()),
        ),
      );
      window.localStorage.setItem(SUBS_STORAGE_KEY, JSON.stringify([]));
      window.localStorage.setItem(PIXKEYS_STORAGE_KEY, JSON.stringify([]));
      this._pushAllToFirestore();
    }
  }

  public resetToSeed(): void {
    FinanceLocalDataSourceImpl._memoryAccounts = INITIAL_BANK_ACCOUNTS.map(
      (props) => new BankAccountModel(props),
    );
    FinanceLocalDataSourceImpl._memoryTransactions = INITIAL_TRANSACTIONS.map(
      (props) => new TransactionModel(props),
    );
    FinanceLocalDataSourceImpl._memoryCards = INITIAL_CREDIT_CARDS.map(
      (props) => new CreditCardAccount(props),
    );
    FinanceLocalDataSourceImpl._memoryCosts = INITIAL_COST_CENTERS.map(
      (props) => new CostCenterBudget(props),
    );
    FinanceLocalDataSourceImpl._memorySubs = INITIAL_SUBSCRIPTIONS.map(
      (props) => new RecurringSubscription(props),
    );
    FinanceLocalDataSourceImpl._memoryPixKeys = INITIAL_PIX_KEYS.map(
      (props) => new RegisteredPixKey(props),
    );

    if (this._hasBrowserStorage()) {
      this.saveAccounts(FinanceLocalDataSourceImpl._memoryAccounts);
      this.saveTransactions(FinanceLocalDataSourceImpl._memoryTransactions);
      this.saveCreditCards(FinanceLocalDataSourceImpl._memoryCards);
      this.saveCostCenters(FinanceLocalDataSourceImpl._memoryCosts);
      this.saveSubscriptions(FinanceLocalDataSourceImpl._memorySubs);
      this.savePixKeys(FinanceLocalDataSourceImpl._memoryPixKeys);
    }
  }
}

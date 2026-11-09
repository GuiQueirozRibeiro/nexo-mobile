/**
 * Implementações de Repositório da camada Data (inspiradas em MediaRepositoryImpl do App_Nasa).
 *
 * Princípios aplicados:
 * - DIP: implementam as interfaces definidas na camada Domain.
 * - Tratamento de erros funcional: capturam ServerException / CacheException e convertem em Either<Failure, T>.
 */

import {
  CacheException,
  type Either,
  type Failure,
  type IConnectionChecker,
  type InstitutionCode,
  NetworkFailure,
  OpenFinanceFailure,
  PixGatewayFailure,
  ServerException,
  StorageFailure,
  TransactionCategory,
  UnexpectedFailure,
  left,
  right,
} from '@/core';
import type {
  BankAccount,
  IOpenFinanceRepository,
  IPixGatewayRepository,
  ITransactionRepository,
  OpenFinanceSyncReport,
  PixChargeEntity,
  PixTransferReceipt,
  PixTransferRequest,
  Transaction,
  TransactionFilterCriteria,
  TransactionProps,
} from '@/domain';
import type { IFinanceLocalDataSource } from '../datasources/finance-local.datasource';
import type { IPixGatewayDataSource } from '../datasources/pix-gateway.datasource';
import { TransactionModel } from '../models/transaction.model';

export class TransactionRepositoryImpl implements ITransactionRepository {
  public constructor(
    private readonly _localDataSource: IFinanceLocalDataSource,
    private readonly _connectionChecker: IConnectionChecker,
  ) {}

  public async getTransactions(): Promise<
    Either<Failure, readonly Transaction[]>
  > {
    try {
      const models = this._localDataSource.getTransactions();
      const entities = models.map((model) => model.toEntity());
      return right(entities);
    } catch (error) {
      if (error instanceof CacheException) {
        return left(new StorageFailure(error.message));
      }
      return left(new UnexpectedFailure('Erro ao listar transações.'));
    }
  }

  public async addTransaction(
    props: TransactionProps,
  ): Promise<Either<Failure, Transaction>> {
    try {
      const existing = this._localDataSource.getTransactions();
      const newModel = new TransactionModel(props);
      const updated = [newModel, ...existing];
      this._localDataSource.saveTransactions(updated);

      // Atualiza também o saldo da conta correspondente
      const accounts = this._localDataSource.getAccounts();
      const updatedAccounts = accounts.map((acc) => {
        if (acc.institution !== props.institution) {
          return acc;
        }
        const delta = props.type === 'INCOME' ? props.amount : -props.amount;
        return acc.copyWith({
          balance: Number((acc.balance + delta).toFixed(2)),
          lastSyncIso: new Date().toISOString(),
        });
      });
      this._localDataSource.saveAccounts(updatedAccounts);

      return right(newModel.toEntity());
    } catch (error) {
      if (error instanceof CacheException) {
        return left(new StorageFailure(error.message));
      }
      return left(new UnexpectedFailure('Não foi possível salvar a transação.'));
    }
  }

  public async deleteTransaction(id: string): Promise<Either<Failure, boolean>> {
    try {
      const existing = this._localDataSource.getTransactions();
      const filtered = existing.filter((tx) => tx.id !== id);
      this._localDataSource.saveTransactions(filtered);
      return right(filtered.length < existing.length);
    } catch (error) {
      if (error instanceof CacheException) {
        return left(new StorageFailure(error.message));
      }
      return left(new UnexpectedFailure('Erro ao remover transação.'));
    }
  }

  public async searchTransactions(
    criteria: TransactionFilterCriteria,
  ): Promise<Either<Failure, readonly Transaction[]>> {
    try {
      await this._connectionChecker.isConnected();
      const models = this._localDataSource.getTransactions();
      const entities = models.map((m) => m.toEntity());

      const filtered = entities.filter((tx) => {
        if (
          criteria.category &&
          criteria.category !== 'ALL' &&
          tx.category !== criteria.category
        ) {
          return false;
        }
        if (
          criteria.institution &&
          criteria.institution !== 'ALL' &&
          tx.institution !== criteria.institution
        ) {
          return false;
        }
        if (criteria.onlyRecurring && !tx.isRecurring) {
          return false;
        }
        if (criteria.query && !tx.matchesSearchQuery(criteria.query)) {
          return false;
        }
        return true;
      });

      return right(filtered);
    } catch {
      return left(new UnexpectedFailure('Erro ao pesquisar transações.'));
    }
  }
}

export class OpenFinanceRepositoryImpl implements IOpenFinanceRepository {
  public constructor(
    private readonly _localDataSource: IFinanceLocalDataSource,
    private readonly _connectionChecker: IConnectionChecker,
  ) {}

  public async getConnectedAccounts(): Promise<
    Either<Failure, readonly BankAccount[]>
  > {
    try {
      const models = this._localDataSource.getAccounts();
      return right(models.map((m) => m.toEntity()));
    } catch (error) {
      if (error instanceof CacheException) {
        return left(new StorageFailure(error.message));
      }
      return left(new OpenFinanceFailure('Erro ao carregar contas Open Finance.'));
    }
  }

  public async syncInstitution(
    institution: InstitutionCode,
  ): Promise<Either<Failure, OpenFinanceSyncReport>> {
    try {
      const connected = await this._connectionChecker.isConnected();
      if (!connected) {
        return left(
          new NetworkFailure(
            'Sem conexão para sincronizar com o diretório Open Finance Brasil.',
          ),
        );
      }

      const accounts = this._localDataSource.getAccounts();
      const target = accounts.find((acc) => acc.institution === institution);
      if (!target) {
        return left(
          new OpenFinanceFailure(
            `Instituição ${institution} não encontrada na carteira.`,
            institution,
          ),
        );
      }

      if (!target.isAuthorized) {
        return left(
          new OpenFinanceFailure(
            `Consentimento revogado para ${target.nickname}. Reautorize antes de sincronizar.`,
            institution,
          ),
        );
      }

      const nowIso = new Date().toISOString();
      const cashbackYield = Number((18.5 + Math.random() * 45).toFixed(2));
      const newBalance = Number((target.balance + cashbackYield).toFixed(2));

      const updatedAccounts = accounts.map((acc) =>
        acc.institution === institution
          ? acc.copyWith({ balance: newBalance, lastSyncIso: nowIso })
          : acc,
      );
      this._localDataSource.saveAccounts(updatedAccounts);

      const syncTx = new TransactionModel({
        id: `sync-${institution.toLowerCase()}-${Date.now()}`,
        title: `Rendimento Automático CDI • ${target.nickname}`,
        merchantName: target.nickname,
        amount: cashbackYield,
        type: 'INCOME',
        category: TransactionCategory.INVESTMENTS,
        institution,
        dateIso: nowIso.slice(0, 10),
        isRecurring: false,
        tags: ['open-finance', 'cdi', 'sync'],
      });
      const existingTx = this._localDataSource.getTransactions();
      this._localDataSource.saveTransactions([syncTx, ...existingTx]);

      return right({
        institution,
        syncedTransactionsCount: 1,
        updatedBalance: newBalance,
        syncedAtIso: nowIso,
      });
    } catch {
      return left(
        new OpenFinanceFailure(
          `Falha ao sincronizar Open Finance para ${institution}.`,
          institution,
        ),
      );
    }
  }

  public async toggleConsent(
    accountId: string,
    authorize: boolean,
  ): Promise<Either<Failure, BankAccount>> {
    try {
      const accounts = this._localDataSource.getAccounts();
      const target = accounts.find((a) => a.id === accountId);
      if (!target) {
        return left(new OpenFinanceFailure('Conta bancária não localizada.'));
      }

      const updatedModel = target.copyWith({
        consentStatus: authorize ? 'AUTHORIZED' : 'REVOKED',
        lastSyncIso: new Date().toISOString(),
      });

      const nextList = accounts.map((a) =>
        a.id === accountId ? updatedModel : a,
      );
      this._localDataSource.saveAccounts(nextList);

      return right(updatedModel.toEntity());
    } catch {
      return left(
        new OpenFinanceFailure('Erro ao atualizar consentimento Open Finance.'),
      );
    }
  }
}

export class PixGatewayRepositoryImpl implements IPixGatewayRepository {
  public constructor(
    private readonly _pixDataSource: IPixGatewayDataSource,
    private readonly _connectionChecker: IConnectionChecker,
  ) {}

  public async createPixCharge(
    amount: number,
    description: string,
  ): Promise<Either<Failure, PixChargeEntity>> {
    try {
      if (!(await this._connectionChecker.isConnected())) {
        return left(
          new NetworkFailure(
            'Sem conexão para registrar QR Code PIX no gateway.',
          ),
        );
      }
      const charge = await this._pixDataSource.createPixCharge(
        amount,
        description,
      );
      return right(charge);
    } catch (error) {
      if (error instanceof ServerException) {
        return left(new PixGatewayFailure(error.message, 'ASAAS'));
      }
      return left(
        new PixGatewayFailure('Não foi possível gerar o QR Code PIX.'),
      );
    }
  }

  public async executePixTransfer(
    request: PixTransferRequest,
  ): Promise<Either<Failure, PixTransferReceipt>> {
    try {
      if (!(await this._connectionChecker.isConnected())) {
        return left(
          new NetworkFailure('Sem conexão para liquidar transferência PIX.'),
        );
      }
      const receipt = await this._pixDataSource.executePixTransfer(request);
      return right(receipt);
    } catch (error) {
      if (error instanceof ServerException) {
        return left(new PixGatewayFailure(error.message, 'ASAAS'));
      }
      return left(
        new PixGatewayFailure('Falha na liquidação da transferência PIX.'),
      );
    }
  }
}

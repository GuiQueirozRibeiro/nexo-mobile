/**
 * Contratos de Repositório da camada Domain (aplicando ISP e DIP do SOLID),
 * inspirados em core/lib/src/services/media/domain/repository/media_repository.dart do App_Nasa.
 */

import type { Either, Failure, InstitutionCode, TransactionCategory } from '@/core';
import type { BankAccount } from '../entities/bank-account.entity';
import type { OpenFinanceSyncReport } from '../entities/financial-primitives';
import type {
  PixChargeEntity,
  PixTransferReceipt,
  PixTransferRequest,
} from '../entities/pix-operation.entity';
import type { Transaction, TransactionProps } from '../entities/transaction.entity';

export interface TransactionFilterCriteria {
  readonly query?: string;
  readonly category?: TransactionCategory | 'ALL';
  readonly institution?: InstitutionCode | 'ALL';
  readonly onlyRecurring?: boolean;
}

/**
 * ISP: Interface dedicada exclusivamente às operações de leitura/escrita de transações.
 */
export interface ITransactionRepository {
  getTransactions(): Promise<Either<Failure, readonly Transaction[]>>;
  addTransaction(props: TransactionProps): Promise<Either<Failure, Transaction>>;
  deleteTransaction(id: string): Promise<Either<Failure, boolean>>;
  searchTransactions(
    criteria: TransactionFilterCriteria,
  ): Promise<Either<Failure, readonly Transaction[]>>;
}

/**
 * ISP: Interface dedicada à conexão e sincronização de contas bancárias via Open Finance.
 */
export interface IOpenFinanceRepository {
  getConnectedAccounts(): Promise<Either<Failure, readonly BankAccount[]>>;
  syncInstitution(
    institution: InstitutionCode,
  ): Promise<Either<Failure, OpenFinanceSyncReport>>;
  toggleConsent(
    accountId: string,
    authorize: boolean,
  ): Promise<Either<Failure, BankAccount>>;
}

/**
 * ISP: Interface dedicada ao gateway bancário de pagamentos e recebimentos PIX (Asaas / Sandbox).
 */
export interface IPixGatewayRepository {
  createPixCharge(
    amount: number,
    description: string,
  ): Promise<Either<Failure, PixChargeEntity>>;
  executePixTransfer(
    request: PixTransferRequest,
  ): Promise<Either<Failure, PixTransferReceipt>>;
}

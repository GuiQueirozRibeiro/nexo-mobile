/**
 * Casos de Uso da Camada Domain (inspirados em core/lib/src/services/media/domain/usecases/ do App_Nasa).
 *
 * Princípios SOLID aplicados:
 * - SRP: cada classe UseCase encapsula uma única operação de negócio.
 * - DIP: dependem exclusivamente das interfaces ITransactionRepository, IOpenFinanceRepository e IPixGatewayRepository.
 */

import {
  type Either,
  type Failure,
  type IUseCase,
  type InstitutionCode,
  type NoParams,
  ValidationFailure,
  left,
  right,
} from '@/core';
import type { BankAccount } from '../entities/bank-account.entity';
import {
  type DashboardSummary,
  PierreFinancialEngine,
} from '../entities/financial-insight.entity';
import type { OpenFinanceSyncReport } from '../entities/financial-primitives';
import {
  type PixChargeEntity,
  PixKeyValidator,
  type PixTransferReceipt,
  type PixTransferRequest,
} from '../entities/pix-operation.entity';
import {
  Transaction,
  type TransactionProps,
} from '../entities/transaction.entity';
import type {
  IOpenFinanceRepository,
  IPixGatewayRepository,
  ITransactionRepository,
  TransactionFilterCriteria,
} from '../repositories/repositories';

export interface DashboardSnapshot {
  readonly accounts: readonly BankAccount[];
  readonly transactions: readonly Transaction[];
  readonly summary: DashboardSummary;
}

/**
 * 1. GetDashboardSnapshotUseCase — Carrega contas Open Finance, transações e calcula os insights estilo Pierre.
 */
export class GetDashboardSnapshotUseCase
  implements IUseCase<DashboardSnapshot, NoParams>
{
  public constructor(
    private readonly _openFinanceRepo: IOpenFinanceRepository,
    private readonly _transactionRepo: ITransactionRepository,
  ) {}

  public async execute(
    _params: NoParams,
  ): Promise<Either<Failure, DashboardSnapshot>> {
    const accountsResult = await this._openFinanceRepo.getConnectedAccounts();
    if (accountsResult.isLeft()) {
      return left(accountsResult.value);
    }

    const transactionsResult = await this._transactionRepo.getTransactions();
    if (transactionsResult.isLeft()) {
      return left(transactionsResult.value);
    }

    const accounts = accountsResult.value;
    const transactions = transactionsResult.value;
    const summary = PierreFinancialEngine.buildDashboardSummary(
      accounts,
      transactions,
    );

    return right({
      accounts,
      transactions,
      summary,
    });
  }
}

/**
 * 2. SearchTransactionsUseCase — Filtra transações por texto, categoria, instituição ou recorrência
 * (inspirado diretamente em SearchMedia do App_Nasa).
 */
export class SearchTransactionsUseCase
  implements IUseCase<readonly Transaction[], TransactionFilterCriteria>
{
  public constructor(
    private readonly _transactionRepo: ITransactionRepository,
  ) {}

  public async execute(
    params: TransactionFilterCriteria,
  ): Promise<Either<Failure, readonly Transaction[]>> {
    return this._transactionRepo.searchTransactions(params);
  }
}

/**
 * 3. CreateTransactionUseCase — Valida regras de negócio via Transaction.validateProps antes de persistir.
 */
export class CreateTransactionUseCase
  implements IUseCase<Transaction, TransactionProps>
{
  public constructor(
    private readonly _transactionRepo: ITransactionRepository,
  ) {}

  public async execute(
    params: TransactionProps,
  ): Promise<Either<Failure, Transaction>> {
    const validation = Transaction.validateProps(params);
    if (validation.isLeft()) {
      return left(validation.value);
    }
    return this._transactionRepo.addTransaction(params);
  }
}

/**
 * 4. SyncOpenFinanceInstitutionUseCase — Sincroniza uma instituição via Open Finance.
 */
export class SyncOpenFinanceInstitutionUseCase
  implements IUseCase<OpenFinanceSyncReport, InstitutionCode>
{
  public constructor(
    private readonly _openFinanceRepo: IOpenFinanceRepository,
  ) {}

  public async execute(
    institution: InstitutionCode,
  ): Promise<Either<Failure, OpenFinanceSyncReport>> {
    return this._openFinanceRepo.syncInstitution(institution);
  }
}

/**
 * 5. ToggleOpenFinanceConsentUseCase — Revoga ou renova o consentimento Open Finance de uma conta.
 */
export interface ToggleConsentParams {
  readonly accountId: string;
  readonly authorize: boolean;
}

export class ToggleOpenFinanceConsentUseCase
  implements IUseCase<BankAccount, ToggleConsentParams>
{
  public constructor(
    private readonly _openFinanceRepo: IOpenFinanceRepository,
  ) {}

  public async execute(
    params: ToggleConsentParams,
  ): Promise<Either<Failure, BankAccount>> {
    return this._openFinanceRepo.toggleConsent(
      params.accountId,
      params.authorize,
    );
  }
}

/**
 * 6. CreatePixChargeUseCase — Gera cobrança PIX (QR Code EMV) via gateway Asaas / Sandbox.
 */
export interface CreatePixChargeParams {
  readonly amount: number;
  readonly description: string;
}

export class CreatePixChargeUseCase
  implements IUseCase<PixChargeEntity, CreatePixChargeParams>
{
  public constructor(
    private readonly _pixGatewayRepo: IPixGatewayRepository,
  ) {}

  public async execute(
    params: CreatePixChargeParams,
  ): Promise<Either<Failure, PixChargeEntity>> {
    if (!Number.isFinite(params.amount) || params.amount < 1) {
      return left(
        new ValidationFailure(
          'O valor mínimo para geração de QR Code PIX é R$ 1,00.',
          'amount',
        ),
      );
    }
    if (!params.description || params.description.trim().length < 3) {
      return left(
        new ValidationFailure(
          'Informe uma descrição com pelo menos 3 caracteres para a cobrança PIX.',
          'description',
        ),
      );
    }
    return this._pixGatewayRepo.createPixCharge(
      params.amount,
      params.description.trim(),
    );
  }
}

/**
 * 7. ExecutePixTransferUseCase — Valida chave PIX exaustivamente, transfere via gateway e registra o lançamento.
 */
export class ExecutePixTransferUseCase
  implements IUseCase<PixTransferReceipt, PixTransferRequest>
{
  public constructor(
    private readonly _pixGatewayRepo: IPixGatewayRepository,
    private readonly _transactionRepo: ITransactionRepository,
  ) {}

  public async execute(
    request: PixTransferRequest,
  ): Promise<Either<Failure, PixTransferReceipt>> {
    if (!Number.isFinite(request.amount) || request.amount <= 0) {
      return left(
        new ValidationFailure(
          'O valor da transferência PIX deve ser maior que zero.',
          'amount',
        ),
      );
    }

    const keyValidation = PixKeyValidator.validate(
      request.pixKeyType,
      request.pixKey,
    );
    if (keyValidation.isLeft()) {
      return left(keyValidation.value);
    }

    const sanitizedRequest: PixTransferRequest = {
      ...request,
      pixKey: keyValidation.value,
      recipientName: request.recipientName.trim() || 'Destinatário PIX',
    };

    const receiptResult =
      await this._pixGatewayRepo.executePixTransfer(sanitizedRequest);
    if (receiptResult.isLeft()) {
      return left(receiptResult.value);
    }

    const receipt = receiptResult.value;
    await this._transactionRepo.addTransaction({
      id: receipt.transferId,
      title: `PIX enviado • ${receipt.recipientName}`,
      amount: receipt.amount,
      type: 'PIX_TRANSFER',
      category: (await import('@/core')).TransactionCategory.PIX,
      institution: (await import('@/core')).InstitutionCode.ASAAS,
      dateIso: receipt.processedAtIso.slice(0, 10),
      merchantName: receipt.recipientName,
      tags: ['pix', receipt.pixKeyType.toLowerCase()],
    });

    return right(receipt);
  }
}

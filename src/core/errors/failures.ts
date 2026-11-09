/**
 * Hierarquia de falhas do domínio (inspirada em core/lib/src/errors/failures.dart do App_Nasa).
 *
 * Competências TypeScript e SOLID demonstradas:
 * - Tipos literais e uniões (FailureCode, FailureSeverity)
 * - Classes abstratas e herança (OCP e LSP do SOLID)
 * - Encapsulamento e visibilidade (private, protected, public, readonly)
 * - Membros estáticos (contador de telemetria de falhas em sessão)
 * - Modificador explícito override (validado por noImplicitOverride no tsconfig.json)
 */

export type FailureCode =
  | 'VALIDATION_ERROR'
  | 'OPEN_FINANCE_ERROR'
  | 'PIX_GATEWAY_ERROR'
  | 'STORAGE_ERROR'
  | 'NETWORK_ERROR'
  | 'UNEXPECTED_ERROR';

export type FailureSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export abstract class Failure {
  private static _totalOccurrences = 0;

  public readonly timestamp: Date;

  protected constructor(
    public readonly code: FailureCode,
    public readonly message: string,
    public readonly severity: FailureSeverity = 'MEDIUM',
    protected readonly metadata?: Readonly<Record<string, unknown>>,
  ) {
    this.timestamp = new Date();
    Failure._totalOccurrences += 1;
  }

  public static get totalOccurrences(): number {
    return Failure._totalOccurrences;
  }

  public static resetOccurrences(): void {
    Failure._totalOccurrences = 0;
  }

  public getMetadata(): Readonly<Record<string, unknown>> | undefined {
    return this.metadata;
  }

  public toSummary(): string {
    return `[${this.code}] (${this.severity}): ${this.message}`;
  }
}

export class ValidationFailure extends Failure {
  public readonly fieldName?: string;

  public constructor(message: string, fieldName?: string) {
    super(
      'VALIDATION_ERROR',
      message,
      'LOW',
      fieldName ? { fieldName } : undefined,
    );
    this.fieldName = fieldName;
  }

  public override toSummary(): string {
    const prefix = this.fieldName ? `Campo "${this.fieldName}": ` : '';
    return `[${this.code}] ${prefix}${this.message}`;
  }
}

export class OpenFinanceFailure extends Failure {
  public readonly institutionCode?: string;

  public constructor(message: string, institutionCode?: string) {
    super(
      'OPEN_FINANCE_ERROR',
      message,
      'MEDIUM',
      institutionCode ? { institutionCode } : undefined,
    );
    this.institutionCode = institutionCode;
  }
}

export class PixGatewayFailure extends Failure {
  public readonly gatewayProvider: 'ASAAS' | 'SANDBOX_MOCK';

  public constructor(
    message: string,
    gatewayProvider: 'ASAAS' | 'SANDBOX_MOCK' = 'SANDBOX_MOCK',
  ) {
    super('PIX_GATEWAY_ERROR', message, 'HIGH', { gatewayProvider });
    this.gatewayProvider = gatewayProvider;
  }
}

export class StorageFailure extends Failure {
  public constructor(message = 'Falha ao acessar armazenamento local.') {
    super('STORAGE_ERROR', message, 'MEDIUM');
  }
}

export class NetworkFailure extends Failure {
  public constructor(message = 'Sem conexão de rede disponível.') {
    super('NETWORK_ERROR', message, 'MEDIUM');
  }
}

export class UnexpectedFailure extends Failure {
  public constructor(message = 'Erro inesperado ao processar operação.') {
    super('UNEXPECTED_ERROR', message, 'HIGH');
  }
}

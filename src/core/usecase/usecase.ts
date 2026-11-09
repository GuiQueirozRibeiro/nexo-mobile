/**
 * Contrato genérico de Caso de Uso (inspirado em core/lib/src/usecase/i_usecase.dart do App_Nasa).
 *
 * Princípios SOLID aplicados:
 * - S (Single Responsibility): cada UseCase executa uma única regra de negócio.
 * - I (Interface Segregation): contrato enxuto com um único método execute.
 * - D (Dependency Inversion): a camada de apresentação depende de IUseCase, não de detalhes de dados.
 */

import type { Either } from '../either/either';
import type { Failure } from '../errors/failures';

export interface IUseCase<SuccessType, Params> {
  execute(params: Params): Promise<Either<Failure, SuccessType>>;
}

export interface ISyncUseCase<SuccessType, Params> {
  execute(params: Params): Either<Failure, SuccessType>;
}

/**
 * Classe utilitária para UseCases que não exigem parâmetros de entrada
 * (equivalente a core/lib/src/usecase/no_params.dart no App_Nasa).
 * Demonstra uso de construtor privado e membro estático readonly (Singleton).
 */
export class NoParams {
  private static readonly _instance = new NoParams();

  private constructor() {}

  public static get instance(): NoParams {
    return NoParams._instance;
  }
}

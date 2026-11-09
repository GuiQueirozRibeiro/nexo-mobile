/**
 * Implementação funcional genérica Either<L, R> inspirada no pacote fpdart
 * utilizado no projeto de referência App_Nasa (Clean Architecture).
 *
 * Convenção:
 * - L (Left): representa falha de domínio/infraestrutura (ex.: Failure)
 * - R (Right): representa o valor de sucesso da operação
 *
 * Competências TypeScript demonstradas:
 * - Generics reutilizáveis (<L, R>, <T>, <U>) preservando tipos de ponta a ponta
 * - Classes com imutabilidade (readonly) e métodos polimórficos
 * - Type Predicate / Type Guards (this is Left<L, R> / this is Right<L, R>)
 * - Tipagem de funções de ordem superior (fold, map, flatMap)
 */

export type Either<L, R> = Left<L, R> | Right<L, R>;

export type FoldCallback<Input, Output> = (value: Input) => Output;

export class Left<L, R = never> {
  public readonly tag = 'Left' as const;

  public constructor(public readonly value: L) {}

  public isLeft(): this is Left<L, R> {
    return true;
  }

  public isRight(): this is Right<L, R> {
    return false;
  }

  public fold<T>(onLeft: FoldCallback<L, T>, _onRight: FoldCallback<R, T>): T {
    return onLeft(this.value);
  }

  public map<U>(_fn: (right: R) => U): Either<L, U> {
    return new Left<L, U>(this.value);
  }

  public getOrElse(fallback: R): R {
    return fallback;
  }
}

export class Right<L, R> {
  public readonly tag = 'Right' as const;

  public constructor(public readonly value: R) {}

  public isLeft(): this is Left<L, R> {
    return false;
  }

  public isRight(): this is Right<L, R> {
    return true;
  }

  public fold<T>(_onLeft: FoldCallback<L, T>, onRight: FoldCallback<R, T>): T {
    return onRight(this.value);
  }

  public map<U>(fn: (right: R) => U): Either<L, U> {
    return new Right<L, U>(fn(this.value));
  }

  public getOrElse(_fallback: R): R {
    return this.value;
  }
}

export function left<L, R = never>(value: L): Either<L, R> {
  return new Left<L, R>(value);
}

export function right<R, L = never>(value: R): Either<L, R> {
  return new Right<L, R>(value);
}

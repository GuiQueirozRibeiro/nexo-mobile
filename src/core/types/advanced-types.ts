/**
 * Operadores de tipo, Type Guards para unknown, Mapped Types, Conditional Types
 * e Validação de Exaustividade (never).
 *
 * Competências da Rubrica contempladas (Seção 3 — Abstração e Reuso com Tipos):
 * 3.1 Controle de any e tratamento seguro de unknown com Type Guards
 * 3.2 Operadores keyof, typeof e asserções seguras
 * 3.3 Generics reutilizáveis preservando tipos
 * 3.4 Mapped Types, Conditional Types e validação de exaustividade (assertNever)
 */

import { type Either, left, right } from '../either/either';
import { ValidationFailure, type Failure } from '../errors/failures';

/**
 * Validação de exaustividade em tempo de compilação e execução.
 * Quando todos os membros de uma união ou enum são tratados em um switch/if,
 * o TypeScript estreita o tipo restante para `never`. Se um novo membro for
 * adicionado no futuro e esquecido no switch, o compilador acusa erro imediato.
 */
export function assertNever(value: never, context = 'Valor não tratado'): never {
  throw new Error(`${context}: ${String(value)}`);
}

/**
 * Type Guard seguro para refinar `unknown` em um objeto indexável,
 * evitando completamente o uso de `any`.
 */
export function isPlainRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type Guard genérico para verificar se uma propriedade existe e é string.
 */
export function hasStringField<K extends string>(
  record: Record<string, unknown>,
  key: K,
): record is Record<K, string> & Record<string, unknown> {
  return typeof record[key] === 'string';
}

/**
 * Type Guard genérico para verificar se uma propriedade existe e é número finito.
 */
export function hasNumberField<K extends string>(
  record: Record<string, unknown>,
  key: K,
): record is Record<K, number> & Record<string, unknown> {
  return typeof record[key] === 'number' && Number.isFinite(record[key]);
}

/**
 * Faz o parse seguro de uma string JSON retornando `Either<Failure, unknown>`
 * em vez de `any` (comportamento padrão do JSON.parse).
 */
export function safeJsonParse(rawJson: string): Either<Failure, unknown> {
  try {
    const parsed: unknown = JSON.parse(rawJson);
    return right(parsed);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'JSON inválido';
    return left(new ValidationFailure(`Falha ao decodificar JSON: ${detail}`));
  }
}

/**
 * Uso explícito de `keyof` com Generics para leitura segura de propriedades.
 */
export function getPropertyByKey<T extends object, K extends keyof T>(
  target: T,
  key: K,
): T[K] {
  return target[key];
}

/**
 * Uso combinado de `keyof`, arrays readonly e asserção segura para projetar
 * um subconjunto tipado (`Pick<T, K>`) de um objeto de domínio.
 */
export function pickObjectKeys<T extends object, K extends keyof T>(
  source: T,
  keys: readonly K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in source) {
      result[key] = source[key];
    }
  }
  return result;
}

/**
 * MAPPED TYPE 1: DeepReadonly<T>
 * Transforma recursivamente todas as propriedades de um objeto ou array em readonly,
 * garantindo imutabilidade de configurações de Flavor e snapshots de estado.
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object
    ? T[P] extends (...args: never[]) => unknown
      ? T[P]
      : DeepReadonly<T[P]>
    : T[P];
};

/**
 * MAPPED TYPE 2: EntityPatch<T>
 * Preserva o `id` como obrigatório ereadonly e torna os demais campos opcionais,
 * ideal para operações de atualização parcial (`copyWith` / patch de transações).
 */
export type EntityPatch<T extends { id: string }> = {
  readonly id: T['id'];
} & {
  [P in Exclude<keyof T, 'id'>]?: T[P];
};

/**
 * MAPPED TYPE 3: FieldValidationMap<T>
 * Mapeia cada propriedade de um contrato de formulário `T` para uma mensagem de erro
 * (`string | null`), mantendo sincronia automática com a interface original.
 */
export type FieldValidationMap<T extends object> = {
  [P in keyof T]-?: string | null;
};

/**
 * CONDITIONAL TYPE 1: UnwrapEitherSuccess<T>
 * Extrai automaticamente o tipo de sucesso `R` de um `Either<L, R>` ou `Promise<Either<L, R>>`.
 */
export type UnwrapEitherSuccess<T> =
  T extends Promise<Either<unknown, infer R>>
    ? R
    : T extends Either<unknown, infer R>
      ? R
      : never;

/**
 * CONDITIONAL TYPE 2: UnwrapEitherFailure<T>
 * Extrai automaticamente o tipo de falha `L` de um `Either<L, R>`.
 */
export type UnwrapEitherFailure<T> =
  T extends Either<infer L, unknown> ? L : never;

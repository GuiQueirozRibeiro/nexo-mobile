/**
 * Enums de domínio e infraestrutura com funções de mapeamento exaustivas
 * (inspirados em core/lib/src/enums/media_type.dart do App_Nasa).
 *
 * Competências TypeScript demonstradas:
 * - Enums nomeados (Rubrica 4.3)
 * - Validação de exaustividade com assertNever (Rubrica 3.4)
 * - Operador typeof sobre objetos constantes de configuração (Rubrica 3.2)
 */

import { assertNever } from '../types/advanced-types';

/**
 * Ambiente de execução (Flavors inspirados no sette_one_crm e App_Nasa).
 * - DEV: Usa simuladores determinísticos para Open Finance e PIX (ideal para testes locais e avaliação na Vercel sem credenciais).
 * - PROD: Conecta ao endpoint de integração Asaas (/api/asaas/pix) e motor de Open Finance.
 */
export enum AppFlavor {
  DEV = 'DEV',
  PROD = 'PROD',
}

/**
 * Preferência de tema visual persistida no localStorage (Claro, Escuro ou Sistema).
 */
export enum ThemeMode {
  SYSTEM = 'SYSTEM',
  DARK = 'DARK',
  LIGHT = 'LIGHT',
}

export type ResolvedTheme = 'dark' | 'light';

export function getThemeModeLabel(mode: ThemeMode): string {
  switch (mode) {
    case ThemeMode.SYSTEM:
      return 'Sistema';
    case ThemeMode.DARK:
      return 'Escuro';
    case ThemeMode.LIGHT:
      return 'Claro';
    default:
      return assertNever(mode, 'Modo de tema desconhecido');
  }
}

/**
 * Categorias financeiras monitoradas pelo assistente inteligente do Nexo (estilo Pierre).
 */
export enum TransactionCategory {
  HOUSING = 'HOUSING',
  FOOD = 'FOOD',
  TRANSPORT = 'TRANSPORT',
  SUBSCRIPTIONS = 'SUBSCRIPTIONS',
  HEALTH = 'HEALTH',
  SALARY = 'SALARY',
  INVESTMENTS = 'INVESTMENTS',
  PIX = 'PIX',
}

/**
 * Instituições participantes do ecossistema Open Finance + Gateway PIX.
 */
export enum InstitutionCode {
  NUBANK = 'NUBANK',
  ITAU = 'ITAU',
  INTER = 'INTER',
  BRADESCO = 'BRADESCO',
  ASAAS = 'ASAAS',
}

/**
 * Objeto constante com metadados de categorias para demonstrar o operador `typeof` e `keyof`.
 */
export const CATEGORY_METADATA = {
  [TransactionCategory.HOUSING]: {
    label: 'Moradia & Contas',
    colorHex: '#185054',
    isEssential: true,
  },
  [TransactionCategory.FOOD]: {
    label: 'Alimentação & Delivery',
    colorHex: '#ef5000',
    isEssential: true,
  },
  [TransactionCategory.TRANSPORT]: {
    label: 'Mobilidade & Uber',
    colorHex: '#004fff',
    isEssential: true,
  },
  [TransactionCategory.SUBSCRIPTIONS]: {
    label: 'Assinaturas & Streaming',
    colorHex: '#8baba6',
    isEssential: false,
  },
  [TransactionCategory.HEALTH]: {
    label: 'Saúde & Bem-estar',
    colorHex: '#0df0b2',
    isEssential: true,
  },
  [TransactionCategory.SALARY]: {
    label: 'Receita & Salário',
    colorHex: '#0df0b2',
    isEssential: false,
  },
  [TransactionCategory.INVESTMENTS]: {
    label: 'Investimentos & CDB',
    colorHex: '#9cafc6',
    isEssential: false,
  },
  [TransactionCategory.PIX]: {
    label: 'Transferências PIX',
    colorHex: '#0df0b2',
    isEssential: false,
  },
} as const;

export type CategoryMetadataMap = typeof CATEGORY_METADATA;
export type CategoryMetadataEntry =
  CategoryMetadataMap[keyof CategoryMetadataMap];

/**
 * Retorna o rótulo legível da categoria usando switch exaustivo com `assertNever`
 * (equivalente ao `MediaTypeExtension.toDatabaseString()` no App_Nasa).
 */
export function getCategoryLabel(category: TransactionCategory): string {
  switch (category) {
    case TransactionCategory.HOUSING:
      return CATEGORY_METADATA[TransactionCategory.HOUSING].label;
    case TransactionCategory.FOOD:
      return CATEGORY_METADATA[TransactionCategory.FOOD].label;
    case TransactionCategory.TRANSPORT:
      return CATEGORY_METADATA[TransactionCategory.TRANSPORT].label;
    case TransactionCategory.SUBSCRIPTIONS:
      return CATEGORY_METADATA[TransactionCategory.SUBSCRIPTIONS].label;
    case TransactionCategory.HEALTH:
      return CATEGORY_METADATA[TransactionCategory.HEALTH].label;
    case TransactionCategory.SALARY:
      return CATEGORY_METADATA[TransactionCategory.SALARY].label;
    case TransactionCategory.INVESTMENTS:
      return CATEGORY_METADATA[TransactionCategory.INVESTMENTS].label;
    case TransactionCategory.PIX:
      return CATEGORY_METADATA[TransactionCategory.PIX].label;
    default:
      return assertNever(category, 'Categoria financeira desconhecida');
  }
}

/**
 * Mapeia uma string externa para `TransactionCategory` de forma segura.
 */
export function parseTransactionCategory(
  rawCategory: string,
): TransactionCategory {
  const normalized = rawCategory.trim().toUpperCase();
  switch (normalized) {
    case 'HOUSING':
      return TransactionCategory.HOUSING;
    case 'FOOD':
      return TransactionCategory.FOOD;
    case 'TRANSPORT':
      return TransactionCategory.TRANSPORT;
    case 'SUBSCRIPTIONS':
      return TransactionCategory.SUBSCRIPTIONS;
    case 'HEALTH':
      return TransactionCategory.HEALTH;
    case 'SALARY':
      return TransactionCategory.SALARY;
    case 'INVESTMENTS':
      return TransactionCategory.INVESTMENTS;
    case 'PIX':
      return TransactionCategory.PIX;
    default:
      return TransactionCategory.PIX;
  }
}

/**
 * Retorna o nome oficial da instituição financeira com verificação de exaustividade.
 */
export function getInstitutionDisplayName(code: InstitutionCode): string {
  switch (code) {
    case InstitutionCode.NUBANK:
      return 'Nu Pagamentos S.A. (Nubank)';
    case InstitutionCode.ITAU:
      return 'Itaú Unibanco S.A.';
    case InstitutionCode.INTER:
      return 'Banco Inter S.A.';
    case InstitutionCode.BRADESCO:
      return 'Banco Bradesco S.A.';
    case InstitutionCode.ASAAS:
      return 'Asaas IP S.A. (Conta Digital PIX)';
    default:
      return assertNever(code, 'Instituição financeira não suportada');
  }
}

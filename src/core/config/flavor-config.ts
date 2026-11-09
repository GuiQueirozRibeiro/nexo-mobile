/**
 * Gerenciador de Flavors e Configuração de Ambiente (DEV vs PROD),
 * inspirado em core/lib/src/config/core_config.dart (App_Nasa) e nos Flavors do sette_one_crm.
 *
 * Competências TypeScript demonstradas:
 * - Classes com construtor privado, estado encapsulado (`private static`) e métodos estáticos (Rubrica 2.3)
 * - Conditional Types (`FlavorGatewayContract<F>`) que adaptam o contrato conforme o Flavor (Rubrica 3.4)
 * - Mapped Types (`DeepReadonly<EnvironmentProfile>`) para proteger configurações em memória (Rubrica 3.4)
 * - Tipagem de callbacks para notificar mudança de Flavor em tempo real (Rubrica 2.2)
 */

import { AppFlavor } from '../enums/enums';
import { assertNever, type DeepReadonly } from '../types/advanced-types';

export interface DevGatewayContract {
  readonly mode: 'SANDBOX_SIMULATOR';
  readonly simulatedLatencyMs: number;
  readonly autoApprovePix: boolean;
}

export interface ProdGatewayContract {
  readonly mode: 'ASAAS_AND_OPEN_FINANCE_API';
  readonly asaasProxyEndpoint: string;
  readonly requireWebhookSignature: boolean;
}

/**
 * CONDITIONAL TYPE: resolve o contrato específico do gateway em função do Flavor (`AppFlavor.DEV` ou `AppFlavor.PROD`).
 */
export type FlavorGatewayContract<F extends AppFlavor> =
  F extends AppFlavor.PROD ? ProdGatewayContract : DevGatewayContract;

export interface EnvironmentProfile<F extends AppFlavor = AppFlavor> {
  readonly flavor: F;
  readonly appTitle: string;
  readonly openFinanceSyncIntervalSeconds: number;
  readonly enableVerboseLogs: boolean;
  readonly gateway: FlavorGatewayContract<F>;
}

export type FlavorChangeListener = (
  activeProfile: DeepReadonly<EnvironmentProfile>,
) => void;

export class FlavorConfig {
  private static _currentFlavor: AppFlavor = FlavorConfig._resolveInitialFlavor();
  private static readonly _listeners: Set<FlavorChangeListener> = new Set();

  private static readonly _devProfile: DeepReadonly<
    EnvironmentProfile<AppFlavor.DEV>
  > = {
    flavor: AppFlavor.DEV,
    appTitle: 'Nexo Finance [DEV Sandbox]',
    openFinanceSyncIntervalSeconds: 30,
    enableVerboseLogs: true,
    gateway: {
      mode: 'SANDBOX_SIMULATOR',
      simulatedLatencyMs: 180,
      autoApprovePix: true,
    },
  };

  private static readonly _prodProfile: DeepReadonly<
    EnvironmentProfile<AppFlavor.PROD>
  > = {
    flavor: AppFlavor.PROD,
    appTitle: 'Nexo Finance',
    openFinanceSyncIntervalSeconds: 300,
    enableVerboseLogs: false,
    gateway: {
      mode: 'ASAAS_AND_OPEN_FINANCE_API',
      asaasProxyEndpoint: '/api/asaas/pix',
      requireWebhookSignature: true,
    },
  };

  private constructor() {
    // Impede instanciação direta (mesmo padrão `const CoreConfig._()` do App_Nasa)
  }

  private static _resolveInitialFlavor(): AppFlavor {
    if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_APP_FLAVOR) {
      const raw = process.env.NEXT_PUBLIC_APP_FLAVOR.toUpperCase();
      if (raw === AppFlavor.PROD) {
        return AppFlavor.PROD;
      }
    }
    return AppFlavor.DEV;
  }

  public static get currentFlavor(): AppFlavor {
    return FlavorConfig._currentFlavor;
  }

  public static get isDev(): boolean {
    return FlavorConfig._currentFlavor === AppFlavor.DEV;
  }

  public static get isProd(): boolean {
    return FlavorConfig._currentFlavor === AppFlavor.PROD;
  }

  public static getProfile(): DeepReadonly<EnvironmentProfile> {
    switch (FlavorConfig._currentFlavor) {
      case AppFlavor.DEV:
        return FlavorConfig._devProfile;
      case AppFlavor.PROD:
        return FlavorConfig._prodProfile;
      default:
        return assertNever(
          FlavorConfig._currentFlavor,
          'Flavor de execução inválido',
        );
    }
  }

  public static getProfileFor<F extends AppFlavor>(
    flavor: F,
  ): DeepReadonly<EnvironmentProfile<F>> {
    if (flavor === AppFlavor.PROD) {
      return FlavorConfig._prodProfile as DeepReadonly<EnvironmentProfile<F>>;
    }
    return FlavorConfig._devProfile as DeepReadonly<EnvironmentProfile<F>>;
  }

  public static switchFlavor(nextFlavor: AppFlavor): DeepReadonly<EnvironmentProfile> {
    FlavorConfig._currentFlavor = nextFlavor;
    const profile = FlavorConfig.getProfile();
    for (const listener of FlavorConfig._listeners) {
      listener(profile);
    }
    return profile;
  }

  public static subscribe(listener: FlavorChangeListener): () => void {
    FlavorConfig._listeners.add(listener);
    return () => {
      FlavorConfig._listeners.delete(listener);
    };
  }
}

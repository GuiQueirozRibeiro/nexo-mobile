/**
 * Verificador de conectividade de rede (inspirado em core/lib/src/network/connection_checker.dart do App_Nasa).
 * Permite aos Repositories alternarem de forma transparente entre fonte remota e cache local.
 */

export interface IConnectionChecker {
  isConnected(): Promise<boolean>;
}

export class BrowserConnectionChecker implements IConnectionChecker {
  private readonly _forcedState?: boolean;

  public constructor(forcedState?: boolean) {
    this._forcedState = forcedState;
  }

  public async isConnected(): Promise<boolean> {
    if (typeof this._forcedState === 'boolean') {
      return this._forcedState;
    }
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return true;
  }
}

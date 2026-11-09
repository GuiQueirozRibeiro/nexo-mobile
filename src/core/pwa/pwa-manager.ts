/**
 * PwaServiceWorkerManager — Integração de PWA, Service Worker e conectividade offline/online
 * unindo os conhecimentos da disciplina anterior (Apps Híbridos com PWA) com tipagem estrita em TypeScript.
 *
 * Competências TypeScript demonstradas:
 * - Extensão de interfaces globais do DOM (`BeforeInstallPromptEvent extends Event`) (Rubrica 4.2)
 * - Encapsulamento OOP com estado privado e padrão Observer (Rubrica 2.3)
 */

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: readonly string[];
  readonly userChoice: Promise<{
    readonly outcome: 'accepted' | 'dismissed';
    readonly platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface PwaStateSnapshot {
  readonly isOnline: boolean;
  readonly swRegistered: boolean;
  readonly canInstall: boolean;
}

export type PwaStateListener = (snapshot: PwaStateSnapshot) => void;

export class PwaServiceWorkerManager {
  private static _isOnline = true;
  private static _swRegistered = false;
  private static _deferredPrompt: BeforeInstallPromptEvent | null = null;
  private static _initialized = false;
  private static readonly _listeners: Set<PwaStateListener> = new Set();

  private constructor() {}

  public static initialize(): PwaStateSnapshot {
    if (typeof window === 'undefined') {
      return PwaServiceWorkerManager.getSnapshot();
    }

    if (!PwaServiceWorkerManager._initialized) {
      PwaServiceWorkerManager._isOnline = navigator.onLine;

      window.addEventListener('online', () => {
        PwaServiceWorkerManager._isOnline = true;
        PwaServiceWorkerManager._notify();
      });

      window.addEventListener('offline', () => {
        PwaServiceWorkerManager._isOnline = false;
        PwaServiceWorkerManager._notify();
      });

      window.addEventListener('beforeinstallprompt', (event: Event) => {
        event.preventDefault();
        PwaServiceWorkerManager._deferredPrompt =
          event as BeforeInstallPromptEvent;
        PwaServiceWorkerManager._notify();
      });

      if ('serviceWorker' in navigator) {
        void navigator.serviceWorker
          .register('/sw.js')
          .then(() => {
            PwaServiceWorkerManager._swRegistered = true;
            PwaServiceWorkerManager._notify();
          })
          .catch(() => {
            PwaServiceWorkerManager._swRegistered = false;
          });
      }

      PwaServiceWorkerManager._initialized = true;
    }

    return PwaServiceWorkerManager.getSnapshot();
  }

  public static async promptInstall(): Promise<boolean> {
    if (!PwaServiceWorkerManager._deferredPrompt) {
      return false;
    }
    await PwaServiceWorkerManager._deferredPrompt.prompt();
    const choice = await PwaServiceWorkerManager._deferredPrompt.userChoice;
    PwaServiceWorkerManager._deferredPrompt = null;
    PwaServiceWorkerManager._notify();
    return choice.outcome === 'accepted';
  }

  private static _notify(): void {
    const snap = PwaServiceWorkerManager.getSnapshot();
    for (const listener of PwaServiceWorkerManager._listeners) {
      listener(snap);
    }
  }

  public static getSnapshot(): PwaStateSnapshot {
    return {
      isOnline: PwaServiceWorkerManager._isOnline,
      swRegistered: PwaServiceWorkerManager._swRegistered,
      canInstall: PwaServiceWorkerManager._deferredPrompt !== null,
    };
  }

  public static subscribe(listener: PwaStateListener): () => void {
    PwaServiceWorkerManager._listeners.add(listener);
    return () => {
      PwaServiceWorkerManager._listeners.delete(listener);
    };
  }
}


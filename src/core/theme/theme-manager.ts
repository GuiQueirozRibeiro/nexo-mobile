/**
 * ThemeManager — Gerenciador Orientado a Objetos para Tema (Claro, Escuro e Sistema)
 * com persistência em localStorage e sincronização automática com `prefers-color-scheme`.
 *
 * Também resolve a logo oficial da Exímia Tech de acordo com o tema ativo:
 * - Tema Escuro (`dark`): `/EXIMIA-FAVICON2.png` (fundo preto, X afastado)
 * - Tema Claro (`light`): `/EXIMIA-FAVICON1.png` (fundo claro, X afastado)
 */

import { type ResolvedTheme, ThemeMode } from '../enums/enums';

export type LogoAssetPath = '/EXIMIA-FAVICON2.png' | '/EXIMIA-FAVICON1.png';

export interface ThemeSnapshot {
  readonly mode: ThemeMode;
  readonly resolved: ResolvedTheme;
  readonly logoPath: LogoAssetPath;
}

export type ThemeChangeListener = (snapshot: ThemeSnapshot) => void;

const THEME_STORAGE_KEY = 'nexo_theme_preference_v1';

export class ThemeManager {
  private static _mode: ThemeMode = ThemeMode.DARK;
  private static _resolved: ResolvedTheme = 'dark';
  private static _initialized = false;
  private static readonly _listeners: Set<ThemeChangeListener> = new Set();

  private constructor() {}

  public static initialize(): ThemeSnapshot {
    if (typeof window === 'undefined') {
      return ThemeManager.getSnapshot();
    }

    if (!ThemeManager._initialized) {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (
        saved === ThemeMode.LIGHT ||
        saved === ThemeMode.DARK ||
        saved === ThemeMode.SYSTEM
      ) {
        ThemeManager._mode = saved;
      } else {
        ThemeManager._mode = ThemeMode.SYSTEM;
      }

      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', () => {
        if (ThemeManager._mode === ThemeMode.SYSTEM) {
          ThemeManager._applyTheme();
        }
      });

      ThemeManager._initialized = true;
    }

    ThemeManager._applyTheme();
    return ThemeManager.getSnapshot();
  }

  private static _resolveSystemTheme(): ResolvedTheme {
    if (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function'
    ) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return 'dark';
  }

  private static _applyTheme(): void {
    const resolved: ResolvedTheme =
      ThemeManager._mode === ThemeMode.SYSTEM
        ? ThemeManager._resolveSystemTheme()
        : ThemeManager._mode === ThemeMode.LIGHT
          ? 'light'
          : 'dark';

    ThemeManager._resolved = resolved;

    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', resolved);
      document.documentElement.style.colorScheme = resolved;
    }

    const snapshot = ThemeManager.getSnapshot();
    for (const listener of ThemeManager._listeners) {
      listener(snapshot);
    }
  }

  public static setMode(nextMode: ThemeMode): ThemeSnapshot {
    ThemeManager._mode = nextMode;
    if (
      typeof window !== 'undefined' &&
      typeof window.localStorage !== 'undefined'
    ) {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextMode);
    }
    ThemeManager._applyTheme();
    return ThemeManager.getSnapshot();
  }

  public static getLogoForTheme(theme: ResolvedTheme): LogoAssetPath {
    return theme === 'light' ? '/EXIMIA-FAVICON1.png' : '/EXIMIA-FAVICON2.png';
  }

  public static getSnapshot(): ThemeSnapshot {
    return {
      mode: ThemeManager._mode,
      resolved: ThemeManager._resolved,
      logoPath: ThemeManager.getLogoForTheme(ThemeManager._resolved),
    };
  }

  public static subscribe(listener: ThemeChangeListener): () => void {
    ThemeManager._listeners.add(listener);
    return () => {
      ThemeManager._listeners.delete(listener);
    };
  }
}


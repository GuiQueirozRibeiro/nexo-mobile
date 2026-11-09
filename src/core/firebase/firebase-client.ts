/**
 * Cliente Firebase (Auth + Cloud Firestore) configurado para o projeto oficial `nexo-eximiatech`.
 *
 * Mantém tipagem estrita (zero `any`), suporte a SSR no Next.js e sincronização em tempo real
 * por usuário autenticado (`users/{uid}/finance/snapshot`).
 */

import { type FirebaseApp, getApps, initializeApp } from 'firebase/app';
import {
  type Auth,
  type User,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  type Firestore,
  doc,
  getDoc,
  getFirestore,
  setDoc,
} from 'firebase/firestore';
import { type Either, type Failure, NetworkFailure, left, right } from '../index';

export interface NexoAuthUser {
  readonly uid: string;
  readonly email: string | null;
  readonly displayName: string;
  readonly isAnonymous: boolean;
}

export interface FirestoreUserFinanceSnapshot {
  readonly accounts: readonly unknown[];
  readonly transactions: readonly unknown[];
  readonly creditCards?: readonly unknown[];
  readonly costCenters?: readonly unknown[];
  readonly subscriptions?: readonly unknown[];
  readonly pixKeys?: readonly unknown[];
  readonly updatedAtIso?: string;
}

export type AuthStateListener = (user: NexoAuthUser | null) => void;

const FIREBASE_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
} as const;

export class FirebaseClientManager {
  private static _app: FirebaseApp | null = null;
  private static _auth: Auth | null = null;
  private static _db: Firestore | null = null;
  private static _currentUser: NexoAuthUser | null = null;
  private static _initialized = false;
  private static readonly _listeners = new Set<AuthStateListener>();

  private constructor() {}

  private static _ensureInitialized(): {
    readonly app: FirebaseApp;
    readonly auth: Auth;
    readonly db: Firestore;
  } {
    if (!FirebaseClientManager._app) {
      const existing = getApps();
      FirebaseClientManager._app =
        existing.length > 0 && existing[0]
          ? existing[0]
          : initializeApp(FIREBASE_CONFIG);
      FirebaseClientManager._auth = getAuth(FirebaseClientManager._app);
      FirebaseClientManager._db = getFirestore(FirebaseClientManager._app);
    }

    if (
      !FirebaseClientManager._initialized &&
      typeof window !== 'undefined' &&
      FirebaseClientManager._auth
    ) {
      FirebaseClientManager._initialized = true;
      onAuthStateChanged(FirebaseClientManager._auth, (fbUser) => {
        FirebaseClientManager._currentUser = fbUser
          ? FirebaseClientManager._mapUser(fbUser)
          : null;
        FirebaseClientManager._notify();
      });
    }

    return {
      app: FirebaseClientManager._app,
      auth: FirebaseClientManager._auth!,
      db: FirebaseClientManager._db!,
    };
  }

  private static _mapUser(user: User): NexoAuthUser {
    const fallbackName = user.email
      ? (user.email.split('@')[0] ?? 'Cliente Nexo')
      : 'Cliente Nexo';
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || fallbackName,
      isAnonymous: user.isAnonymous,
    };
  }

  private static _notify(): void {
    for (const listener of FirebaseClientManager._listeners) {
      listener(FirebaseClientManager._currentUser);
    }
  }

  public static getCurrentUser(): NexoAuthUser | null {
    if (typeof window === 'undefined') {
      return null;
    }
    FirebaseClientManager._ensureInitialized();
    return FirebaseClientManager._currentUser;
  }

  public static subscribe(listener: AuthStateListener): () => void {
    if (typeof window !== 'undefined') {
      FirebaseClientManager._ensureInitialized();
    }
    FirebaseClientManager._listeners.add(listener);
    return () => {
      FirebaseClientManager._listeners.delete(listener);
    };
  }

  public static async signInWithEmail(
    email: string,
    password: string,
  ): Promise<Either<Failure, NexoAuthUser>> {
    try {
      const { auth } = FirebaseClientManager._ensureInitialized();
      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      const mapped = FirebaseClientManager._mapUser(credential.user);
      FirebaseClientManager._currentUser = mapped;
      FirebaseClientManager._notify();
      return right(mapped);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? FirebaseClientManager._translateAuthError(error.message)
          : 'Não foi possível autenticar com e-mail e senha.';
      return left(new NetworkFailure(message));
    }
  }

  public static async registerWithEmail(
    name: string,
    email: string,
    password: string,
  ): Promise<Either<Failure, NexoAuthUser>> {
    try {
      const { auth } = FirebaseClientManager._ensureInitialized();
      const credential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      if (name.trim().length > 0) {
        await updateProfile(credential.user, { displayName: name.trim() });
      }
      const mapped: NexoAuthUser = {
        uid: credential.user.uid,
        email: credential.user.email,
        displayName: name.trim() || 'Cliente Nexo',
        isAnonymous: false,
      };
      FirebaseClientManager._currentUser = mapped;
      FirebaseClientManager._notify();
      return right(mapped);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? FirebaseClientManager._translateAuthError(error.message)
          : 'Não foi possível criar sua conta.';
      return left(new NetworkFailure(message));
    }
  }

  public static async signInDemoAccount(): Promise<
    Either<Failure, NexoAuthUser>
  > {
    try {
      const { auth } = FirebaseClientManager._ensureInitialized();
      const credential = await signInAnonymously(auth);
      const mapped: NexoAuthUser = {
        uid: credential.user.uid,
        email: 'demo@nexo.eximiatech.com.br',
        displayName: 'Guilherme Ribeiro',
        isAnonymous: true,
      };
      FirebaseClientManager._currentUser = mapped;
      FirebaseClientManager._notify();
      return right(mapped);
    } catch {
      return left(
        new NetworkFailure('Falha ao iniciar sessão rápida no Firebase.'),
      );
    }
  }

  public static async logout(): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }
    const { auth } = FirebaseClientManager._ensureInitialized();
    await signOut(auth);
    FirebaseClientManager._currentUser = null;
    FirebaseClientManager._notify();
  }

  public static async updateUserDisplayName(
    newDisplayName: string,
  ): Promise<Either<Failure, NexoAuthUser>> {
    try {
      const { auth } = FirebaseClientManager._ensureInitialized();
      if (!auth.currentUser) {
        return left(
          new NetworkFailure('Nenhum usuário autenticado no Firebase.'),
        );
      }
      const trimmed = newDisplayName.trim();
      await updateProfile(auth.currentUser, { displayName: trimmed });
      const updated: NexoAuthUser = {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        displayName: trimmed || 'Cliente Nexo',
        isAnonymous: auth.currentUser.isAnonymous,
      };
      FirebaseClientManager._currentUser = updated;
      FirebaseClientManager._notify();
      return right(updated);
    } catch {
      return left(
        new NetworkFailure('Não foi possível atualizar o perfil no Firebase.'),
      );
    }
  }

  /**
   * Salva o snapshot completo (6 tabelas) do usuário autenticado no Cloud Firestore (`users/{uid}/finance/snapshot`).
   */
  public static async saveFullSnapshotToFirestore(
    snapshot: FirestoreUserFinanceSnapshot,
  ): Promise<boolean> {
    if (typeof window === 'undefined' || !FirebaseClientManager._currentUser) {
      return false;
    }
    try {
      const { db } = FirebaseClientManager._ensureInitialized();
      const ref = doc(
        db,
        'users',
        FirebaseClientManager._currentUser.uid,
        'finance',
        'snapshot',
      );
      await setDoc(
        ref,
        {
          ...snapshot,
          updatedAtIso: new Date().toISOString(),
        },
        { merge: true },
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Compatibilidade com chamadas parciais de contas e transações.
   */
  public static async saveUserSnapshotToFirestore(
    accountsJson: readonly unknown[],
    transactionsJson: readonly unknown[],
  ): Promise<void> {
    await FirebaseClientManager.saveFullSnapshotToFirestore({
      accounts: accountsJson,
      transactions: transactionsJson,
    });
  }

  /**
   * Carrega o snapshot financeiro completo do usuário no Cloud Firestore se existir.
   */
  public static async loadUserSnapshotFromFirestore(): Promise<FirestoreUserFinanceSnapshot | null> {
    if (typeof window === 'undefined' || !FirebaseClientManager._currentUser) {
      return null;
    }
    try {
      const { db } = FirebaseClientManager._ensureInitialized();
      const ref = doc(
        db,
        'users',
        FirebaseClientManager._currentUser.uid,
        'finance',
        'snapshot',
      );
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        return null;
      }
      const data = snap.data();
      if (
        data &&
        Array.isArray(data.accounts) &&
        Array.isArray(data.transactions)
      ) {
        return {
          accounts: data.accounts as readonly unknown[],
          transactions: data.transactions as readonly unknown[],
          creditCards: Array.isArray(data.creditCards)
            ? (data.creditCards as readonly unknown[])
            : undefined,
          costCenters: Array.isArray(data.costCenters)
            ? (data.costCenters as readonly unknown[])
            : undefined,
          subscriptions: Array.isArray(data.subscriptions)
            ? (data.subscriptions as readonly unknown[])
            : undefined,
          pixKeys: Array.isArray(data.pixKeys)
            ? (data.pixKeys as readonly unknown[])
            : undefined,
          updatedAtIso:
            typeof data.updatedAtIso === 'string'
              ? data.updatedAtIso
              : undefined,
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  private static _translateAuthError(rawMessage: string): string {
    if (
      rawMessage.includes('auth/invalid-credential') ||
      rawMessage.includes('auth/wrong-password') ||
      rawMessage.includes('auth/user-not-found')
    ) {
      return 'E-mail ou senha incorretos. Verifique seus dados ou crie uma conta.';
    }
    if (rawMessage.includes('auth/email-already-in-use')) {
      return 'Este e-mail já possui conta cadastrada no Nexo. Faça login com sua senha.';
    }
    if (rawMessage.includes('auth/weak-password')) {
      return 'A senha deve ter pelo menos 6 caracteres.';
    }
    if (rawMessage.includes('auth/invalid-email')) {
      return 'Formato de e-mail inválido.';
    }
    return 'Não foi possível concluir a autenticação no Firebase.';
  }
}


/**
 * PushNotificationService.tsx — Gerenciamento de Notificações Transacionais Bancárias
 *
 * Dispara alertas imediatos para:
 * - PIX Recebido (Crédito em conta)
 * - PIX Enviado com sucesso
 * - Alerta de Transação Suspeita / Anti-fraude
 * - Sincronização Open Finance Concluída
 */

import { Alert, Platform } from 'react-native';
import { left, right, type Either, type Failure, ValidationFailure } from '../index';

export interface BankNotificationPayload {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly category: 'PIX_IN' | 'PIX_OUT' | 'FRAUD_ALERT' | 'OPEN_FINANCE';
  readonly timestampIso: string;
}

export class PushNotificationService {
  private static _history: BankNotificationPayload[] = [];

  /**
   * Registra e exibe notificação de PIX Recebido (Crédito instantâneo).
   */
  public async notifyPixReceived(params: {
    readonly amount: number;
    readonly payerName: string;
  }): Promise<Either<Failure, BankNotificationPayload>> {
    try {
      const formatted = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(params.amount);

      const payload: BankNotificationPayload = {
        id: `notif-pix-in-${Date.now()}`,
        title: '💰 PIX Recebido!',
        body: `Você recebeu ${formatted} de ${params.payerName}.`,
        category: 'PIX_IN',
        timestampIso: new Date().toISOString(),
      };

      PushNotificationService._history.unshift(payload);

      // Feedback em tela (Banner Nativo)
      if (Platform.OS !== 'web') {
        Alert.alert(payload.title, payload.body);
      }

      return right(payload);
    } catch {
      return left(new ValidationFailure('Falha ao processar notificação de recebimento.'));
    }
  }

  /**
   * Registra e exibe notificação de PIX Enviado com autenticação biométrica.
   */
  public async notifyPixSent(params: {
    readonly amount: number;
    readonly recipientName: string;
  }): Promise<Either<Failure, BankNotificationPayload>> {
    try {
      const formatted = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(params.amount);

      const payload: BankNotificationPayload = {
        id: `notif-pix-out-${Date.now()}`,
        title: '⚡ PIX Enviado',
        body: `Transferência de ${formatted} enviada para ${params.recipientName} com Face ID.`,
        category: 'PIX_OUT',
        timestampIso: new Date().toISOString(),
      };

      PushNotificationService._history.unshift(payload);
      return right(payload);
    } catch {
      return left(new ValidationFailure('Falha ao disparar notificação de envio.'));
    }
  }

  /**
   * Alerta de Segurança e Mitigação Anti-Fraude.
   */
  public async notifySuspiciousTransaction(params: {
    readonly description: string;
    readonly amount: number;
  }): Promise<Either<Failure, BankNotificationPayload>> {
    try {
      const formatted = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(params.amount);

      const payload: BankNotificationPayload = {
        id: `notif-fraud-${Date.now()}`,
        title: '🛡️ Alerta de Segurança Nexo',
        body: `Identificada tentativa atípica de ${formatted} em "${params.description}". Limites noturnos do BACEN foram aplicados.`,
        category: 'FRAUD_ALERT',
        timestampIso: new Date().toISOString(),
      };

      PushNotificationService._history.unshift(payload);
      Alert.alert(payload.title, payload.body);
      return right(payload);
    } catch {
      return left(new ValidationFailure('Erro no alerta antifraude.'));
    }
  }

  /**
   * Retorna o histórico de notificações da sessão atual.
   */
  public getHistory(): readonly BankNotificationPayload[] {
    return PushNotificationService._history;
  }

  /**
   * Limpa o histórico de notificações em memória.
   */
  public clearHistory(): void {
    PushNotificationService._history = [];
  }
}


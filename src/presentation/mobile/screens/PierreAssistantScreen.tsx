/**
 * PierreAssistantScreen.tsx — Assistente de Inteligência Artificial Financeira (Pierre AI)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

interface ChatMessage {
  readonly id: string;
  readonly text: string;
  readonly sender: 'USER' | 'PIERRE';
  readonly timestamp: string;
}

interface PierreAssistantScreenProps {
  readonly onBack: () => void;
}

export const PierreAssistantScreen: React.FC<PierreAssistantScreenProps> = ({
  onBack,
}) => {
  const [messages, setMessages] = useState<readonly ChatMessage[]>([
    {
      id: 'm1',
      sender: 'PIERRE',
      text: 'Olá, Guilherme! Eu sou o Pierre, seu assistente de inteligência financeira. Como posso ajudar com seus gastos, investimentos e Open Finance hoje?',
      timestamp: 'Agora',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend ?? inputText).trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'USER',
      text,
      timestamp: 'Agora',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Simulação de resposta cognitiva do Pierre
    setTimeout(() => {
      let reply = 'Estou auditando suas contas e relatórios em tempo real.';
      const lower = text.toLowerCase();

      if (lower.includes('saúde') || lower.includes('score')) {
        reply = 'Sua Saúde Financeira está em 100/100! Suas contas estão equilibradas, sem dívidas ativas e com os limites diurnos e noturnos do BACEN rigorosamente calibrados.';
      } else if (lower.includes('duplicad') || lower.includes('assinatura')) {
        reply = 'Não detectei cobranças duplicadas este mês. Seu radar de assinaturas está limpo e monitorando contratos recorrentes.';
      } else if (lower.includes('limite') || lower.includes('bacen') || lower.includes('rua')) {
        reply = 'Seu Limite Diurno é R$ 10.000,00 e o Limite Noturno é R$ 1.000,00 (Resolução BCB nº 142/2021). O Modo Rua está disponível para travar transferências em até R$ 200,00.';
      } else if (lower.includes('economizar') || lower.includes('dica')) {
        reply = 'Sugiro concentrar seus gastos no cartão virtual Nexo Platinum para acumular pontos e manter seu fluxo de caixa rendendo no CDI enquanto a fatura não vence.';
      } else {
        reply = `Entendido! Analisei seu livro-razão sobre "${text}" e sincronizei os parâmetros via Open Finance.`;
      }

      const pierreMsg: ChatMessage = {
        id: `p-${Date.now()}`,
        sender: 'PIERRE',
        text: reply,
        timestamp: 'Agora',
      };

      setMessages((prev) => [...prev, pierreMsg]);
      setIsTyping(false);
    }, 800);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Voltar</Text>
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.topBarTitle}>Pierre AI</Text>
          <View style={styles.statusOnline}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Ativo</Text>
          </View>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.chatContent}>
          {messages.map((m) => {
            const isPierre = m.sender === 'PIERRE';
            return (
              <View
                key={m.id}
                style={[
                  styles.messageWrapper,
                  isPierre ? styles.messageLeft : styles.messageRight,
                ]}
              >
                {isPierre && (
                  <View style={styles.pierreAvatar}>
                    <Text style={styles.pierreAvatarText}>✨</Text>
                  </View>
                )}
                <View
                  style={[
                    styles.messageBubble,
                    isPierre ? styles.bubblePierre : styles.bubbleUser,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      isPierre ? styles.textPierre : styles.textUser,
                    ]}
                  >
                    {m.text}
                  </Text>
                </View>
              </View>
            );
          })}

          {isTyping && (
            <View style={[styles.messageWrapper, styles.messageLeft]}>
              <View style={styles.pierreAvatar}>
                <Text style={styles.pierreAvatarText}>✨</Text>
              </View>
              <View style={[styles.messageBubble, styles.bubblePierre]}>
                <Text style={styles.typingText}>Pierre está analisando...</Text>
              </View>
            </View>
          )}

          {/* Sugestões Rápidas de Perguntas */}
          <View style={styles.suggestionsSection}>
            <Text style={styles.suggestionsTitle}>PERGUNTAS FREQUENTES</Text>
            <View style={styles.suggestionsGrid}>
              {[
                '📊 Como está minha saúde financeira?',
                '🔍 Tenho cobranças duplicadas?',
                '🛡️ Como estão meus limites BACEN?',
                '💡 Dicas para economizar no mês',
              ].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={styles.suggestionPill}
                  onPress={() => handleSendMessage(s)}
                >
                  <Text style={styles.suggestionText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Input de Mensagem */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Pergunte sobre seus gastos, limites e saldo..."
            placeholderTextColor="#6b7280"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => handleSendMessage()}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !inputText.trim() && styles.sendButtonDisabled,
            ]}
            onPress={() => handleSendMessage()}
            disabled={!inputText.trim()}
          >
            <Text style={styles.sendButtonText}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0c0e',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1d24',
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  backButtonText: {
    color: '#ff5500',
    fontSize: 14,
    fontWeight: '600',
  },
  titleContainer: {
    alignItems: 'center',
  },
  topBarTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  statusOnline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  onlineText: {
    color: '#8e929a',
    fontSize: 10,
  },
  keyboardContainer: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    gap: 12,
  },
  messageWrapper: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  messageLeft: {
    justifyContent: 'flex-start',
  },
  messageRight: {
    justifyContent: 'flex-end',
  },
  pierreAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 85, 0, 0.15)',
    borderWidth: 1,
    borderColor: '#ff5500',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pierreAvatarText: {
    fontSize: 14,
  },
  messageBubble: {
    maxWidth: '82%',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bubblePierre: {
    backgroundColor: '#161922',
    borderWidth: 1,
    borderColor: '#242938',
  },
  bubbleUser: {
    backgroundColor: '#ff5500',
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
  },
  textPierre: {
    color: '#ffffff',
  },
  textUser: {
    color: '#ffffff',
    fontWeight: '500',
  },
  typingText: {
    color: '#8e929a',
    fontSize: 12,
    fontStyle: 'italic',
  },
  suggestionsSection: {
    marginTop: 16,
    gap: 8,
  },
  suggestionsTitle: {
    color: '#6b7280',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  suggestionsGrid: {
    gap: 6,
  },
  suggestionPill: {
    backgroundColor: '#12141a',
    borderWidth: 1,
    borderColor: '#1d212b',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  suggestionText: {
    color: '#d1d5db',
    fontSize: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#12141a',
    borderTopWidth: 1,
    borderTopColor: '#1d212b',
    gap: 8,
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#181b24',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 13,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ff5500',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 16,
  },
});


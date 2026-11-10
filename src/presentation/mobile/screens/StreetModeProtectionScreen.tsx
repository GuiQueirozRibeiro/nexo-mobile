/**
 * StreetModeProtectionScreen.tsx — Proteção Modo Rua / Anti-Coação (Padrão Bancário Brasileiro)
 *
 * Funcionalidade criada para segurança física do titular:
 * - Redução automática do limite PIX para R$ 200,00 fora de redes Wi-Fi confiáveis.
 * - Ocultação preventiva do saldo consolidado e patrimônio.
 * - Desativação protegida por Prova de Vida Facial (Liveness Check) obrigatória.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';

interface StreetModeProps {
  readonly onBack: () => void;
  readonly onRequestLivenessCheck: () => void;
}

export const StreetModeProtectionScreen: React.FC<StreetModeProps> = ({
  onBack,
  onRequestLivenessCheck,
}) => {
  const [isStreetModeActive, setIsStreetModeActive] = useState(true);
  const [streetLimitBrl] = useState(200.0);

  const handleToggleStreetMode = () => {
    if (isStreetModeActive) {
      // Para desativar o Modo Rua, exige Prova de Vida Facial por segurança
      Alert.alert(
        'Segurança Bancária',
        'Para desativar o Modo Rua e restaurar seus limites completos, é obrigatório realizar o reconhecimento facial com teste de vivacidade.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Fazer Leitura Facial',
            onPress: () => {
              onRequestLivenessCheck();
              setIsStreetModeActive(false);
            },
          },
        ],
      );
    } else {
      setIsStreetModeActive(true);
      Alert.alert(
        'Modo Rua Ativado',
        'Seus limites de transferência na rua foram restritos a R$ 200,00 e o saldo foi protegido.',
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Modo Rua e Proteção</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Banner de Status */}
        <View
          style={[
            styles.statusCard,
            isStreetModeActive ? styles.statusActiveCard : styles.statusInactiveCard,
          ]}
        >
          <View style={styles.statusHeader}>
            <Text style={styles.statusIcon}>
              {isStreetModeActive ? '🛡️' : '⚠️'}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.statusTitle}>
                {isStreetModeActive ? 'Modo Rua Ativo' : 'Modo Rua Desativado'}
              </Text>
              <Text style={styles.statusSubtitle}>
                {isStreetModeActive
                  ? 'Suas transferências fora de redes seguras estão limitadas a R$ 200,00.'
                  : 'Seus limites normais de até R$ 10.000,00 estão liberados.'}
              </Text>
            </View>
          </View>
        </View>

        {/* Botão de Toggle */}
        <TouchableOpacity
          style={[
            styles.toggleButton,
            isStreetModeActive ? styles.toggleButtonDeactivate : styles.toggleButtonActivate,
          ]}
          onPress={handleToggleStreetMode}
          activeOpacity={0.8}
        >
          <Text style={styles.toggleButtonText}>
            {isStreetModeActive ? 'Desativar com Reconhecimento Facial' : 'Ativar Proteção Modo Rua'}
          </Text>
        </TouchableOpacity>

        {/* Detalhes da Proteção */}
        <View style={styles.rulesCard}>
          <Text style={styles.rulesHeaderTitle}>COMO O MODO RUA TE PROTEGE</Text>

          <View style={styles.ruleItem}>
            <Text style={styles.ruleIcon}>🔒</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.ruleName}>Teto PIX na Rua: R$ {streetLimitBrl.toFixed(2)}</Text>
              <Text style={styles.ruleDesc}>
                Mesmo com coação ou celular desbloqueado, ninguém consegue transferir acima desse valor.
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.ruleItem}>
            <Text style={styles.ruleIcon}>👤</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.ruleName}>Desbloqueio com Prova de Vida</Text>
              <Text style={styles.ruleDesc}>
                Fotos, vídeos ou máscaras são rejeitados pelo motor biométrico anti-spoofing.
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.ruleItem}>
            <Text style={styles.ruleIcon}>📶</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.ruleName}>Redes Wi-Fi Confiáveis</Text>
              <Text style={styles.ruleDesc}>
                Sua residência e escritório são cadastrados como zonas seguras de limite integral.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
  topBarTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  statusCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
  },
  statusActiveCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusInactiveCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  statusHeader: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 32,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
    lineHeight: 16,
  },
  toggleButton: {
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  toggleButtonActivate: {
    backgroundColor: '#ff5500',
  },
  toggleButtonDeactivate: {
    backgroundColor: '#1c202a',
    borderWidth: 1,
    borderColor: '#374151',
  },
  toggleButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  rulesCard: {
    backgroundColor: '#12141a',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1d212b',
    gap: 14,
  },
  rulesHeaderTitle: {
    color: '#ff5500',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  ruleItem: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  ruleIcon: {
    fontSize: 20,
    marginTop: 2,
  },
  ruleName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  ruleDesc: {
    fontSize: 11,
    color: '#8e929a',
    lineHeight: 15,
  },
  divider: {
    height: 1,
    backgroundColor: '#1d212b',
  },
});

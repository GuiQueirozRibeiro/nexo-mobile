/**
 * SecurityLimitsScreen.tsx — Central de Limites PIX e Segurança Bancária (Normativa BACEN)
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

interface SecurityLimitsScreenProps {
  readonly onBack: () => void;
}

export const SecurityLimitsScreen: React.FC<SecurityLimitsScreenProps> = ({
  onBack,
}) => {
  const [daytimeLimit] = useState(10000);
  const [nighttimeLimit] = useState(1000);
  const [singleTransferLimit] = useState(5000);
  const [isFaceIdEnabled] = useState(true);

  const formatCurrency = (val: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  const handleRequestLimitChange = (type: string) => {
    Alert.alert(
      'Solicitar Ajuste de Limite',
      `Para sua segurança e conforme a Resolução BCB nº 142/2021 do Banco Central, aumentos de limite PIX exigem prazo regulatório de 24 a 48 horas para análise pelo comitê antifraude.\n\nDeseja prosseguir com a solicitação para o ${type}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar Solicitação',
          onPress: () => {
            Alert.alert(
              'Solicitação Protocolada',
              `Protocolo BACEN-${Date.now().toString().slice(-8)} registrado. Você receberá uma notificação push quando a análise for concluída.`,
            );
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Limites e Segurança PIX</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Badge Institucional BACEN */}
        <View style={styles.bacenBadgeCard}>
          <View style={styles.bacenBadgeHeader}>
            <Text style={styles.bacenShieldIcon}>🛡️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.bacenTitle}>Conformidade Regulatória BACEN</Text>
              <Text style={styles.bacenSubtitle}>
                Resolução BCB nº 142/2021 • Parâmetros de mitigação de risco e proteção contra coação.
              </Text>
            </View>
          </View>
        </View>

        {/* Limite Diurno */}
        <View style={styles.limitCard}>
          <View style={styles.limitHeader}>
            <View>
              <Text style={styles.limitTimeTag}>06:00 ÀS 20:00 (HORÁRIO COMERCIAL)</Text>
              <Text style={styles.limitName}>Limite PIX Diurno</Text>
            </View>
            <Text style={styles.limitValue}>{formatCurrency(daytimeLimit)}</Text>
          </View>
          <Text style={styles.limitDescription}>
            Teto diário acumulado disponível para transferências e pagamentos durante o dia.
          </Text>
          <TouchableOpacity
            style={styles.adjustButton}
            onPress={() => handleRequestLimitChange('Limite Diurno')}
          >
            <Text style={styles.adjustButtonText}>Ajustar Limite Diurno →</Text>
          </TouchableOpacity>
        </View>

        {/* Limite Noturno */}
        <View style={styles.limitCard}>
          <View style={styles.limitHeader}>
            <View>
              <Text style={styles.limitTimeTag}>20:00 ÀS 06:00 (PERÍODO NOTURNO)</Text>
              <Text style={styles.limitName}>Limite PIX Noturno</Text>
            </View>
            <Text style={styles.limitValue}>{formatCurrency(nighttimeLimit)}</Text>
          </View>
          <Text style={styles.limitDescription}>
            Proteção obrigatória contra fraudes e golpes noturnos conforme determinação do Banco Central.
          </Text>
          <TouchableOpacity
            style={styles.adjustButton}
            onPress={() => handleRequestLimitChange('Limite Noturno')}
          >
            <Text style={styles.adjustButtonText}>Ajustar Limite Noturno →</Text>
          </TouchableOpacity>
        </View>

        {/* Limite por Operação Unitária */}
        <View style={styles.limitCard}>
          <View style={styles.limitHeader}>
            <View>
              <Text style={styles.limitTimeTag}>TETO UNITÁRIO</Text>
              <Text style={styles.limitName}>Por Transação Individual</Text>
            </View>
            <Text style={styles.limitValue}>{formatCurrency(singleTransferLimit)}</Text>
          </View>
          <Text style={styles.limitDescription}>
            Valor máximo autorizado em uma única transferência sem validação em duplo fator.
          </Text>
        </View>

        {/* Proteção Biométrica */}
        <View style={styles.securitySettingsCard}>
          <Text style={styles.securitySettingsTitle}>CAMADAS DE PROTEÇÃO ATIVAS</Text>

          <View style={styles.securityRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.securityName}>Face ID / Biometria Transacional</Text>
              <Text style={styles.securityDesc}>
                Exige autenticação facial para autorizar cada envio de PIX.
              </Text>
            </View>
            <View style={styles.statusActiveBadge}>
              <Text style={styles.statusActiveText}>ATIVO</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.securityRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.securityName}>Bloqueio Automático em Segundo Plano</Text>
              <Text style={styles.securityDesc}>
                O aplicativo é bloqueado imediatamente ao minimizar ou trocar de janela.
              </Text>
            </View>
            <View style={styles.statusActiveBadge}>
              <Text style={styles.statusActiveText}>ATIVO</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.securityRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.securityName}>Anti-Fraude com Machine Learning</Text>
              <Text style={styles.securityDesc}>
                Análise em tempo real de padrões de pagamento e geolocalização.
              </Text>
            </View>
            <View style={styles.statusActiveBadge}>
              <Text style={styles.statusActiveText}>ATIVO</Text>
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
  bacenBadgeCard: {
    backgroundColor: 'rgba(255, 85, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 85, 0, 0.25)',
    borderRadius: 20,
    padding: 16,
  },
  bacenBadgeHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  bacenShieldIcon: {
    fontSize: 28,
  },
  bacenTitle: {
    color: '#ff5500',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  bacenSubtitle: {
    color: '#9ca3af',
    fontSize: 11,
    lineHeight: 16,
  },
  limitCard: {
    backgroundColor: '#12141a',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1d212b',
    gap: 10,
  },
  limitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  limitTimeTag: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ff5500',
    letterSpacing: 1,
    marginBottom: 2,
  },
  limitName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  limitValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  limitDescription: {
    fontSize: 11,
    color: '#8e929a',
    lineHeight: 16,
  },
  adjustButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  adjustButtonText: {
    color: '#ff5500',
    fontSize: 12,
    fontWeight: '600',
  },
  securitySettingsCard: {
    backgroundColor: '#12141a',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1d212b',
    gap: 14,
    marginTop: 4,
  },
  securitySettingsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8e929a',
    letterSpacing: 1.2,
  },
  securityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  securityName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  securityDesc: {
    fontSize: 11,
    color: '#8e929a',
    lineHeight: 15,
  },
  statusActiveBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusActiveText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#1d212b',
  },
});


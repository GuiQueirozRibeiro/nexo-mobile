/**
 * App.tsx — Entrada Oficial do Aplicativo Nexo Finance Mobile (React Native + Expo)
 *
 * Conecta-se diretamente ao BFF oficial em https://nexo.eximiatech.com.br/api/*
 * compartilhando 100% da camada Core, Domain e Data em TypeScript estrito (Zero `any`).
 */

import { NexoBffApiDataSource } from './src/data';
import { PixKeyValidator, WebhookReconciliationEngine } from './src/domain';

export const nexoBffClient = new NexoBffApiDataSource(
  'https://nexo.eximiatech.com.br',
);

export const mobileWebhookEngine = new WebhookReconciliationEngine();

export function validateMobilePixKey(rawKey: string): boolean {
  return PixKeyValidator.validate(rawKey).isRight();
}

export default function App() {
  return null;
}

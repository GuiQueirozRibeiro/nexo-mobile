/**
 * PixEmvParserService.ts — Analisador Oficial de QR Code PIX (EMVCo / BR Code do Banco Central)
 *
 * Especificação BACEN para o Arranjo PIX:
 * - ID 00: Indicador do formato do payload (01)
 * - ID 26: Informações da conta do recebedor (GUI: br.gov.bcb.pix, chave, txid)
 * - ID 53: Código da moeda (986 = BRL)
 * - ID 54: Valor da transação (opcional em QR estático)
 * - ID 58: País (BR)
 * - ID 59: Nome do recebedor
 * - ID 60: Cidade do recebedor
 * - ID 62: Dados adicionais (TxId)
 */

export interface ParsedPixQrCode {
  readonly isValid: boolean;
  readonly rawPayload: string;
  readonly merchantName?: string;
  readonly merchantCity?: string;
  readonly amount?: number;
  readonly pixKey?: string;
  readonly txId?: string;
  readonly description?: string;
}

export class PixEmvParserService {
  /**
   * Decodifica uma string de QR Code EMV ou chave PIX Copia e Cola.
   */
  public static parse(payload: string): ParsedPixQrCode {
    const clean = payload.trim();
    if (!clean) {
      return { isValid: false, rawPayload: payload };
    }

    // Se for URL de PIX dinâmico (ex.: qrcode.asaas.com ou pix.bcb.gov.br)
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      return {
        isValid: true,
        rawPayload: clean,
        merchantName: 'Estabelecimento Comercial Credenciado',
        description: 'Cobrança via QR Code Dinâmico',
      };
    }

    // Se for QR Code EMV padrão BACEN (inicia com 000201)
    if (clean.startsWith('000201')) {
      return PixEmvParserService._parseEmvTlv(clean);
    }

    // Se o usuário colou uma chave PIX direta
    return {
      isValid: true,
      rawPayload: clean,
      pixKey: clean,
      merchantName: 'Destinatário da Chave PIX',
    };
  }

  private static _parseEmvTlv(emv: string): ParsedPixQrCode {
    let index = 0;
    let merchantName: string | undefined;
    let merchantCity: string | undefined;
    let amount: number | undefined;
    let pixKey: string | undefined;
    let txId: string | undefined;

    while (index < emv.length) {
      const tag = emv.substring(index, index + 2);
      const lengthStr = emv.substring(index + 2, index + 4);
      const length = parseInt(lengthStr, 10);

      if (isNaN(length)) break;

      const value = emv.substring(index + 4, index + 4 + length);

      if (tag === '26') {
        // Sub-tags TLV do Arranjo PIX (subtag 00 = GUI, subtag 01 = chave)
        let subIndex = 0;
        while (subIndex < value.length) {
          const subTag = value.substring(subIndex, subIndex + 2);
          const subLen = parseInt(value.substring(subIndex + 2, subIndex + 4), 10);
          if (isNaN(subLen)) break;
          const subVal = value.substring(subIndex + 4, subIndex + 4 + subLen);
          if (subTag === '01') {
            pixKey = subVal;
            break;
          }
          subIndex += 4 + subLen;
        }
        if (!pixKey) {
          const emailMatch = value.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
          if (emailMatch && emailMatch[0]) {
            pixKey = emailMatch[0];
          }
        }
      } else if (tag === '54') {
        const parsedAmount = parseFloat(value);
        if (!isNaN(parsedAmount)) {
          amount = parsedAmount;
        }
      } else if (tag === '59') {
        merchantName = value;
      } else if (tag === '60') {
        merchantCity = value;
      } else if (tag === '62') {
        txId = value;
      }

      index = index + 4 + length;
    }

    return {
      isValid: true,
      rawPayload: emv,
      merchantName: merchantName ?? 'Destinatário PIX',
      merchantCity: merchantCity ?? 'Brasil',
      amount,
      pixKey,
      txId,
      description: 'Pagamento via QR Code EMV',
    };
  }
}

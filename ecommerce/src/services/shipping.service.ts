/**
 * Serviço de Frete — API dos Correios.
 *
 * Usa a API REST dos Correios v2 (autenticação via token).
 * Documentação: https://api.correios.com.br/
 *
 * Para ambientes de desenvolvimento sem credenciais dos Correios,
 * o método fallback retorna valores fixos de exemplo.
 */

import {
  CORREIOS_BASE_URL,
  CORREIOS_SERVICES,
  ORIGIN_ZIP_CODE,
} from '@/lib/constants';
import { withRetry } from '@/lib/utils';
import type { ShippingOption, ShippingCalculateResponse } from '@/types';
import type { CalculateShippingInput } from '@/validators/shipping';

const CORREIOS_USER = process.env.CORREIOS_API_USER;
const CORREIOS_PASS = process.env.CORREIOS_API_PASS;
const CORREIOS_CONTRACT = process.env.CORREIOS_CONTRACT_NUMBER;

// Cache de token (em memória — usar Redis em produção com múltiplas instâncias)
let _tokenCache: { token: string; expiresAt: number } | null = null;

async function getCorreiosToken(): Promise<string> {
  if (_tokenCache && Date.now() < _tokenCache.expiresAt) {
    return _tokenCache.token;
  }

  const res = await fetch(`${CORREIOS_BASE_URL}/token/v1/autentica/cartaopostagem`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${CORREIOS_USER}:${CORREIOS_PASS}`).toString('base64')}`,
    },
    body: JSON.stringify({ numero: CORREIOS_CONTRACT }),
  });

  if (!res.ok) {
    throw new Error(`[ShippingService] Falha ao autenticar nos Correios: ${res.status}`);
  }

  const data = await res.json() as { token: string; expiraEm: string };

  _tokenCache = {
    token: data.token,
    expiresAt: new Date(data.expiraEm).getTime() - 60_000, // renovar 1 min antes
  };

  return _tokenCache.token;
}

// Faixas de CEP com frete fixo (entrega local)
const LOCAL_SHIPPING_ZONES: Array<{
  from: number
  to: number
  price: number
  label: string
  delivery_days: number
}> = [
  { from: 44000000, to: 44119999, price: 10.00, label: 'Entrega local — Feira de Santana', delivery_days: 2 },
]

function getLocalShipping(destZip: string): ShippingCalculateResponse | null {
  const zipNum = parseInt(destZip.replace(/\D/g, ''), 10)
  const zone = LOCAL_SHIPPING_ZONES.find((z) => zipNum >= z.from && zipNum <= z.to)
  if (!zone) return null

  return {
    options: [
      {
        service_code: 'LOCAL',
        service_name: zone.label,
        price: zone.price,
        delivery_days: zone.delivery_days,
        error: false,
      },
    ],
    origin_zip: ORIGIN_ZIP_CODE,
    destination_zip: destZip,
  }
}

export const ShippingService = {
  /**
   * Calcula opções de frete (PAC e SEDEX) via API dos Correios.
   * CEPs com frete fixo (entrega local) retornam valor fixo sem consultar os Correios.
   * Em caso de falha na autenticação, retorna estimativas de fallback.
   */
  async calculate(
    input: CalculateShippingInput
  ): Promise<ShippingCalculateResponse> {
    const destZip = input.destination_zip.replace('-', '');

    // Verifica frete fixo local antes de consultar os Correios
    const local = getLocalShipping(destZip)
    if (local) return local

    try {
      return await withRetry(() =>
        ShippingService._callCorreiosApi(input, destZip)
      );
    } catch (err) {
      console.error('[ShippingService] Erro na API dos Correios, usando fallback:', err);
      return ShippingService._fallback(destZip);
    }
  },

  async _callCorreiosApi(
    input: CalculateShippingInput,
    destZip: string
  ): Promise<ShippingCalculateResponse> {
    const token = await getCorreiosToken();

    const services = [
      { code: CORREIOS_SERVICES.PAC, name: 'PAC' },
      { code: CORREIOS_SERVICES.SEDEX, name: 'SEDEX' },
    ];

    const options: ShippingOption[] = await Promise.all(
      services.map(async (svc) => {
        const res = await fetch(
          `${CORREIOS_BASE_URL}/preco/v1/nacional/${svc.code}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              cepOrigem: ORIGIN_ZIP_CODE,
              cepDestino: destZip,
              psObjeto: input.weight_grams / 1000, // em kg
              tpObjeto: '2', // caixa
              comprimento: input.length_cm,
              altura: input.height_cm,
              largura: input.width_cm,
              vlDeclarado: input.declared_value ?? 0,
            }),
          }
        );

        if (!res.ok) {
          return {
            service_code: svc.code,
            service_name: svc.name,
            price: 0,
            delivery_days: 0,
            error: true,
            error_code: `HTTP_${res.status}`,
            error_message: `Erro ao consultar ${svc.name}`,
          };
        }

        const data = await res.json() as {
          pcFinal: number;
          prazoEntrega: number;
          txErro?: string;
          codErro?: string;
        };

        if (data.txErro) {
          return {
            service_code: svc.code,
            service_name: svc.name,
            price: 0,
            delivery_days: 0,
            error: true,
            error_code: data.codErro ?? 'UNKNOWN',
            error_message: data.txErro,
          };
        }

        return {
          service_code: svc.code,
          service_name: svc.name,
          price: data.pcFinal,
          delivery_days: data.prazoEntrega,
          error: false,
        };
      })
    );

    return {
      options,
      origin_zip: ORIGIN_ZIP_CODE,
      destination_zip: destZip,
    };
  },

  /**
   * Valores de fallback quando a API dos Correios está indisponível.
   * Retorna estimativas conservadoras para não bloquear o checkout.
   */
  _fallback(destZip: string): ShippingCalculateResponse {
    return {
      options: [
        {
          service_code: CORREIOS_SERVICES.PAC,
          service_name: 'PAC',
          price: 18.90,
          delivery_days: 10,
          error: false,
        },
        {
          service_code: CORREIOS_SERVICES.SEDEX,
          service_name: 'SEDEX',
          price: 34.90,
          delivery_days: 3,
          error: false,
        },
      ],
      origin_zip: ORIGIN_ZIP_CODE,
      destination_zip: destZip,
    };
  },
};

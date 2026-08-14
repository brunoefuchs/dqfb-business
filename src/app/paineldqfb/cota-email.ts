/**
 * Story 12.B4 — núcleo testável do card "Cota de e-mail".
 *
 * Módulo próprio, e não uma função dentro de `page.tsx`, por um motivo prático: a página
 * tem ~2600 linhas e importa React, fetch e o painel inteiro. Um teste que a importasse
 * pagaria tudo isso para verificar quatro comparações. A 12.B2 tomou o mesmo caminho ao
 * extrair `custoHojeUsd`/`parseTetoUsdDia` do edge.
 */

/** O que o edge entrega. AUSENTE (`undefined`) significa: nunca foi medido. */
export type CotaEmail = {
  usados: number;
  limite: number;
  pct: number;
  periodo_fim: string | null;
  medido_em: string | null;
};

export type EstadoCota = {
  /** false = nunca mediram. O card mostra "ainda não medido", NUNCA 0%. */
  temMedicao: boolean;
  /** largura da barra, 0–100 */
  larguraPct: number;
  /** a medição é diária; acima de 48h o número está velho e quem olha precisa saber */
  velho: boolean;
  /** mesmos cortes do alerta do CRM — painel e sino não podem discordar */
  nivel: 'sem_medicao' | 'ok' | 'alerta' | 'critico';
};

export const LIMIAR_ALERTA = 80;
export const LIMIAR_CRITICO = 95;
const HORAS_ATE_ENVELHECER = 48;

/**
 * 🔴 A distinção que este módulo existe para preservar:
 *
 *   sem medição  → `temMedicao: false` — o card diz "ainda não medido"
 *   pct === 0    → `temMedicao: true`  — zero REAL, o card mostra 0%
 *
 * São coisas diferentes e não podem sair iguais na tela. Um zero inventado afirma que a
 * cota está ótima sobre um número que ninguém apurou — e foi exatamente assim que o
 * monitor do Mailtrap ficou morto por meses: falhando calado.
 */
export function estadoDaCotaEmail(mq: CotaEmail | undefined | null, agora = Date.now()): EstadoCota {
  if (!mq) {
    return { temMedicao: false, larguraPct: 0, velho: false, nivel: 'sem_medicao' };
  }
  const pct = Number.isFinite(mq.pct) ? mq.pct : 0;
  const larguraPct = Math.max(0, Math.min(100, pct));
  const velho =
    mq.medido_em != null &&
    agora - new Date(mq.medido_em).getTime() > HORAS_ATE_ENVELHECER * 3600 * 1000;
  const nivel = pct >= LIMIAR_CRITICO ? 'critico' : pct >= LIMIAR_ALERTA ? 'alerta' : 'ok';
  return { temMedicao: true, larguraPct, velho, nivel };
}

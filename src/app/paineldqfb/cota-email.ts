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
  /**
   * `medido_em` em epoch ms, ou `null` quando o campo está AUSENTE **ou INVÁLIDO**.
   *
   * 🔴 O null carrega as duas coisas de propósito: a tela só escreve "Medido em ..."
   * quando isto não é null. Antes ela fazia `new Date(mq.medido_em)` por conta própria e
   * imprimia literalmente `Invalid Date` ao lado da barra quando o campo vinha corrompido.
   */
  medidoEmMs: number | null;
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
    return { temMedicao: false, larguraPct: 0, velho: false, medidoEmMs: null, nivel: 'sem_medicao' };
  }
  const pct = Number.isFinite(mq.pct) ? mq.pct : 0;
  const larguraPct = Math.max(0, Math.min(100, pct));
  const medidoEmMs = instanteValido(mq.medido_em);
  // 🔴 Só um instante VÁLIDO pode ser chamado de velho — ou de fresco.
  //
  // A conta antiga era `agora - new Date(mq.medido_em).getTime() > 48h`. Com data
  // corrompida isso vira `agora - NaN`, que é `NaN`, e `NaN > x` é `false`: a medição
  // inválida saía como FRESCA, exatamente o oposto do que o campo existe para avisar.
  // Sem data confiável o card não afirma nem uma coisa nem outra.
  const velho = medidoEmMs != null && agora - medidoEmMs > HORAS_ATE_ENVELHECER * 3600 * 1000;
  const nivel = pct >= LIMIAR_CRITICO ? 'critico' : pct >= LIMIAR_ALERTA ? 'alerta' : 'ok';
  return { temMedicao: true, larguraPct, velho, medidoEmMs, nivel };
}

/** Parseia UMA vez e valida. `null` = ausente ou impossível de ler. */
function instanteValido(iso: string | null): number | null {
  if (iso == null) return null;
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? null : ms;
}

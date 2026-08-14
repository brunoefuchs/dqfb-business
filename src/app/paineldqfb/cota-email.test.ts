/**
 * Story 12.B4 — card "Cota de e-mail".
 *
 * O que está provado aqui é o AC-3 (zero medido ≠ nunca medido), o AC-4 (a barra sabe
 * quando foi medida) e o AC-5 (os cortes batem com os do sino do CRM).
 *
 * ⛔ NÃO cobre a renderização do JSX — o card é markup direto dentro de `page.tsx`.
 *    Está declarado assim no gate em vez de listado como coberto.
 */
import { describe, expect, it } from 'vitest';
import {
  estadoDaCotaEmail,
  LIMIAR_ALERTA,
  LIMIAR_CRITICO,
  type CotaEmail,
} from './cota-email';

const AGORA = new Date('2026-08-14T11:00:00Z').getTime();

function medicao(over: Partial<CotaEmail> = {}): CotaEmail {
  return {
    usados: 9000,
    limite: 200000,
    pct: 4.5,
    periodo_fim: '2026-08-31',
    medido_em: '2026-08-14T11:00:00Z',
    ...over,
  };
}

describe('AC-3 — zero medido não pode virar "nunca medido", nem o contrário', () => {
  it('🔴 sem medição → temMedicao false (o card não mostra 0%)', () => {
    for (const vazio of [undefined, null]) {
      const e = estadoDaCotaEmail(vazio, AGORA);
      expect(e.temMedicao).toBe(false);
      expect(e.nivel).toBe('sem_medicao');
      expect(e.larguraPct).toBe(0);
    }
  });

  it('🔴 pct = 0 MEDIDO → temMedicao true (zero real é informação)', () => {
    const e = estadoDaCotaEmail(medicao({ pct: 0, usados: 0 }), AGORA);
    expect(e.temMedicao).toBe(true);
    expect(e.larguraPct).toBe(0);
    expect(e.nivel).toBe('ok');
  });
});

describe('AC-4 — a barra diz quando foi medida', () => {
  it('medição de agora não é velha', () => {
    expect(estadoDaCotaEmail(medicao(), AGORA).velho).toBe(false);
  });

  it('47h ainda não é velha; 49h é', () => {
    const h = (n: number) => new Date(AGORA - n * 3600 * 1000).toISOString();
    expect(estadoDaCotaEmail(medicao({ medido_em: h(47) }), AGORA).velho).toBe(false);
    expect(estadoDaCotaEmail(medicao({ medido_em: h(49) }), AGORA).velho).toBe(true);
  });

  it('medido_em nulo não pode fingir que está fresco nem quebrar', () => {
    // Se o cron parar por 3 dias, a barra continuaria mostrando número de 3 dias atrás
    // com cara de agora. Sem data, o card simplesmente não afirma quando mediu.
    expect(estadoDaCotaEmail(medicao({ medido_em: null }), AGORA).velho).toBe(false);
  });
});

describe('AC-5 — os cortes batem com os do sino do CRM', () => {
  // 🔴 Os números vão CRAVADOS, não via LIMIAR_ALERTA/LIMIAR_CRITICO.
  //
  // A primeira versão passava a própria constante como entrada — e o mutante que trocava
  // 80 por 90 SOBREVIVEU: o teste alimentava 90 e esperava 'alerta', o que continua certo.
  // Teste autorreferente não testa nada. Aqui os valores são um CONTRATO EXTERNO: são os
  // mesmos cortes que `mautic_quota_warning`/`_critical` usam no sino do CRM. Se alguém
  // mexer neles, painel e sino passam a discordar sobre o que é "apertado" — e é
  // exatamente isso que estes testes existem para impedir.
  it('as constantes valem 80 e 95 — o mesmo que o sino do CRM', () => {
    expect(LIMIAR_ALERTA).toBe(80);
    expect(LIMIAR_CRITICO).toBe(95);
  });

  it('79 é ok, 80 é alerta', () => {
    expect(estadoDaCotaEmail(medicao({ pct: 79 }), AGORA).nivel).toBe('ok');
    expect(estadoDaCotaEmail(medicao({ pct: 80 }), AGORA).nivel).toBe('alerta');
  });

  it('94 é alerta, 95 é crítico', () => {
    expect(estadoDaCotaEmail(medicao({ pct: 94 }), AGORA).nivel).toBe('alerta');
    expect(estadoDaCotaEmail(medicao({ pct: 95 }), AGORA).nivel).toBe('critico');
  });
});

describe('a barra não escapa da caixa', () => {
  it('pct acima de 100 satura em 100', () => {
    // Estourar a cota é possível: o Mailtrap pode reportar 120% antes de cortar.
    const e = estadoDaCotaEmail(medicao({ pct: 120 }), AGORA);
    expect(e.larguraPct).toBe(100);
    expect(e.nivel).toBe('critico');
  });

  it('pct negativo ou NaN não vira largura inválida', () => {
    expect(estadoDaCotaEmail(medicao({ pct: -5 }), AGORA).larguraPct).toBe(0);
    expect(estadoDaCotaEmail(medicao({ pct: Number.NaN }), AGORA).larguraPct).toBe(0);
  });
});

/**
 * Story 2.66 — card "Uso esparso de aparelhos".
 *
 * O que está provado aqui é a distinção que o card inteiro existe para manter:
 * **"nada apurado" ≠ "ninguém acima do limite" ≠ "o sinal não respondeu"**. As três
 * sairiam iguais na tela sem este módulo, e é o mesmo defeito que deixou o monitor do
 * Mailtrap morto por meses.
 *
 * E o invariante que sustenta a D4: 🔴 **a régua do dono NÃO é recalculada aqui.** Quem
 * decide se `sinal_abuso` acende é o banco; este repositório é público.
 *
 * ⛔ NÃO cobre a renderização do JSX — o card é markup direto dentro de `page.tsx`. Quem
 *    prova que a tela CHAMA este módulo é `page-fiacao.test.ts`. Está declarado assim em
 *    vez de listado como coberto.
 */
import { describe, expect, it } from 'vitest';

import {
  contasNaSerie,
  diaCurtoBr,
  distribuicaoOrdenada,
  estadoDoUsoEsparso,
  LEGENDA_SINAL_USO_ESPARSO,
  RESSALVAS_USO_ESPARSO,
  type SemanaUsoEsparso,
} from './uso-esparso';

/** O dado real de 02/09/2026, com a conta de FRONTEIRA (exatamente 3, nada acima). */
const SEMANA: SemanaUsoEsparso = {
  dia: '2026-09-02',
  medido_em: '2026-09-02T15:19:22.562604+00:00',
  candidatos: 160,
  desistencia: 144,
  esparso_confirmado: 13,
  suspeita: 3,
  ctrl_neg_invertidas: 0,
  ctrl_pos_pre: 10,
  pos_gatilho_total: 571,
  ctrl_pos_confirmados: 347,
  confirmados_sem_login_novo: 333,
  pct_confirmado: 60.8,
  pre_confirmados_sem_login: 6,
  distribuicao_por_conta: { '0': 215, '1': 335, '2': 10, '3': 1 },
  contas_acima_de_3: 0,
  sinal_abuso: false,
};

describe('estadoDoUsoEsparso', () => {
  it('🔴 ausente ⇒ semSerie, e NUNCA "ninguém acima do limite"', () => {
    for (const vazio of [undefined, null, [] as SemanaUsoEsparso[]]) {
      const e = estadoDoUsoEsparso(vazio);
      expect(e.temSerie).toBe(false);
      expect(e.semSerie).toBe(true);
      expect(e.atual).toBeNull();
      // 🔴 O ponto: o sinal NÃO vira `false`. "Não medi" e "medi e está tudo bem" levam a
      // decisões opostas, e sem esta linha os dois sairiam com a mesma cor.
      expect(e.sinalAceso).toBeNull();
      expect(e.sinalAceso).not.toBe(false);
      expect(e.distribuicao).toEqual([]);
    }
  });

  it('série presente ⇒ a semana mais recente é a `atual`, com o sinal do BANCO', () => {
    const anterior: SemanaUsoEsparso = { ...SEMANA, dia: '2026-08-26', candidatos: 8 };
    const e = estadoDoUsoEsparso([SEMANA, anterior]);
    expect(e.temSerie).toBe(true);
    expect(e.semSerie).toBe(false);
    expect(e.atual?.dia).toBe('2026-09-02');
    expect(e.sinalAceso).toBe(false);
    expect(e.semanas).toHaveLength(2);
  });

  it('🔴 o sinal ACESO chega pronto — a régua do dono não é recalculada aqui', () => {
    // Par positivo obrigatório: só o lado `false` seria satisfeito por um módulo que
    // devolve `false` para tudo, e aí o card nunca acenderia — o pior resultado possível.
    const aceso: SemanaUsoEsparso = { ...SEMANA, contas_acima_de_3: 2, sinal_abuso: true };
    expect(estadoDoUsoEsparso([aceso]).sinalAceso).toBe(true);
    // 🔴 E a prova de que a régua NÃO mora aqui: uma linha com 9 contas acima de 3 e o
    // sinal APAGADO tem de sair apagada. Se este módulo recalculasse "acima de 3", ele
    // acenderia — e passaria a divergir do servidor sem ninguém notar.
    const contradiz: SemanaUsoEsparso = { ...SEMANA, contas_acima_de_3: 9, sinal_abuso: false };
    expect(estadoDoUsoEsparso([contradiz]).sinalAceso).toBe(false);
  });

  it('🔴 sinal que não é booleano vira `null`, nunca `false`', () => {
    const semSinal = { ...SEMANA, sinal_abuso: null } as SemanaUsoEsparso;
    const e = estadoDoUsoEsparso([semSinal]);
    expect(e.sinalAceso).toBeNull();
    // e mesmo assim a série EXISTE — "medi mas o sinal não respondeu" é um quarto estado
    expect(e.temSerie).toBe(true);
    expect(e.semSerie).toBe(false);
  });

  it('a conta de FRONTEIRA (3 aparelhos) aparece na distribuição SEM acender o sinal', () => {
    // É o dado real de 02/09 e o caso que a régua do dono existe para NÃO pegar.
    const e = estadoDoUsoEsparso([SEMANA]);
    expect(e.distribuicao).toEqual([
      { aparelhos: 0, contas: 215 },
      { aparelhos: 1, contas: 335 },
      { aparelhos: 2, contas: 10 },
      { aparelhos: 3, contas: 1 },
    ]);
    expect(e.sinalAceso).toBe(false);
  });
});

describe('distribuicaoOrdenada', () => {
  it('ordena por número de aparelhos, não pela ordem das chaves do jsonb', () => {
    expect(distribuicaoOrdenada({ '10': 1, '2': 5, '0': 9 })).toEqual([
      { aparelhos: 0, contas: 9 },
      { aparelhos: 2, contas: 5 },
      { aparelhos: 10, contas: 1 },
    ]);
  });

  it('🔴 chave que não é inteiro é DESCARTADA, nunca convertida para 0', () => {
    // `Number('abc')` é `NaN`; sem o filtro, o balde de "0 aparelhos" absorveria lixo e o
    // card mentiria justamente no balde mais cheio.
    const r = distribuicaoOrdenada({ '0': 3, abc: 7, '1.5': 2 } as Record<string, number>);
    expect(r).toEqual([{ aparelhos: 0, contas: 3 }]);
    expect(r.some((b) => Number.isNaN(b.aparelhos))).toBe(false);
  });

  it('ausente ou não-objeto ⇒ lista vazia', () => {
    expect(distribuicaoOrdenada(null)).toEqual([]);
    expect(distribuicaoOrdenada(undefined)).toEqual([]);
  });
});

describe('diaCurtoBr', () => {
  it('🔴 fatia o texto — NÃO passa por `new Date`, que voltaria um dia no fuso BR', () => {
    // `new Date('2026-09-02')` é meia-noite UTC = 01/09 21h em Brasília. O dia gravado já
    // É o dia de calendário BR; converter introduziria um erro de um dia sem ganho nenhum.
    expect(diaCurtoBr('2026-09-02')).toBe('02/09');
    expect(diaCurtoBr('2026-01-01')).toBe('01/01');
  });

  it('valor inesperado não quebra a tela', () => {
    expect(diaCurtoBr(null)).toBe('—');
    expect(diaCurtoBr(undefined)).toBe('—');
    expect(diaCurtoBr('qualquer coisa')).toBe('qualquer coisa');
  });
});

describe('contasNaSerie', () => {
  it('soma os baldes da semana atual', () => {
    expect(contasNaSerie(estadoDoUsoEsparso([SEMANA]))).toBe(561);
  });

  it('🔴 sem série devolve `null`, nunca 0', () => {
    // `0` na tela seria "não existe conta nenhuma", que é falso e alarmante.
    expect(contasNaSerie(estadoDoUsoEsparso(null))).toBeNull();
  });
});

describe('os textos que andam junto do número', () => {
  it('🔴 a ressalva do ACÚMULO existe e diz de quando ele acumula', () => {
    // Sem ela, "144 desistências, subindo toda semana" é lido como piora quando é acúmulo.
    const acumulo = RESSALVAS_USO_ESPARSO.find((r) => /ACUMULADOS/.test(r));
    expect(acumulo).toBeDefined();
    expect(acumulo).toContain('23/08/2026');
  });

  it('🔴 a legenda diz que o limite mora no servidor e que nada é bloqueado', () => {
    expect(LEGENDA_SINAL_USO_ESPARSO).toMatch(/servidor/);
    expect(LEGENDA_SINAL_USO_ESPARSO).toMatch(/bloquead/i);
  });
});

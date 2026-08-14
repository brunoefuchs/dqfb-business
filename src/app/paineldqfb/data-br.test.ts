/**
 * Data em fuso BR — o defeito que este arquivo existe para travar:
 * `periodo_fim` é `date` no Postgres, chega `'2026-08-31'`, e passar isso por `Date`
 * imprimia 30/08. Um dia a menos, sempre.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fmtDataBr } from './data-br';

/**
 * 🔴 O fuso da MÁQUINA é fixado em UTC durante estes testes.
 *
 * Sem isto o teste é cego no lugar mais importante: esta máquina roda em
 * `America/Sao_Paulo`, e ali `toLocaleDateString` acerta o dia BR mesmo SEM a opção
 * `timeZone`. O mutante que apaga o `timeZone: 'America/Sao_Paulo'` passou verde na
 * primeira rodada exatamente por isso — e teria quebrado em qualquer runner em UTC.
 * Fixando UTC, o teste prova que quem converte é o código, não o computador.
 */
const TZ_ORIGINAL = process.env.TZ;
beforeAll(() => {
  process.env.TZ = 'UTC';
});
afterAll(() => {
  process.env.TZ = TZ_ORIGINAL;
});

describe('🔴 data-only (YYYY-MM-DD) não perde um dia', () => {
  it('2026-08-31 imprime 31/08/2026 — não 30/08', () => {
    // Valor CRAVADO. É o `periodo_fim` real da migration da cota de e-mail.
    expect(fmtDataBr('2026-08-31')).toBe('31/08/2026');
  });

  it('primeiro dia do mês não vira o mês anterior', () => {
    // O caso mais cruel do bug: 01/01 virava 31/12 do ano anterior.
    expect(fmtDataBr('2026-01-01')).toBe('01/01/2026');
  });
});

describe('timestamp de verdade continua convertido para o fuso BR', () => {
  it('23:30Z de 14/08 ainda é 14/08 no Brasil', () => {
    expect(fmtDataBr('2026-08-14T23:30:00Z')).toBe('14/08/2026');
  });

  it('🔴 02:00Z de 15/08 ainda é 14/08 no Brasil (UTC-3)', () => {
    // Este é o teste que morre se alguém tirar o `timeZone: America/Sao_Paulo`.
    expect(fmtDataBr('2026-08-15T02:00:00Z')).toBe('14/08/2026');
  });
});

describe('entrada imprestável não vira texto imprestável', () => {
  it('nulo, indefinido e vazio saem string vazia', () => {
    for (const v of [null, undefined, '']) {
      expect(fmtDataBr(v)).toBe('');
    }
  });

  it('lixo não vira "Invalid Date" na tela', () => {
    expect(fmtDataBr('nao-e-data')).toBe('');
  });

  it('data com formato de dia mas impossível não passa por cima do calendário', () => {
    // '2026-02-30' não existe. O ramo data-only reordena os pedaços, então imprime
    // 30/02/2026 — literalmente o que o banco mandou. Preferimos ecoar o dado a
    // silenciá-lo: se um dia aparecer isso na tela, o defeito está na origem.
    expect(fmtDataBr('2026-02-30')).toBe('30/02/2026');
  });
});

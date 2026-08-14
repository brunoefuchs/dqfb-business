/**
 * Story 12.B5 — card "Aparelhos por conta".
 *
 * ⛔ NÃO cobre o JSX (markup direto no `page.tsx`). Declarado, não fingido.
 */
import { describe, expect, it } from 'vitest';
import { estadoDosAparelhos, sinal, RESSALVAS, type AparelhoLinha } from './aparelhos';

function linha(over: Partial<AparelhoLinha> = {}): AparelhoLinha {
  return {
    perfil_id: 'p1', nome: 'Aluna', aparelhos: 2, ativos_30d: 2,
    novos_12m: 0, redes_distintas: 1, plataformas: 'ios',
    ultimo_acesso: '2026-08-14T10:00:00Z', ...over,
  };
}

describe('AC-5 — sem dado, não inventa', () => {
  it('vazio/nulo → temDado false', () => {
    for (const v of [undefined, null, []]) {
      expect(estadoDosAparelhos(v as AparelhoLinha[] | null).temDado).toBe(false);
    }
  });
});

describe('AC-2 — 🔴 as DUAS ressalvas existem e são opostas', () => {
  it('são exatamente duas', () => {
    expect(RESSALVAS).toHaveLength(2);
  });

  it('uma diz SUPERESTIMA e a outra SUBESTIMA — vieses opostos', () => {
    // Mostrar só uma sugere precisão que não existe. É o AC-2 inteiro.
    expect(RESSALVAS.some((r) => r.includes('SUPERESTIMA'))).toBe(true);
    expect(RESSALVAS.some((r) => r.includes('SUBESTIMA'))).toBe(true);
  });

  it('a do CGNAT nomeia o mecanismo, não só o efeito', () => {
    expect(RESSALVAS.some((r) => r.includes('CGNAT'))).toBe(true);
  });
});

describe('o sinal exige as DUAS condições', () => {
  it('4 aparelhos numa rede só é uma casa — normal', () => {
    expect(sinal(linha({ aparelhos: 4, ativos_30d: 4, redes_distintas: 1 }))).toBe('normal');
  });

  it('1 aparelho em 4 redes é quem viaja — normal', () => {
    expect(sinal(linha({ aparelhos: 1, ativos_30d: 1, redes_distintas: 4 }))).toBe('normal');
  });

  it('3 ativos E 3 redes → olhar', () => {
    expect(sinal(linha({ ativos_30d: 3, redes_distintas: 3 }))).toBe('olhar');
  });

  it('🔴 conta ATIVOS, não o total — aparelho velho não acusa ninguém', () => {
    // 5 aparelhos históricos mas só 1 ativo: quem trocou de celular várias vezes.
    expect(sinal(linha({ aparelhos: 5, ativos_30d: 1, redes_distintas: 5 }))).toBe('normal');
  });
});

describe('maxAparelhos escala as barras', () => {
  it('pega o maior', () => {
    const e = estadoDosAparelhos([linha({ aparelhos: 2 }), linha({ aparelhos: 7 })]);
    expect(e.maxAparelhos).toBe(7);
  });

  it('nunca zero — divisão por zero quebraria a barra', () => {
    expect(estadoDosAparelhos([linha({ aparelhos: 0 })]).maxAparelhos).toBe(1);
  });
});

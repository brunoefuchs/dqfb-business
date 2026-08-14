/**
 * Story 12.B5 — card "Aparelhos por conta".
 *
 * ⛔ NÃO cobre o JSX (markup direto no `page.tsx`). Declarado, não fingido.
 */
import { describe, expect, it } from 'vitest';
import {
  estadoDosAparelhos,
  rotuloSinal,
  sinal,
  LEGENDA_OLHAR,
  RESSALVAS,
  type AparelhoLinha,
} from './aparelhos';

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

  // 🔴 "Não tenho lista" e "a lista está vazia" NÃO são a mesma frase na tela.
  //
  // O comentário do tipo prometia `semDado` e a primeira versão não implementou: os três
  // valores caíam no mesmo `temDado: false` e a tela afirmava "nenhuma conta com mais de
  // um aparelho registrado" sem que ninguém tivesse apurado nada.
  describe('🔴 semDado separa "não apurado" de "apurado, ninguém bate"', () => {
    it('campo AUSENTE (undefined) → semDado (é o que o edge manda hoje)', () => {
      expect(estadoDosAparelhos(undefined).semDado).toBe(true);
    });

    it('null → semDado', () => {
      expect(estadoDosAparelhos(null).semDado).toBe(true);
    });

    it('array VAZIO → NÃO é semDado: a consulta respondeu, e isso é informação', () => {
      const e = estadoDosAparelhos([]);
      expect(e.semDado).toBe(false);
      expect(e.temDado).toBe(false);
    });

    it('com linha → nem semDado nem vazio', () => {
      const e = estadoDosAparelhos([linha()]);
      expect(e.semDado).toBe(false);
      expect(e.temDado).toBe(true);
    });
  });
});

describe('🔴 o rótulo do sinal é TEXTO — cor não pode ser o único portador (WCAG 1.4.1)', () => {
  it('conta que chama atenção ganha a palavra "Olhar"', () => {
    // Literal cravado de propósito: passar a própria constante do módulo como esperado
    // deixaria o mutante vivo — o teste concordaria com qualquer texto.
    expect(rotuloSinal(linha({ ativos_30d: 3, redes_distintas: 3 }))).toBe('Olhar');
  });

  it('conta normal não ganha rótulo nenhum', () => {
    expect(rotuloSinal(linha({ ativos_30d: 1, redes_distintas: 1 }))).toBe(null);
  });

  it('o rótulo segue o `sinal`, não um critério paralelo', () => {
    for (const l of [
      linha({ aparelhos: 4, ativos_30d: 4, redes_distintas: 1 }),
      linha({ aparelhos: 1, ativos_30d: 1, redes_distintas: 4 }),
      linha({ ativos_30d: 3, redes_distintas: 3 }),
      linha({ aparelhos: 5, ativos_30d: 1, redes_distintas: 5 }),
    ]) {
      expect(rotuloSinal(l) === null).toBe(sinal(l) === 'normal');
    }
  });

  it('⛔ a legenda diz o critério e nega o veredito', () => {
    // Sem isto, "Olhar" na tela vira acusação. O CGNAT é a razão pela qual não é.
    expect(LEGENDA_OLHAR).toContain('CGNAT');
    expect(LEGENDA_OLHAR).toContain('Não é veredito');
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

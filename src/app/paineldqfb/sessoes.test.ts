/**
 * Story 2.52 — card "Sessões ao mesmo tempo".
 *
 * ⛔ NÃO cobre o JSX (markup direto no `page.tsx`). Declarado, não fingido.
 */
import { describe, expect, it } from 'vitest';
import {
  estadoDasSessoes,
  sinalSessao,
  rotuloSinalSessao,
  textoPlataformas,
  RESSALVAS_SESSOES,
  LEGENDA_OLHAR_SESSAO,
  type SessaoLinha,
} from './sessoes';

function linha(over: Partial<SessaoLinha> = {}): SessaoLinha {
  return {
    perfil_id: 'p1',
    nome: 'Aluna',
    sessoes_na_janela: 2,
    plataformas_vivas: 'android',
    cruza_plataforma: false,
    menor_intervalo_segundos: 30,
    ultima_atividade: '2026-08-25T10:00:00Z',
    ...over,
  };
}

describe('🔴 `[]` é MEDIÇÃO, não ausência — e a diferença muda a frase na tela', () => {
  it('campo ausente = ninguém apurou', () => {
    const e = estadoDasSessoes(undefined);
    expect(e.semDado).toBe(true);
    expect(e.temDado).toBe(false);
  });

  it('🔴 array vazio = apurei, ninguém usa ao mesmo tempo', () => {
    // A fonte é `auth.sessions`, que NUNCA está vazia. Colapsar `[]` em "não apurado"
    // faria a tela dizer "ainda não medido" sobre uma medição — o oposto do que houve.
    const e = estadoDasSessoes([]);
    expect(e.semDado).toBe(false);
    expect(e.temDado).toBe(false);
  });

  it('com linha = tem o que mostrar', () => {
    expect(estadoDasSessoes([linha()]).temDado).toBe(true);
  });
});

describe('🔴 só `cruza_plataforma` promove — a contagem bruta NÃO', () => {
  it('cruza plataforma → olhar', () => {
    expect(sinalSessao(linha({ cruza_plataforma: true }))).toBe('olhar');
    expect(rotuloSinalSessao(linha({ cruza_plataforma: true }))).toBe('Olhar');
  });

  it('🔴 20 sessões próximas e sem cruzar → NORMAL', () => {
    // Re-login renova a sessão velha no instante em que cria a nova: a contagem bruta é
    // ruído estrutural e não melhora com mais dados. Promover por ela encheria o card de
    // gente que só reabriu o app.
    expect(sinalSessao(linha({ sessoes_na_janela: 20, cruza_plataforma: false }))).toBe(
      'normal',
    );
    expect(rotuloSinalSessao(linha({ sessoes_na_janela: 20 }))).toBeNull();
  });

  it('🔴 `null` NÃO promove — não sei ≠ cruza', () => {
    expect(sinalSessao(linha({ cruza_plataforma: null }))).toBe('normal');
  });
});

describe('🔴 os TRÊS estados de plataforma têm textos diferentes', () => {
  it('null vira "—", nunca "não"', () => {
    // "não" afirmaria que foi medido; `null` diz que a coluna não veio.
    expect(textoPlataformas(linha({ cruza_plataforma: null }))).toBe('—');
  });

  it('false mostra as plataformas vivas', () => {
    expect(textoPlataformas(linha({ cruza_plataforma: false, plataformas_vivas: 'ios' }))).toBe(
      'ios',
    );
  });

  it('true diz "ao mesmo tempo"', () => {
    expect(
      textoPlataformas(linha({ cruza_plataforma: true, plataformas_vivas: 'android+ios' })),
    ).toBe('android+ios ao mesmo tempo');
  });
});

describe('🔴 as ressalvas impedem que uma linha vire acusação', () => {
  it('declara que NÃO é veredito', () => {
    expect(RESSALVAS_SESSOES.some((r) => r.includes('não é prova'))).toBe(true);
  });

  it('🔴 manda conferir a DATA por causa do atendimento do suporte', () => {
    // As 4 contas apontadas criaram sessão em 21-22/08, dias em que o suporte entrou em
    // conta de aluna. Sem esta linha, o card acusa o próprio time.
    expect(RESSALVAS_SESSOES.some((r) => r.includes('confira a DATA'))).toBe(true);
  });

  it('🔴 declara o que o quadro NÃO pega — inclusive dois iPhones', () => {
    expect(RESSALVAS_SESSOES.some((r) => r.includes('dois iPhones'))).toBe(true);
  });

  it('a legenda do "Olhar" existe e não usa palavra acusatória', () => {
    expect(LEGENDA_OLHAR_SESSAO).toContain('Não é veredito');
    for (const t of [...RESSALVAS_SESSOES, LEGENDA_OLHAR_SESSAO]) {
      expect(t.toLowerCase()).not.toContain('fraude');
      expect(t.toLowerCase()).not.toContain('pirata');
      expect(t.toLowerCase()).not.toContain('crime');
    }
  });
});

/**
 * Story 2.66 (AC7) — o card "Uso esparso de aparelhos" RENDERIZADO.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔴 ESTE ARQUIVO É O CONSERTO DE F-2.66-02, F-2.66-09 E F-2.66-10
 *
 * As guardas anteriores liam o `page.tsx` como TEXTO. A `@qa` provou que isso não segura:
 * ela reintroduziu o defeito do CodeRabbit no JSX e deixou as frases que a guarda procurava
 * dentro de um COMENTÁRIO no mesmo arquivo — **15/15 testes verdes** com a tela afirmando o
 * oposto do banco. E dois mutantes dela sobreviveram pelo mesmo motivo: o SELO colapsando
 * `null` em `·` (o glifo de "tudo bem") e a lista de medições anteriores encolhendo de 8
 * para 1.
 *
 * Aqui as asserções são sobre o **DOM renderizado**. Comentário não entra no DOM; texto
 * repetido noutro lugar do arquivo não entra no DOM; um ramo morto não entra no DOM. É o
 * fechamento por CONSTRUÇÃO, não por regex mais esperta.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ⛔ NÃO cobre: o `page.tsx` inteiro (client component de 3.400 linhas que faz fetch na
 *    montagem). Quem prova que a TELA usa este card é a guarda de fiação em
 *    `page-fiacao.test.ts`. As duas metades são necessárias e nenhuma substitui a outra.
 */
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { MAX_MEDICOES_ANTERIORES, UsoEsparsoCard } from './uso-esparso-card';
import type { SemanaUsoEsparso } from './uso-esparso';

afterEach(cleanup);

const BASE: SemanaUsoEsparso = {
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

const semana = (over: Partial<SemanaUsoEsparso>): SemanaUsoEsparso => ({ ...BASE, ...over });

describe('🔴 o defeito do CodeRabbit, medido no DOM (F-2.66-02)', () => {
  it('sinal ACESO com contagem NULA nunca escreve «ninguém acima do limite»', () => {
    // É o caso EXATO do achado major: `contas_acima_de_3` é NULL-ável, e a versão original
    // avaliava a contagem antes do sinal. A tela dizia o oposto do que o banco disse.
    render(
      <UsoEsparsoCard
        semanas={[
          semana({ dia: '2026-09-09' }),
          semana({ dia: '2026-09-02', sinal_abuso: true, contas_acima_de_3: null }),
        ]}
      />,
    );
    const anteriores = screen.getByTestId('uso-esparso-anteriores');
    expect(within(anteriores).queryByText(/ninguém acima do limite/)).toBeNull();
    expect(within(anteriores).getByText('acima do limite — quantidade não informada')).toBeTruthy();
  });

  it('🔬 CONTROLE POSITIVO: sinal APAGADO escreve «ninguém acima do limite»', () => {
    // Sem este par, o teste acima é satisfeito por um card que não renderiza nada — e
    // `queryByText(...) === null` sobre DOM vazio é verdadeiro trivialmente.
    render(
      <UsoEsparsoCard
        semanas={[
          semana({ dia: '2026-09-09' }),
          semana({ dia: '2026-09-02', sinal_abuso: false, contas_acima_de_3: 0 }),
        ]}
      />,
    );
    const anteriores = screen.getByTestId('uso-esparso-anteriores');
    expect(within(anteriores).getByText('ninguém acima do limite')).toBeTruthy();
  });

  it('contagem POSITIVA detalha o número; sinal nulo sai como «—»', () => {
    render(
      <UsoEsparsoCard
        semanas={[
          semana({ dia: '2026-09-16' }),
          semana({ dia: '2026-09-09', sinal_abuso: true, contas_acima_de_3: 2 }),
          semana({ dia: '2026-09-02', sinal_abuso: null, contas_acima_de_3: null }),
        ]}
      />,
    );
    const anteriores = screen.getByTestId('uso-esparso-anteriores');
    expect(within(anteriores).getByText('2 acima do limite')).toBeTruthy();
    expect(within(anteriores).getByText('—')).toBeTruthy();
  });
});

describe('🔴 os TRÊS estados do sinal, TEXTO **e** SELO (F-2.66-09)', () => {
  // O mutante QP2 da `@qa` colapsou `null` em `·` só no SELO e sobreviveu: a guarda de
  // texto casava no primeiro par e nunca chegava ao segundo nó. Aqui os dois são lidos.
  const casos = [
    { nome: 'aceso', sinal: true, texto: /alguma conta passou do limite/, selo: '!' },
    { nome: 'apagado', sinal: false, texto: /nenhuma conta passou do limite/, selo: '·' },
    { nome: 'sem resposta', sinal: null, texto: /o sinal não respondeu nesta medição/, selo: '—' },
  ] as const;

  for (const c of casos) {
    it(`sinal ${c.nome}: o texto e o selo dizem a MESMA coisa`, () => {
      render(<UsoEsparsoCard semanas={[semana({ sinal_abuso: c.sinal })]} />);
      expect(screen.getByTestId('uso-esparso-sinal-texto').textContent).toMatch(c.texto);
      expect(screen.getByTestId('uso-esparso-sinal-selo').textContent).toContain(c.selo);
    });
  }

  it('🔴 o selo de "sem resposta" NÃO é o mesmo de "tudo bem"', () => {
    render(<UsoEsparsoCard semanas={[semana({ sinal_abuso: null })]} />);
    const semResposta = screen.getByTestId('uso-esparso-sinal-selo').textContent;
    cleanup();
    render(<UsoEsparsoCard semanas={[semana({ sinal_abuso: false })]} />);
    const apagado = screen.getByTestId('uso-esparso-sinal-selo').textContent;
    expect(semResposta).not.toBe(apagado);
  });

  it('só o sinal ACESO carrega o rótulo "Olhar" em texto (WCAG 1.4.1, não só cor)', () => {
    render(<UsoEsparsoCard semanas={[semana({ sinal_abuso: true })]} />);
    expect(screen.getByTestId('uso-esparso-sinal-selo').textContent).toContain('Olhar');
    cleanup();
    render(<UsoEsparsoCard semanas={[semana({ sinal_abuso: false })]} />);
    expect(screen.getByTestId('uso-esparso-sinal-selo').textContent).not.toContain('Olhar');
  });
});

describe('🔴 a cardinalidade da lista de medições anteriores (F-2.66-10)', () => {
  it(`emite no máximo ${MAX_MEDICOES_ANTERIORES} semanas, e pula a atual`, () => {
    // O mutante QP3 da `@qa` trocou `slice(1, 9)` por `slice(1, 2)` e sobreviveu: a lista
    // encolheu de 8 para 1 sem nenhum teste reclamar.
    const doze = Array.from({ length: 12 }, (_, i) => semana({ dia: `2026-09-${String(i + 1).padStart(2, '0')}` }));
    render(<UsoEsparsoCard semanas={doze} />);
    expect(screen.getAllByTestId('uso-esparso-semana')).toHaveLength(MAX_MEDICOES_ANTERIORES);
    // e a PRIMEIRA da lista é a segunda semana da série — a atual está no bloco de cima
    const anteriores = screen.getByTestId('uso-esparso-anteriores');
    expect(within(anteriores).queryByText('01/09')).toBeNull();
    expect(within(anteriores).getByText('02/09')).toBeTruthy();
  });

  it('com menos semanas que o teto, emite todas as que existem menos a atual', () => {
    const tres = ['2026-09-16', '2026-09-09', '2026-09-02'].map((dia) => semana({ dia }));
    render(<UsoEsparsoCard semanas={tres} />);
    expect(screen.getAllByTestId('uso-esparso-semana')).toHaveLength(2);
  });

  it('com uma única semana, o bloco de anteriores nem aparece', () => {
    render(<UsoEsparsoCard semanas={[semana({})]} />);
    expect(screen.queryByTestId('uso-esparso-anteriores')).toBeNull();
  });
});

describe('🔴 os TRÊS estados de ausência saem com frases DIFERENTES', () => {
  it('nunca medido: diz que a medição roda toda segunda, e NÃO afirma ausência de abuso', () => {
    render(<UsoEsparsoCard semanas={undefined} />);
    expect(screen.getByText(/ainda não medido/)).toBeTruthy();
    expect(screen.queryByText(/nenhuma conta passou do limite/)).toBeNull();
  });

  it('a leitura quebrou: nomeia a falha, com frase diferente de "nunca medido"', () => {
    render(<UsoEsparsoCard semanas={undefined} erro="PGRST202" />);
    expect(screen.getByText(/a leitura falhou \(PGRST202\)/)).toBeTruthy();
    expect(screen.queryByText(/ainda não medido/)).toBeNull();
  });

  it('medido e ninguém acima: aí sim a afirmação é legítima', () => {
    render(<UsoEsparsoCard semanas={[semana({ sinal_abuso: false })]} />);
    expect(screen.getByText(/nenhuma conta passou do limite/)).toBeTruthy();
    expect(screen.queryByText(/ainda não medido/)).toBeNull();
  });
});

describe('o rótulo do ACÚMULO e as ressalvas chegam à tela (achado 8)', () => {
  it('a saúde da coleta diz "acumulado desde 23/08/2026" na própria linha', () => {
    render(<UsoEsparsoCard semanas={[semana({})]} />);
    expect(screen.getByText(/acumulado desde 23\/08\/2026/)).toBeTruthy();
  });

  it('as três ressalvas e a legenda do sinal são renderizadas', () => {
    render(<UsoEsparsoCard semanas={[semana({})]} />);
    expect(screen.getByText(/ACUMULADOS desde 23\/08\/2026/)).toBeTruthy();
    expect(screen.getByText(/O sinal acende quando alguma conta passa do limite/)).toBeTruthy();
    expect(screen.getByText(/não limita nada/)).toBeTruthy();
  });

  it('a distribuição sai com os baldes do banco, e o total de contas', () => {
    render(<UsoEsparsoCard semanas={[semana({})]} />);
    expect(screen.getByText('1 aparelho')).toBeTruthy();
    expect(screen.getByText('3 aparelhos')).toBeTruthy();
    expect(screen.getByText(/561 contas/)).toBeTruthy();
  });
});

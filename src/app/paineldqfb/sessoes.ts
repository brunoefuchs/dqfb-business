/**
 * Story 2.52 — núcleo testável do card "Sessões ao mesmo tempo".
 *
 * Módulo próprio pelo mesmo motivo de `aparelhos.ts`: a página tem ~2700 linhas e importá-la
 * num teste pagaria React, fetch e o painel inteiro para verificar comparações.
 *
 * ⛔ **Isto não limita nada.** Mostrar não é limitar — a trava é decisão do dono.
 *
 * 🔴 **Por que este card existe, se já há um de aparelhos.** Contar aparelho NÃO é contar
 * pessoa: uma aluna com celular + tablet são 2 aparelhos e 1 pessoa (caso medido —
 * `mae-zena` tem Galaxy Note + Galaxy Tab). O sinal que separa "uma pessoa com dois
 * aparelhos" de "duas pessoas" é **uso ao mesmo tempo**.
 */

export type SessaoLinha = {
  perfil_id: string;
  nome: string;
  /** `null` = a coluna não veio. NUNCA 0 — `0` afirmaria "nenhuma sessão próxima". */
  sessoes_na_janela: number | null;
  plataformas_vivas: string | null;
  /** `null` = não sei. `false` = medido e não cruza — e ver a ressalva, `false` ≠ aparelho único. */
  cruza_plataforma: boolean | null;
  menor_intervalo_segundos: number | null;
  ultima_atividade: string | null;
};

/**
 * 🔴 AS RESSALVAS — e aqui elas não são decoração, são o que impede uma acusação.
 *
 * Este card aponta CONTAS DE PESSOAS. Ler uma linha dele como veredito produz o dano que o
 * parecer jurídico de 24/08 nomeia: brandir suspeita de pirataria contra cliente pagante
 * expõe a empresa ao CDC art. 42 e art. 71. Por isso o rótulo é **"olhar"**, nunca "fraude",
 * e por isso as três ressalvas vão na tela, não no código.
 *
 * O texto veio VERBATIM da Story 2.52 (AC-6), que o entregou pronto justamente para esta
 * sessão não o reinventar.
 */
export const RESSALVAS_SESSOES = [
  'Este quadro é um olhar, não um veredito — e nenhuma linha aqui se lê sozinha.',
  '"Sessões próximas" não prova nada sozinho: quando alguém entra de novo no app, a sessão antiga é renovada no mesmo instante em que a nova nasce, o que por si só produz duas sessões separadas por segundos. Em 24/08, TODAS as contas dentro da hora tinham o mesmo aparelho e a mesma rede nas duas.',
  '"Plataformas ao mesmo tempo" (iPhone e Android vivos juntos) é o sinal mais forte que temos, e mesmo assim não é prova: em 24/08 apontou 4 contas, e 3 tinham o MESMO IP nas duas — uma pessoa com dois aparelhos, ou duas pessoas na mesma casa.',
  '⚠️ Antes de concluir qualquer coisa sobre uma linha, confira a DATA. Em 21 e 22/08 o suporte entrou em contas de aluna para destravar o login, e as quatro contas apontadas criaram suas sessões exatamente nesses dias. Não temos como separar essas sessões das normais — a trilha de auditoria está vazia. Se a data bater com um atendimento, não é sinal de nada.',
  'O que este quadro NÃO pega: duas pessoas revezando o mesmo aparelho em horários diferentes; dois aparelhos da MESMA plataforma (dois iPhones — a coluna diz "não" e mesmo assim podem ser dois); e contas de teste do time criadas com e-mail de aluna.',
] as const;

export type EstadoSessoes = {
  /** true = veio pelo menos uma linha para mostrar. */
  temDado: boolean;
  /**
   * 🔴 true = NINGUÉM APUROU — o campo não veio da edge.
   *
   * ⚠️ Distinto de `[]`, e a diferença importa. Aqui a fonte é `auth.sessions`, que **nunca
   * está vazia** — logo `[]` é uma MEDIÇÃO ("apurei, ninguém usa ao mesmo tempo"), não uma
   * ausência. Colapsar os dois faria a tela dizer "ainda não medido" sobre uma medição, que
   * é o oposto do que aconteceu.
   */
  semDado: boolean;
  linhas: SessaoLinha[];
};

export function estadoDasSessoes(
  linhas: SessaoLinha[] | undefined | null,
): EstadoSessoes {
  if (linhas == null) return { temDado: false, semDado: true, linhas: [] };
  if (!linhas.length) return { temDado: false, semDado: false, linhas: [] };
  return { temDado: true, semDado: false, linhas };
}

/**
 * O quanto a linha chama atenção. ⛔ NÃO é veredito — o rótulo é "olhar".
 *
 * 🔴 **Só `cruza_plataforma` promove.** A contagem bruta NÃO entra no critério, e isso é
 * deliberado: ela é ruído estrutural (re-login fabrica duas sessões separadas por segundos)
 * e não vai melhorar com mais dados. Promover por ela encheria o card de gente que só
 * reabriu o app.
 */
export function sinalSessao(l: SessaoLinha): 'normal' | 'olhar' {
  return l.cruza_plataforma === true ? 'olhar' : 'normal';
}

export function rotuloSinalSessao(l: SessaoLinha): string | null {
  return sinalSessao(l) === 'olhar' ? 'Olhar' : null;
}

/** O que "Olhar" quer dizer — na tela, junto das ressalvas, nunca escondido no código. */
export const LEGENDA_OLHAR_SESSAO =
  '"Olhar" marca conta com sessão viva em iPhone E Android ao mesmo tempo. Não é veredito: pode ser a mesma pessoa com dois aparelhos, ou um atendimento do suporte. Confira a data antes de concluir.';

/**
 * Texto da coluna de plataformas, tratando os TRÊS estados.
 *
 * 🔴 `null` vira `'—'`, nunca `'não'`. `'não'` afirmaria que foi medido e não cruza; `null`
 * quer dizer que a coluna não veio. São coisas diferentes e a tela precisa distinguir.
 */
export function textoPlataformas(l: SessaoLinha): string {
  if (l.cruza_plataforma == null) return '—';
  if (!l.cruza_plataforma) return l.plataformas_vivas ?? 'uma só';
  return `${l.plataformas_vivas ?? 'duas'} ao mesmo tempo`;
}

/**
 * Story 12.B5 — núcleo testável do card "Aparelhos por conta".
 *
 * Módulo próprio pelo mesmo motivo do `cota-email.ts`: a página tem ~2700 linhas e
 * importá-la num teste pagaria React, fetch e o painel inteiro para verificar comparações.
 *
 * ⛔ **Isto não limita nada.** Mostrar não é limitar — a trava é decisão do dono.
 */

export type AparelhoLinha = {
  perfil_id: string;
  nome: string;
  aparelhos: number;
  ativos_30d: number;
  novos_12m: number;
  redes_distintas: number;
  plataformas: string;
  ultimo_acesso: string | null;
};

/**
 * 🔴 AS DUAS RESSALVAS, e elas andam JUNTAS com o número.
 *
 * São vieses em direções OPOSTAS, e é por isso que mostrar só um é pior que não mostrar
 * nenhum — sugere precisão que não existe:
 *
 *   reinstalar o app zera o identificador  → SUPERESTIMA aparelhos e trocas
 *   CGNAT junta assinantes no mesmo hash   → SUBESTIMA compartilhamento em 4G
 *
 * O segundo saiu de uma pergunta do dono: "10 alunas da mesma cidade usando 4G não cairiam
 * na mesma?". Cairiam — operadora móvel divide um IP público entre milhares de assinantes.
 */
export const RESSALVAS = [
  'Reinstalar o app zera o identificador do aparelho — reinstalação aparece como aparelho novo. Este número SUPERESTIMA aparelhos e trocas.',
  'Em rede móvel (4G), operadoras usam CGNAT: pessoas diferentes saem com o mesmo código de rede. "Redes distintas" SUBESTIMA compartilhamento em quem usa celular.',
] as const;

export type EstadoAparelhos = {
  /** true = veio pelo menos uma conta acima do corte, e `linhas` tem o que mostrar. */
  temDado: boolean;
  /**
   * 🔴 true = NINGUÉM APUROU. O campo não veio do edge.
   *
   * É a distinção que o comentário deste tipo prometia e que a primeira versão não
   * implementou: `undefined`, `null` e `[]` colapsavam no mesmo estado, e a tela dizia
   * "nenhuma conta com mais de um aparelho registrado" — uma afirmação sobre um número
   * que ninguém tinha olhado. É o mesmo pecado que o `cota-email.ts` documenta no
   * cabeçalho ("um zero inventado afirma que a cota está ótima"), cometido duas semanas
   * depois no card ao lado. Medido em 2026-08-14: `app.perfil_aparelho` tem 0 linhas.
   */
  semDado: boolean;
  linhas: AparelhoLinha[];
  /** maior contagem, para escalar as barras */
  maxAparelhos: number;
};

/**
 * 🔴 O CONTRATO DO EDGE, verificado — não suposto:
 *
 *   `aparelhosResumoDoPainel()` (app-dqfb, supabase/functions/admin-painel/index.ts:283)
 *   abre com `if (!rows?.length) return undefined;` e o `catch` da chamada (linha 564-566)
 *   também devolve `undefined`. Como `JSON.stringify` descarta chave de valor `undefined`,
 *   o campo `aparelhos_resumo` sai AUSENTE do payload.
 *
 * Logo, hoje o edge manda uma de duas coisas: um array com 1+ linhas, ou nada. Ele NUNCA
 * manda `[]` e NUNCA manda `null`.
 *
 * ⚠️ E ele colapsa TRÊS realidades no mesmo "ausente": tabela vazia, ninguém acima do
 * corte (a RPC tem `having count(*) >= 2`) e RPC que falhou/estourou o prazo. Por isso
 * ausente aqui NÃO PODE virar "ninguém compartilha" — a única leitura honesta é "não sei".
 * Enquanto o edge não separar os casos, o ramo `[]` abaixo é o contrato para frente:
 * array vazio significa RPC que respondeu sem nenhuma linha, e o caminho de falha
 * continua sendo o campo ausente.
 */
export function estadoDosAparelhos(linhas: AparelhoLinha[] | undefined | null): EstadoAparelhos {
  // campo AUSENTE = nada foi apurado.
  if (linhas == null) {
    return { temDado: false, semDado: true, linhas: [], maxAparelhos: 0 };
  }
  // array VAZIO = a RPC respondeu e nenhuma conta bate o critério. É informação.
  if (!linhas.length) {
    return { temDado: false, semDado: false, linhas: [], maxAparelhos: 0 };
  }
  return {
    temDado: true,
    semDado: false,
    linhas,
    maxAparelhos: Math.max(...linhas.map((l) => l.aparelhos), 1),
  };
}

/**
 * Rótulo do quanto a conta chama atenção. ⛔ NÃO é veredito, e o texto diz isso:
 * com CGNAT, muitas redes distintas pode ser só gente no 4G.
 */
export function sinal(l: AparelhoLinha): 'normal' | 'olhar' {
  // "olhar" quando há vários aparelhos ATIVOS vindo de várias redes. Nem um nem outro
  // sozinho basta: 4 aparelhos numa rede só é uma casa; 1 aparelho em 4 redes é alguém
  // que viaja.
  return l.ativos_30d >= 3 && l.redes_distintas >= 3 ? 'olhar' : 'normal';
}

/**
 * Texto que acompanha o número quando a conta chama atenção — `null` quando não chama.
 *
 * 🔴 Existe porque a cor sozinha não comunica: o laranja `#d68910` era o ÚNICO portador
 * do sinal na tela (WCAG 1.4.1), e quem olha o painel não tem como saber que aquele tom
 * quer dizer alguma coisa. Quem não distingue a cor não recebia informação nenhuma.
 *
 * ⛔ Continua NÃO sendo veredito: o critério é 3+ aparelhos ativos vindo de 3+ redes, e a
 * ressalva do CGNAT (que anda junto na tela) explica por que várias redes pode ser só
 * gente no 4G. O rótulo é "olhar", não "fraude".
 */
export function rotuloSinal(l: AparelhoLinha): string | null {
  return sinal(l) === 'olhar' ? 'Olhar' : null;
}

/** O que "Olhar" quer dizer — vai na tela junto das RESSALVAS, não escondido no código. */
export const LEGENDA_OLHAR =
  '"Olhar" marca conta com 3+ aparelhos ativos vindo de 3+ redes distintas. Não é veredito: com CGNAT, várias redes pode ser só gente usando 4G.';

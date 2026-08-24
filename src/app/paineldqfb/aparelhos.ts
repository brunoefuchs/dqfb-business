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
  /**
   * (Story 2.45) Aparelhos vistos em DOIS DIAS distintos, no relógio de Brasília.
   *
   * 🔴 `null` = a coluna não veio (edge publicada antes da migration). NÃO é zero — a
   * distinção existe porque "0 confirmados" e "não sei" levam a decisões opostas.
   */
  aparelhos_confirmados?: number | null;
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
  'O número grande conta INSTALAÇÕES distintas. Reinstalar o app (Android) zera o identificador, então reinstalação aparece como aparelho novo — este número SUPERESTIMA.',
  'O "confirmado" ao lado só conta aparelho que voltou em outro dia. Ele SUBESTIMA: aparelho que existe mas é pouco usado não entra. Medido em 24/08 na conta do dono — 3 aparelhos reais, 1 confirmado.',
  'A verdade está ENTRE os dois números. Nenhum dos dois sozinho é a contagem certa.',
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


/**
 * (Story 2.45) O par que vai na tela: quantos aparelhos a conta tem DE VERDADE, e quantos
 * foram registrados.
 *
 * 🔴 **O BRUTO é quem julga, e isso foi um conserto — a primeira versão errou.**
 *
 * Eu tinha posto o CONFIRMADO como número principal, com o argumento de que a régua do dono
 * ("até 3 normal, acima de 3 preocupa") dispararia em quem só reinstalou. **O dono derrubou
 * na primeira leitura, em 24/08:** os 3 registros dele são **3 aparelhos DIFERENTES**, e o
 * app tinha até avisado por e-mail nos dois novos (`app.aviso_aparelho`, 17/08 11:53 e
 * 13:44). A regra dos 2 dias descartou 2 dos 3 — porque ele instalou e não voltou a abrir.
 *
 * A suposição "aparelho de verdade volta noutro dia" **é falsa para aparelho pouco usado**.
 *
 * ⚠️ E o erro de raciocínio por trás: subestimar é o lado seguro de quem **bloqueia**, não
 * de quem **monitora**. O dono disse "sem bloqueio, só monitorar" — e para monitorar,
 * esconder é pior que inflar. Com o confirmado como principal, quem instala em 10 celulares
 * e usa pouco aparece como **1**.
 *
 * ⚠️ Nenhum dos dois é a verdade: o bruto infla com reinstalação, o confirmado esconde uso
 * esparso. **A verdade está entre eles**, e o dado de hoje não diz onde. Por isso os dois
 * vão na tela.
 *
 * 🔵 `confirmados == null` ⇒ `incerto: true`. É a janela em que a edge subiu antes da
 * migration; a tela avisa em vez de inventar um zero.
 */
export function parDeAparelhos(l: AparelhoLinha): {
  julga: number;
  confirmados: number | null;
  incerto: boolean;
} {
  const c = l.aparelhos_confirmados;
  // 🔴 O número que JULGA é o BRUTO — instalações distintas, que é o que de fato sabemos.
  return { julga: l.aparelhos, confirmados: c ?? null, incerto: c == null };
}

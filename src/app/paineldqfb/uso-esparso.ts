/**
 * Story 2.66 — núcleo testável do card "Uso esparso de aparelhos".
 *
 * Módulo próprio pelo mesmo motivo de `aparelhos.ts` / `registro-legal.ts` / `sessoes.ts`:
 * `page.tsx` tem ~3200 linhas e importa React, fetch e o painel inteiro; um teste que a
 * importasse pagaria tudo isso para verificar meia dúzia de comparações.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔴 O QUE ESTE MÓDULO **NÃO** FAZ, E É A COISA MAIS IMPORTANTE SOBRE ELE
 *
 *   Ele **não decide se o sinal acende.** Quem decide é o banco, que conhece a régua do
 *   dono ("até 3 aparelhos é normal, acima de 3 preocupa"). O que chega aqui é
 *   `sinal_abuso` já resolvido.
 *
 *   Este repositório é **PÚBLICO**. Reescrever a régua aqui seria (a) uma segunda cópia
 *   dela, que diverge da primeira sem ninguém notar, e (b) publicar um detalhe operacional
 *   que não precisa estar publicado. O card pinta; ele não julga.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ⛔ **Isto não limita nada.** Mostrar não é limitar — a trava é decisão do dono, e ela já
 *    foi tomada nas Stories 2.23 e 2.45: monitorar, nunca bloquear.
 */

/**
 * Uma semana da série, como o servidor a entrega. Todos os números são NULL-áveis de
 * propósito: `null` é "não sei", e `0` é "medi e deu zero". Os dois levam a decisões
 * opostas, e é por isso que `Number(x ?? 0)` está proibido em todo este arquivo.
 */
export type SemanaUsoEsparso = {
  dia: string;
  medido_em: string | null;
  candidatos: number | null;
  desistencia: number | null;
  esparso_confirmado: number | null;
  suspeita: number | null;
  ctrl_neg_invertidas: number | null;
  ctrl_pos_pre: number | null;
  pos_gatilho_total: number | null;
  ctrl_pos_confirmados: number | null;
  confirmados_sem_login_novo: number | null;
  pct_confirmado: number | null;
  pre_confirmados_sem_login: number | null;
  /** chaves e valores são CONTAGENS: `{"3": 1}` = existe UMA conta com 3, não qual. */
  distribuicao_por_conta: Record<string, number> | null;
  contas_acima_de_3: number | null;
  /** 🔴 Resolvido NO BANCO. `null` = o campo não respondeu, e isso NÃO é "está tudo bem". */
  sinal_abuso: boolean | null;
};

/**
 * 🔴 A RESSALVA QUE MUDA A LEITURA DO CARD, e sem ela o dono lê o oposto do que o número
 * diz.
 *
 * Os campos dos blocos 1 e 2 são CUMULATIVOS desde 23/08/2026: eles SOBEM toda semana sem
 * nada piorar. Medido no acervo: 8 candidatos em 26/08 viraram 160 em 02/09. Quem vê "144
 * desistências, subindo" sem esta frase lê deterioração onde há acúmulo.
 *
 * A pergunta do dono ("tem conta compartilhando?") é respondida pela DISTRIBUIÇÃO e pelo
 * sinal — os dois instantâneos —, nunca pelos blocos, que são saúde da coleta.
 */
export const RESSALVAS_USO_ESPARSO = [
  'Os números de "saúde da coleta" abaixo são ACUMULADOS desde 23/08/2026 — eles sobem toda semana mesmo sem nada piorar. Subida ali não é deterioração, é acúmulo.',
  'Quem responde "tem conta compartilhando?" é a distribuição de aparelhos por conta, que é um retrato do momento, e o sinal ao lado dela.',
  '"Aparelho confirmado" só conta o que voltou em outro dia. Aparelho pouco usado não entra — este número SUBESTIMA, como no card de aparelhos.',
] as const;

/** O que "sinal aceso" quer dizer — na tela, junto do número, nunca escondido no código. */
export const LEGENDA_SINAL_USO_ESPARSO =
  'O sinal acende quando alguma conta passa do limite que o dono definiu. O limite mora no servidor, não neste painel — aqui o sinal já chega resolvido. Nada é bloqueado por causa dele.';

export type EstadoUsoEsparso = {
  /** true = veio pelo menos uma semana e `semanas` tem o que mostrar. */
  temSerie: boolean;
  /**
   * 🔴 true = NINGUÉM APUROU. O campo não veio da edge.
   *
   * ⛔ Isto NÃO é "nenhuma conta acima do limite". A distinção é a razão de o módulo
   * existir: um card que diz "está tudo bem" sobre uma medição que nunca aconteceu é o
   * mesmo defeito que deixou o monitor do Mailtrap morto por meses.
   */
  semSerie: boolean;
  semanas: SemanaUsoEsparso[];
  /** a semana mais recente (a série chega em ordem decrescente de dia) — `null` sem série */
  atual: SemanaUsoEsparso | null;
  /**
   * 🔴 TRÊS valores, não dois: `true` aceso · `false` apagado · `null` NÃO RESPONDEU.
   * `null` chega à tela como "—", nunca como "tudo bem".
   */
  sinalAceso: boolean | null;
  /** a distribuição da semana atual, já ordenada por nº de aparelhos — `[]` sem série */
  distribuicao: Array<{ aparelhos: number; contas: number }>;
};

/**
 * 🔴 O CONTRATO DA EDGE, verificado — não suposto:
 *
 *   `carregarMedicaoUsoEsparso()` (app-dqfb, supabase/functions/admin-painel/index.ts)
 *   devolve `undefined` em TRÊS caminhos: zero linhas, `error` retornado pela RPC e
 *   exceção. Como `JSON.stringify` descarta chave de valor `undefined`, o campo
 *   `medicao_uso_esparso` sai AUSENTE do payload nos três.
 *
 *   Os dois primeiros se distinguem por `medicao_uso_esparso_erro`: `null` = ninguém
 *   mediu ainda; string = a leitura quebrou. Quem separa isso é a TELA, com o campo de
 *   erro ao lado — este módulo só entrega `semSerie`.
 */
export function estadoDoUsoEsparso(
  semanas: SemanaUsoEsparso[] | undefined | null,
): EstadoUsoEsparso {
  if (!semanas || semanas.length === 0) {
    return { temSerie: false, semSerie: true, semanas: [], atual: null, sinalAceso: null, distribuicao: [] };
  }
  const atual = semanas[0];
  return {
    temSerie: true,
    semSerie: false,
    semanas,
    atual,
    // 🔴 só `true`/`false` passam. Qualquer outra coisa vira `null` — e `null` chega à tela
    // como "—". Um booleano ausente virando `false` afirmaria "ninguém compartilha" sobre
    // algo que não respondeu.
    sinalAceso: typeof atual.sinal_abuso === 'boolean' ? atual.sinal_abuso : null,
    distribuicao: distribuicaoOrdenada(atual.distribuicao_por_conta),
  };
}

/**
 * O jsonb `{"0":215,"1":335,"2":10,"3":1}` vira uma lista ordenada por número de
 * aparelhos.
 *
 * ⛔ Chave que não é número inteiro é DESCARTADA, não convertida para 0: um `NaN` no eixo
 * faria a barra do balde "0 aparelhos" absorver lixo e o card mentiria justamente no balde
 * mais cheio.
 */
export function distribuicaoOrdenada(
  d: Record<string, number> | null | undefined,
): Array<{ aparelhos: number; contas: number }> {
  if (!d || typeof d !== 'object') return [];
  return Object.entries(d)
    .filter(([k, v]) => /^\d+$/.test(k) && typeof v === 'number' && Number.isFinite(v))
    .map(([k, v]) => ({ aparelhos: Number(k), contas: v }))
    .sort((a, b) => a.aparelhos - b.aparelhos);
}

/**
 * Data BR curta para o eixo da série (`2026-09-02` → `02/09`).
 *
 * ⛔ NÃO usa `new Date(dia)`: `'2026-09-02'` é interpretado como UTC e vira 01/09 no fuso
 * de Brasília. É o mesmo dia-de-calendário-BR que o banco gravou; fatiar o texto é a
 * leitura fiel, e converter seria introduzir um erro de um dia sem ganho nenhum.
 */
export function diaCurtoBr(dia: string | null | undefined): string {
  if (typeof dia !== 'string') return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia);
  return m ? `${m[3]}/${m[2]}` : dia;
}

/**
 * 🔴 O RÓTULO DE UMA SEMANA NA LISTA DE MEDIÇÕES ANTERIORES — a regra que o achado MAJOR
 * do CodeRabbit (02/09/2026) atingiu, agora numa função PURA em vez de uma cadeia de
 * ternários dentro do JSX.
 *
 * **O SINAL MANDA, NÃO A CONTAGEM.** `contas_acima_de_3` é NULL-ável: a versão original
 * avaliava a contagem primeiro e, com ela ausente e o sinal ACESO, caía no ramo final
 * escrevendo «ninguém acima do limite» — a tela afirmando o OPOSTO do que o banco disse.
 *
 * ⚠️ **Por que a regra saiu do JSX:** o conserto tinha sido cercado por uma guarda que lia
 * o `page.tsx` como texto, e a `@qa` a derrubou reintroduzindo o defeito no JSX e deixando
 * as frases que a guarda procurava dentro de um COMENTÁRIO — 15/15 verdes. Numa função
 * pura, o detector é direto: mutar a ordem dos ramos vermelha o teste unitário abaixo, e
 * deixar de chamá-la vermelha a guarda de fiação. [[conserto-no-call-site-nasce-sem-detector]]
 *
 * Os quatro estados, nesta ordem, e a ordem É a regra:
 *   `sinal_abuso` nulo          → «—» (não respondeu; NUNCA "está tudo bem")
 *   contagem > 0                → «N acima do limite»
 *   sinal aceso, contagem nula  → «acima do limite — quantidade não informada»
 *   sinal apagado               → «ninguém acima do limite»
 */
export function rotuloDaSemana(s: Pick<SemanaUsoEsparso, 'sinal_abuso' | 'contas_acima_de_3'>): string {
  if (typeof s.sinal_abuso !== 'boolean') return '—';
  if (s.contas_acima_de_3 != null && s.contas_acima_de_3 > 0) {
    return `${s.contas_acima_de_3} acima do limite`;
  }
  if (s.sinal_abuso === true) return 'acima do limite — quantidade não informada';
  return 'ninguém acima do limite';
}

/**
 * Quantas contas a série atual conhece (a soma dos baldes). `null` quando não há série —
 * ⛔ nunca 0, que a tela leria como "não existe conta nenhuma".
 */
export function contasNaSerie(e: EstadoUsoEsparso): number | null {
  if (!e.temSerie || e.distribuicao.length === 0) return null;
  return e.distribuicao.reduce((s, b) => s + b.contas, 0);
}

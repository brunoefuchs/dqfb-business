/**
 * Story 2.27 (T10) — núcleo testável do card "Registro legal de acesso".
 *
 * Módulo próprio pelo mesmo motivo de `cota-email.ts`: `page.tsx` tem ~2600 linhas e
 * importa React, fetch e o painel inteiro; um teste que a importasse pagaria tudo isso
 * para verificar meia dúzia de comparações.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔴 O QUE ESTE MÓDULO **NÃO** FAZ, E É A COISA MAIS IMPORTANTE SOBRE ELE
 *
 *   Ele **não decide se um sinal acende.** Quem decide é o banco, que conhece a
 *   periodicidade de cada rotina (uma diária e uma horária não podem ter o mesmo
 *   limiar) e o gatilho de volume. O que chega aqui é o `aceso` já resolvido.
 *
 *   Este repositório é **PÚBLICO**. Reescrever a régra aqui seria (a) uma segunda cópia
 *   dela, que diverge da primeira sem ninguém notar, e (b) publicar um detalhe operacional
 *   que não precisa estar publicado. O card pinta; ele não julga.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ⛔ E nada aqui nomeia o schema de origem, chave nenhuma, nem mecanismo de encriptação.
 *    O que atravessa é rótulo de sinal, booleano e número.
 */

/** Um sinal, como o servidor o entrega. `aceso: null` = o sinal não respondeu. */
export type SinalRegistroLegal = {
  sinal: string;
  aceso: boolean | null;
  medida: string | null;
  numero: number | null;
  limiar: string | null;
};

export type LinhaCard = {
  sinal: string;
  /** o que a pessoa lê na linha */
  rotulo: string;
  /** `null` = o sinal não respondeu; a tela escreve "—", nunca "ok" */
  aceso: boolean | null;
  numero: number | null;
  /** texto do limiar, vindo do servidor — a tela não o inventa */
  limiar: string | null;
  medida: string | null;
};

export type EstadoRegistroLegal = {
  /** false = nada apurado. O card mostra "ainda não medido", NUNCA "tudo certo". */
  temMedicao: boolean;
  linhas: LinhaCard[];
  /** quantos sinais estão acesos — 0 com `temMedicao` é o único "tudo certo" honesto */
  acesos: number;
  /** algum sinal veio sem resposta: não dá para afirmar saúde nem falha */
  indefinidos: number;
  nivel: 'sem_medicao' | 'ok' | 'atencao';
};

/**
 * Rótulos em português, e **nenhum jargão**: quem lê este painel não precisa saber o nome
 * das rotinas nem do mecanismo. "Expurgo" vira "limpeza dos registros vencidos".
 *
 * 🔴 Sinal DESCONHECIDO não é descartado — entra com o próprio nome. Se o servidor ganhar
 * um oitavo sinal e o painel não souber dele, sumir da tela seria o pior resultado
 * possível: o card ficaria verde escondendo um alerta novo. Aparecer feio é melhor que
 * não aparecer.
 */
const ROTULOS: Record<string, string> = {
  falhas: 'falhas ao gravar hoje',
  expurgo: 'limpeza dos registros vencidos',
  rotacao: 'renovação diária da proteção',
  anulacao: 'limpeza de hora em hora',
  volume: 'volume guardado',
  privilegio: 'permissões do próprio medidor',
  hook_ligado: 'a gravação está ligada',
};

/**
 * 🔴 A ordem é FIXA e começa pelo que mais importa. `hook_ligado` primeiro porque ele
 * responde a única pergunta que faz o resto ter sentido: *está gravando?* Um card em que
 * "nada foi capturado" e "tudo saudável" têm a mesma cor foi o defeito que originou este
 * sinal — ele não pode ficar no rodapé.
 */
const ORDEM = ['hook_ligado', 'falhas', 'privilegio', 'anulacao', 'expurgo', 'rotacao', 'volume'];

export function estadoDoRegistroLegal(
  sinais: SinalRegistroLegal[] | undefined | null,
): EstadoRegistroLegal {
  if (!sinais || sinais.length === 0) {
    return { temMedicao: false, linhas: [], acesos: 0, indefinidos: 0, nivel: 'sem_medicao' };
  }

  const linhas: LinhaCard[] = sinais
    .map((s) => ({
      sinal: s.sinal,
      rotulo: ROTULOS[s.sinal] ?? s.sinal,
      // 🔴 só `true`/`false` passam. Qualquer outra coisa vira `null` — e `null` chega à
      // tela como "—", nunca como "ok". Um booleano ausente virando `false` afirmaria
      // saúde sobre um sinal que não respondeu, que é o zero inventado com outra roupa.
      aceso: typeof s.aceso === 'boolean' ? s.aceso : null,
      numero: typeof s.numero === 'number' && Number.isFinite(s.numero) ? s.numero : null,
      limiar: s.limiar,
      medida: s.medida,
    }))
    .sort((a, b) => posicao(a.sinal) - posicao(b.sinal));

  const acesos = linhas.filter((l) => l.aceso === true).length;
  const indefinidos = linhas.filter((l) => l.aceso === null).length;
  return {
    temMedicao: true,
    linhas,
    acesos,
    indefinidos,
    // 🔴 Sinal sem resposta conta como ATENÇÃO, não como ok. "Não sei" e "está tudo bem"
    // são estados diferentes, e o card inteiro existe porque um dia foram a mesma cor.
    nivel: acesos > 0 || indefinidos > 0 ? 'atencao' : 'ok',
  };
}

/** Conhecidos na ordem de ORDEM; desconhecidos no fim, mas presentes. */
function posicao(sinal: string): number {
  const i = ORDEM.indexOf(sinal);
  return i === -1 ? ORDEM.length : i;
}

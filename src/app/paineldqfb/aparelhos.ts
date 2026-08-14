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
  /** false = ninguém tem 2+ aparelhos ainda, OU o app não foi publicado. Ver `semDado`. */
  temDado: boolean;
  linhas: AparelhoLinha[];
  /** maior contagem, para escalar as barras */
  maxAparelhos: number;
};

export function estadoDosAparelhos(linhas: AparelhoLinha[] | undefined | null): EstadoAparelhos {
  if (!linhas?.length) {
    return { temDado: false, linhas: [], maxAparelhos: 0 };
  }
  return {
    temDado: true,
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

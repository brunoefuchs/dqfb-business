/**
 * Data em fuso BR (America/Sao_Paulo) — o dia bate com o calendário da Fran.
 *
 * Saiu de dentro do `page.tsx` (era `fmtData`, ~linha 1521) pelo mesmo motivo do
 * `cota-email.ts` e do `aparelhos.ts`: a página tem ~2700 linhas e importá-la num teste
 * pagaria React, fetch e o painel inteiro para verificar uma formatação de data.
 */

/**
 * 🔴 DATA-ONLY NÃO PASSA POR `Date`.
 *
 * `new Date('2026-08-31')` é meia-noite **UTC**. Formatar isso com
 * `timeZone: 'America/Sao_Paulo'` (UTC-3) volta três horas e imprime **30/08** — um dia a
 * menos, sempre, sem exceção.
 *
 * Não é hipótese: `periodo_fim` é `date` no Postgres
 * (migration `20260814010000_app_mailtrap_quota_atual.sql:40`), chega como `'2026-08-31'`,
 * e o card "Cota de e-mail" anunciava o reset da cota para o dia anterior ao real.
 *
 * Quando a string é só o dia, não há fuso nenhum a converter: reordenar os pedaços é a
 * operação certa. `Date` só entra quando existe instante de verdade para converter.
 */
const SO_DIA = /^(\d{4})-(\d{2})-(\d{2})$/;

export function fmtDataBr(iso: string | null | undefined): string {
  if (!iso) return '';
  const soDia = SO_DIA.exec(iso);
  if (soDia) return `${soDia[3]}/${soDia[2]}/${soDia[1]}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

#!/usr/bin/env node
/**
 * Bancada de MUTAÇÃO do painel — Story 2.66 / AC7 (`.claude/rules/test-must-prove.md`).
 *
 * Prova as duas metades que o AC7 exige, e elas medem coisas diferentes:
 *
 *   1. **mutar o MÓDULO** (`uso-esparso.ts`) tem de vermelhar `uso-esparso.test.ts`;
 *   2. **voltar a calcular inline no `page.tsx`** tem de vermelhar `page-fiacao.test.ts`.
 *
 * Sem a segunda, o defeito clássico deste repositório volta: o teste exercita um módulo, a
 * tela calcula a mesma coisa por dentro, e os dois ficam verdes sem nunca se falarem —
 * aconteceu três vezes aqui (2.19, 2.21 e a 1ª versão da 12.B4).
 *
 * 🔴 A BANCADA É VERSIONADA de propósito. Bancada em pasta temporária se perde entre
 *    sessões, e o mutante vira uma frase na story em vez de uma prova reexecutável.
 *
 * 🔴 O ARQUIVO REAL É RESTAURADO POR HASH depois de CADA mutante, não "no fim". Se a
 *    restauração falhar, o processo aborta gritando — deixar um mutante no fonte é pior
 *    que não rodar a bancada.
 *
 * Rodar (da raiz do dqfb-business):
 *   node mutantes-2.66-painel.mjs
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const MODULO = 'src/app/paineldqfb/uso-esparso.ts';
const PAGE = 'src/app/paineldqfb/page.tsx';

const original = new Map([
  [MODULO, readFileSync(MODULO, 'utf8')],
  [PAGE, readFileSync(PAGE, 'utf8')],
]);
const sha = (s) => createHash('sha256').update(s).digest('hex');
const hashOriginal = new Map([...original].map(([k, v]) => [k, sha(v)]));

/** Restaura e CONFERE. Um `writeFileSync` que não deu certo é silencioso. */
function restaurar() {
  for (const [arquivo, texto] of original) {
    writeFileSync(arquivo, texto);
    const agora = sha(readFileSync(arquivo, 'utf8'));
    if (agora !== hashOriginal.get(arquivo)) {
      console.error(`\n🔴🔴 ${arquivo} NÃO VOLTOU AO ORIGINAL. Restaure à mão antes de commitar.`);
      process.exit(2);
    }
  }
}
/**
 * 🔴 REDE DE SEGURANÇA, E ELA PRECISA DOS SINAIS — não só de `exit`.
 *
 * A primeira versão tinha só `process.on('exit')`, e isso NÃO BASTOU: um `timeout` externo
 * de 10 minutos matou a bancada no meio do 10º mutante com SIGTERM, o handler de `exit`
 * nunca rodou, e o mutante P10 FICOU no `page.tsx`. Só apareceu porque a conferência
 * seguinte procurou a frase original e achou zero — mais um passo e teria sido commitado.
 * É o parente do [[timeout-em-bancada-docker-pula-a-limpeza]]: interrupção externa pula a
 * limpeza, e sem mensagem de erro.
 */
function socorro(motivo) {
  let mexeu = false;
  for (const [arquivo, texto] of original) {
    try {
      if (sha(readFileSync(arquivo, 'utf8')) !== hashOriginal.get(arquivo)) {
        writeFileSync(arquivo, texto);
        mexeu = true;
      }
    } catch { /* nada a fazer na saída */ }
  }
  if (mexeu) console.error(`\n⚠️  ${motivo}: fonte(s) restaurado(s) pela rede de segurança.`);
}
process.on('exit', () => socorro('saída'));
for (const sinal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sinal, () => { socorro(sinal); process.exit(130); });
}

const MUTANTES = [
  {
    id: 'P1 · AC7 — `estadoDoUsoEsparso` devolve CONSTANTE (o módulo para de medir)',
    arquivo: MODULO,
    aplica: (s) => s.replace(
      '  if (!semanas || semanas.length === 0) {',
      '  if (true) {',
    ),
    marca: 'série presente ⇒ a semana mais recente é a `atual`, com o sinal do BANCO',
    asercao: 'AC7 · o módulo decide de verdade — não devolve o mesmo estado sempre',
  },
  {
    id: 'P2 · AC7 — sinal não-booleano vira `false` (o falso inventado)',
    arquivo: MODULO,
    aplica: (s) => s.replace(
      "    sinalAceso: typeof atual.sinal_abuso === 'boolean' ? atual.sinal_abuso : null,",
      '    sinalAceso: !!atual.sinal_abuso,',
    ),
    marca: 'sinal que não é booleano vira `null`, nunca `false`',
    asercao: 'AC7 · "não respondeu" e "está tudo bem" não podem ser o mesmo estado',
  },
  {
    id: 'P3 · D4 — a régua do dono é RECALCULADA no painel (repositório PÚBLICO)',
    arquivo: MODULO,
    aplica: (s) => s.replace(
      "    sinalAceso: typeof atual.sinal_abuso === 'boolean' ? atual.sinal_abuso : null,",
      '    sinalAceso: (atual.contas_acima_de_3 ?? 0) > 3,',
    ),
    marca: 'o sinal ACESO chega pronto — a régua do dono não é recalculada aqui',
    asercao: 'D4 · quem decide se acende é o BANCO; o painel pinta, não julga',
  },
  {
    id: 'P4 · AC7 — `contasNaSerie` devolve 0 em vez de `null` sem série',
    arquivo: MODULO,
    aplica: (s) => s.replace(
      '  if (!e.temSerie || e.distribuicao.length === 0) return null;',
      '  if (!e.temSerie || e.distribuicao.length === 0) return 0;',
    ),
    marca: 'sem série devolve `null`, nunca 0',
    asercao: 'AC7 · `0 contas` na tela é falso e alarmante; `null` é "não sei"',
  },
  {
    id: 'P5 · AC7 — `distribuicaoOrdenada` deixa de filtrar chave não-inteira',
    arquivo: MODULO,
    aplica: (s) => s.replace(
      '    .filter(([k, v]) => /^\\d+$/.test(k) && typeof v === \'number\' && Number.isFinite(v))',
      '    .filter(([, v]) => typeof v === \'number\')',
    ),
    marca: 'chave que não é inteiro é DESCARTADA, nunca convertida para 0',
    asercao: 'AC7 · `Number("abc")` é NaN e contaminaria o balde mais cheio',
  },
  {
    id: 'P6 · AC7 — `diaCurtoBr` passa por `new Date` (volta um dia no fuso BR)',
    arquivo: MODULO,
    aplica: (s) => s.replace(
      '  return m ? `${m[3]}/${m[2]}` : dia;',
      "  return m ? new Date(dia).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : dia;",
    ),
    marca: 'fatia o texto — NÃO passa por `new Date`, que voltaria um dia no fuso BR',
    asercao: 'AC7 · o dia gravado JÁ é o dia de calendário BR',
  },
  {
    id: 'P7 · AC7 (fiação) — a tela volta a CALCULAR inline, sem chamar o módulo',
    arquivo: PAGE,
    aplica: (s) => s.replace(
      '  const usoEsparso = estadoDoUsoEsparso(d.medicao_uso_esparso);',
      '  const usoEsparso = { temSerie: !!d.medicao_uso_esparso?.length, semSerie: !d.medicao_uso_esparso?.length, semanas: d.medicao_uso_esparso ?? [], atual: d.medicao_uso_esparso?.[0] ?? null, sinalAceso: !!d.medicao_uso_esparso?.[0]?.sinal_abuso, distribuicao: [] as Array<{ aparelhos: number; contas: number }> };',
    ),
    marca: 'o card de uso esparso usa `estadoDoUsoEsparso`, não uma cópia',
    asercao: 'AC7 · mutar o módulo tem de quebrar a TELA — senão o módulo não é o que está no ar',
  },
  {
    id: 'P8 · AC7 (fiação) — o terceiro estado do sinal some da tela',
    arquivo: PAGE,
    aplica: (s) => s.replace(
      '                ) : usoEsparso.sinalAceso === null ? (\n                  /* 🔴 TERCEIRO estado: medi a série, mas o sinal não respondeu. Não é\n                     "tudo bem" — sai como "—", igual ao card do registro legal. */\n                  <>o sinal não respondeu nesta medição</>\n',
      '                ) : false ? (\n                  <>—</>\n',
    ),
    marca: 'o card distingue os TRÊS estados do sinal',
    asercao: 'AC7 · sinal que não respondeu volta a sair como "está tudo bem"',
  },
  {
    id: 'P9 · AC7 (fiação) — o rótulo do ACÚMULO sai do card',
    arquivo: PAGE,
    aplica: (s) => s.replace(
      '                Saúde da coleta — <strong>acumulado desde 23/08/2026</strong>',
      '                Saúde da coleta',
    ),
    marca: 'o rótulo do ACÚMULO está na tela, junto dos números',
    asercao: 'achado 8 · sem o rótulo, acúmulo é lido como deterioração',
  },
  {
    id: 'P10 · AC7 (fiação) — "não medido" passa a usar a MESMA frase da falha de leitura',
    arquivo: PAGE,
    aplica: (s) => s.replace(
      '              ainda não medido — a medição roda toda segunda, de madrugada',
      '              a leitura falhou — o card não afirma nada enquanto isso',
    ),
    marca: '"não medido" e "a leitura falhou" NÃO saem com a mesma frase',
    asercao: 'AC7 · uma RPC quebrada se disfarçaria de "a 1ª medição ainda não rodou"',
  },
  {
    // 🔴 O mutante do achado do CodeRabbit (02/09): volta a ordem antiga, em que a
    // CONTAGEM decide antes do SINAL. Sem ele, o conserto não tem detector.
    id: 'P11 · AC7 (fiação) — a CONTAGEM volta a decidir antes do SINAL na lista de semanas',
    arquivo: PAGE,
    aplica: (s) => s.replace(
      `                      {s.sinal_abuso === null
                        ? '—'
                        : s.contas_acima_de_3 != null && s.contas_acima_de_3 > 0
                          ? \`\${s.contas_acima_de_3} acima do limite\`
                          : s.sinal_abuso === true
                            ? 'acima do limite — quantidade não informada'
                            : 'ninguém acima do limite'}`,
      `                      {s.contas_acima_de_3 != null && s.contas_acima_de_3 > 0
                        ? \`\${s.contas_acima_de_3} acima do limite\`
                        : s.sinal_abuso === null
                          ? '—'
                          : 'ninguém acima do limite'}`,
    ),
    marca: 'na lista de semanas, o SINAL decide antes da CONTAGEM',
    asercao: 'AC7 · sinal ACESO com contagem nula sairia como "ninguém acima do limite"',
  },
];

/**
 * Roda SÓ o arquivo de teste que o mutante visa. O startup do `vitest` (jsdom) domina o
 * tempo, e rodar a pasta inteira 11 vezes estourava dez minutos — foi o que provocou a
 * interrupção que deixou um mutante no fonte.
 */
function rodarVitest(arquivoTeste) {
  try {
    return {
      ok: true,
      saida: execFileSync('npx', ['vitest', 'run', arquivoTeste], {
        encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'],
      }),
    };
  } catch (e) {
    return { ok: false, saida: (e.stdout || '') + (e.stderr || '') };
  }
}

let mordeu = 0;
const sobreviventes = [];

for (const m of MUTANTES) {
  const base = original.get(m.arquivo);
  const out = m.aplica(base);
  if (out === base) {
    console.error(`\n🔴 ABORTADO — ${m.id}: a substituição NÃO casou (no-op mudo). Reancore o alvo.`);
    restaurar();
    process.exit(1);
  }
  writeFileSync(m.arquivo, out);
  // mutante do módulo → o teste unitário; mutante do `page.tsx` → a guarda de fiação.
  const alvo = m.arquivo === MODULO
    ? 'src/app/paineldqfb/uso-esparso.test.ts'
    : 'src/app/paineldqfb/page-fiacao.test.ts';
  const { ok, saida } = rodarVitest(alvo);
  restaurar();

  if (ok) {
    sobreviventes.push(m);
    console.log(`\n❌ SOBREVIVEU — ${m.id}\n   esperava vermelhar: ${m.asercao}`);
    continue;
  }
  // 🔴 Não basta a suíte ficar vermelha: o teste VISADO tem de ser o que vermelhou. Um
  // erro de sintaxe também derruba tudo, sem nenhuma asserção ter sido exercitada.
  const acertou = saida.includes(m.marca);
  const linha = (saida.split('\n').find((l) => l.includes('FAIL') || l.includes('×')) || '').trim();
  console.log(`\n${acertou ? '✅' : '⚠️ '} MORDEU — ${m.id}`);
  console.log(`   efeito:  ${(acertou ? m.marca : linha).slice(0, 220)}`);
  if (acertou) mordeu++;
  else {
    console.error(`   🔴 mordida INVÁLIDA: o teste visado («${m.marca}») não vermelhou.`);
    if (process.env.MUT_DEBUG) console.error(saida.slice(-3000));
    process.exitCode = 1;
  }
}

restaurar();
console.log(`\n════ ${mordeu}/${MUTANTES.length} mutantes morderam ════`);
if (sobreviventes.length) {
  console.log('🔴 SOBREVIVENTES (asserções que não estavam medindo nada):');
  sobreviventes.forEach((m) => console.log(`   • ${m.id} → ${m.asercao}`));
  process.exitCode = 1;
}
process.exit(process.exitCode ?? 0);

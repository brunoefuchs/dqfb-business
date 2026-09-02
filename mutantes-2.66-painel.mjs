#!/usr/bin/env node
/**
 * Bancada de MUTAÇÃO do painel — Story 2.66 / AC7 (`.claude/rules/test-must-prove.md`).
 *
 * Prova as três metades que o AC7 exige, e elas medem coisas diferentes:
 *
 *   1. **mutar o MÓDULO** (`uso-esparso.ts`) tem de vermelhar `uso-esparso.test.ts`;
 *   2. **mutar o CARD** (`uso-esparso-card.tsx`) tem de vermelhar `uso-esparso-card.test.tsx`,
 *      que RENDERIZA e afirma sobre o DOM;
 *   3. **desligar o card da tela** tem de vermelhar a guarda de fiação em `page-fiacao.test.ts`.
 *
 * Sem a terceira, o defeito clássico deste repositório volta: o teste exercita um módulo, a
 * tela calcula a mesma coisa por dentro, e os dois ficam verdes sem nunca se falarem —
 * aconteceu três vezes aqui (2.19, 2.21 e a 1ª versão da 12.B4).
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔴 A BANCADA MUTA UMA CÓPIA, NUNCA O ARQUIVO RASTREADO — conserto de F-2.66-01
 *
 * As duas versões anteriores escreviam o mutante DENTRO de `src/app/paineldqfb/` e tentavam
 * restaurar na saída. Nenhuma das duas funcionou, e a `@qa` provou:
 *
 *   v1: só `process.on('exit')`. Um `timeout` externo matou a bancada com SIGTERM no 10º
 *       mutante e o P10 ficou dentro do `page.tsx`.
 *   v2: handlers de `SIGINT`/`SIGTERM`/`SIGHUP`. **Também não segura** — Node só executa
 *       handler de sinal quando o event loop está livre, e o laço fica DENTRO de
 *       `execFileSync('npx', ['vitest', …])`, que bloqueia por ~45 s. A `@qa` mandou
 *       SIGTERM, o processo seguiu vivo 20 s e, depois do SIGKILL, o mutante P5 continuava
 *       em `uso-esparso.ts`. **Trocar de gancho não resolve: o problema é o bloqueio.**
 *
 * O `dqfb-business` faz deploy automático na Vercel ao push da `main`. Um `git add -A`
 * depois de uma bancada interrompida publica o mutante em produção.
 *
 * A prior-art estava na própria story: `supabase/functions/admin-painel/_tests/2.66-mutantes.mjs`
 * (app-dqfb) copia a árvore para `mkdtempSync` e muta a CÓPIA. Aqui é o mesmo, com uma
 * diferença de ambiente: o Vitest precisa de `node_modules`, então a cópia leva `src/` e as
 * configs, e `node_modules` entra por LIGAÇÃO SIMBÓLICA (copiar 400 MB por mutante seria
 * inviável, e o link é só de leitura para o Vitest).
 *
 * 🔬 Assim, sinal nenhum pode sujar o fonte: o arquivo rastreado NUNCA é aberto para
 *    escrita. O mutante da `@qa` (matar a bancada no meio) passa a ser inofensivo por
 *    CONSTRUÇÃO, não por handler — e o `verificarIntocado()` confere isso por hash a cada
 *    mutante e no fim.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ Um resíduo declarado: matar a bancada com `SIGKILL` deixa o diretório temporário para
 *    trás (o `finally` não roda). É lixo em `/tmp`, fora do repositório — nunca o fonte. Foi
 *    medido ao reaplicar o mutante da `@qa`, e é a diferença entre "sujou o /tmp" e "sujou o
 *    que vai para a Vercel".
 *
 * 🔴 A RODADA BASE VEM PRIMEIRO (conserto de F-2.66-03). Sem ela, «N/N morderam» sairia
 *    igual com a base quebrada — com a base quebrada TODO mutante «morde». Se a base não
 *    vier verde, a bancada ABORTA sem rodar mutante nenhum.
 *
 * Rodar (da raiz do dqfb-business):
 *   node mutantes-2.66-painel.mjs
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const MODULO = 'src/app/paineldqfb/uso-esparso.ts';
const CARD = 'src/app/paineldqfb/uso-esparso-card.tsx';
const PAGE = 'src/app/paineldqfb/page.tsx';

const T_MODULO = 'src/app/paineldqfb/uso-esparso.test.ts';
const T_CARD = 'src/app/paineldqfb/uso-esparso-card.test.tsx';
const T_FIACAO = 'src/app/paineldqfb/page-fiacao.test.ts';

/** O que a cópia precisa para o Vitest rodar. `node_modules` entra por symlink. */
const COPIAR = ['src', 'package.json', 'vitest.config.ts', 'tsconfig.json'];

const base = new Map([
  [MODULO, readFileSync(MODULO, 'utf8')],
  [CARD, readFileSync(CARD, 'utf8')],
  [PAGE, readFileSync(PAGE, 'utf8')],
]);
const sha = (s) => createHash('sha256').update(s).digest('hex');
const hashBase = new Map([...base].map(([k, v]) => [k, sha(v)]));

/**
 * 🔬 A prova de que o conserto de F-2.66-01 vale: os arquivos RASTREADOS não mudaram de
 * hash. É barata, e é a única asserção que sustenta a frase "a bancada não suja o fonte" —
 * afirmá-la sem medir seria exatamente o erro que F-2.66-01 pune.
 */
function verificarIntocado(quando) {
  for (const [arquivo, hash] of hashBase) {
    const agora = sha(readFileSync(arquivo, 'utf8'));
    if (agora !== hash) {
      console.error(
        `\n🔴🔴 ${arquivo} MUDOU (${quando}). A bancada deveria mutar só a cópia — ` +
          'restaure com `git checkout --` e NÃO commite.',
      );
      process.exit(2);
    }
  }
}

/** Monta uma árvore descartável com o mutante dentro. Devolve a raiz. */
function copiaComMutante(arquivo, texto) {
  const raiz = mkdtempSync(join(tmpdir(), 'mut-2.66-painel-'));
  for (const alvo of COPIAR) cpSync(alvo, join(raiz, alvo), { recursive: true });
  // 🔴 `node_modules` por LIGAÇÃO, não por cópia: são centenas de MB e o Vitest só lê.
  symlinkSync(resolve('node_modules'), join(raiz, 'node_modules'), 'dir');
  if (arquivo) writeFileSync(join(raiz, arquivo), texto);
  return raiz;
}

/**
 * Roda SÓ o arquivo de teste que o mutante visa. O startup do Vitest (jsdom) domina o
 * tempo, e rodar a pasta inteira a cada mutante estourava dez minutos.
 */
function rodarVitest(raiz, arquivoTeste) {
  try {
    return {
      ok: true,
      saida: execFileSync('npx', ['vitest', 'run', arquivoTeste], {
        encoding: 'utf8', cwd: raiz, stdio: ['pipe', 'pipe', 'pipe'],
      }),
    };
  } catch (e) {
    return { ok: false, saida: (e.stdout || '') + (e.stderr || '') };
  }
}

/**
 * 🔴 Crédito da mordida pela régua ESTRITA (conserto de F-2.66-07).
 *
 * A versão anterior casava a marca na saída INTEIRA do Vitest, que inclui o *code frame*
 * do teste que falhou — um `it()` vizinho impresso ali creditava a asserção errada. A
 * bancada da edge já fazia certo (extrai os nomes das linhas `FAILED`); aqui é o mesmo,
 * com o formato do Vitest: as linhas de falha vêm marcadas com `×` ou `FAIL`.
 */
function testesQueVermelharam(saida) {
  return saida
    .split('\n')
    .filter((l) => /(^|\s)(×|✗|FAIL)\s/.test(l))
    .map((l) => l.replace(/^\s*[×✗]\s*/, '').replace(/^\s*FAIL\s*/, '').trim());
}

const MUTANTES = [
  {
    id: 'P1 · AC7 — `estadoDoUsoEsparso` devolve CONSTANTE (o módulo para de medir)',
    arquivo: MODULO, teste: T_MODULO,
    aplica: (s) => s.replace('  if (!semanas || semanas.length === 0) {', '  if (true) {'),
    marca: 'série presente ⇒ a PRIMEIRA linha é a `atual` (a ordem é contrato do banco)',
    asercao: 'AC7 · o módulo decide de verdade — não devolve o mesmo estado sempre',
  },
  {
    id: 'P2 · AC7 — sinal não-booleano vira `false` (o falso inventado)',
    arquivo: MODULO, teste: T_MODULO,
    aplica: (s) => s.replace(
      "    sinalAceso: typeof atual.sinal_abuso === 'boolean' ? atual.sinal_abuso : null,",
      '    sinalAceso: !!atual.sinal_abuso,',
    ),
    marca: 'sinal que não é booleano vira `null`, nunca `false`',
    asercao: 'AC7 · "não respondeu" e "está tudo bem" não podem ser o mesmo estado',
  },
  {
    id: 'P3 · D4 — a régua do dono é RECALCULADA no painel (repositório PÚBLICO)',
    arquivo: MODULO, teste: T_MODULO,
    aplica: (s) => s.replace(
      "    sinalAceso: typeof atual.sinal_abuso === 'boolean' ? atual.sinal_abuso : null,",
      '    sinalAceso: (atual.contas_acima_de_3 ?? 0) > 3,',
    ),
    marca: 'o sinal ACESO chega pronto — a régua do dono não é recalculada aqui',
    asercao: 'D4 · quem decide se acende é o BANCO; o painel pinta, não julga',
  },
  {
    id: 'P4 · AC7 — `contasNaSerie` devolve 0 em vez de `null` sem série',
    arquivo: MODULO, teste: T_MODULO,
    aplica: (s) => s.replace(
      '  if (!e.temSerie || e.distribuicao.length === 0) return null;',
      '  if (!e.temSerie || e.distribuicao.length === 0) return 0;',
    ),
    marca: 'sem série devolve `null`, nunca 0',
    asercao: 'AC7 · `0 contas` na tela é falso e alarmante; `null` é "não sei"',
  },
  {
    id: 'P5 · AC7 — `distribuicaoOrdenada` deixa de filtrar chave não-inteira',
    arquivo: MODULO, teste: T_MODULO,
    aplica: (s) => s.replace(
      "    .filter(([k, v]) => /^\\d+$/.test(k) && typeof v === 'number' && Number.isFinite(v))",
      "    .filter(([, v]) => typeof v === 'number')",
    ),
    marca: 'chave que não é inteiro é DESCARTADA, nunca convertida para 0',
    asercao: 'AC7 · `Number("abc")` é NaN e contaminaria o balde mais cheio',
  },
  {
    id: 'P6 · AC7 — `diaCurtoBr` passa por `new Date` (volta um dia no fuso BR)',
    arquivo: MODULO, teste: T_MODULO,
    aplica: (s) => s.replace(
      '  return m ? `${m[3]}/${m[2]}` : dia;',
      "  return m ? new Date(dia).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : dia;",
    ),
    marca: 'fatia o texto — NÃO passa por `new Date`, que voltaria um dia no fuso BR',
    asercao: 'AC7 · o dia gravado JÁ é o dia de calendário BR',
  },
  {
    // 🔴 O MUTANTE DO ACHADO MAJOR DO CODERABBIT, agora na função pura. É o QP5 da `@qa`
    // levado ao lugar onde a regra mora — e por isso não há como satisfazê-lo com um
    // comentário: o teste unitário chama a função e lê o retorno.
    id: 'P7 · CR-1 — a CONTAGEM volta a decidir antes do SINAL em `rotuloDaSemana`',
    arquivo: MODULO, teste: T_MODULO,
    aplica: (s) => s.replace(
      `  if (typeof s.sinal_abuso !== 'boolean') return '—';
  if (s.contas_acima_de_3 != null && s.contas_acima_de_3 > 0) {
    return \`\${s.contas_acima_de_3} acima do limite\`;
  }
  if (s.sinal_abuso === true) return 'acima do limite — quantidade não informada';
  return 'ninguém acima do limite';`,
      `  if (s.contas_acima_de_3 != null && s.contas_acima_de_3 > 0) {
    return \`\${s.contas_acima_de_3} acima do limite\`;
  }
  if (typeof s.sinal_abuso !== 'boolean') return '—';
  return 'ninguém acima do limite';`,
    ),
    marca: 'sinal ACESO com contagem NULA nunca diz «ninguém acima do limite»',
    asercao: 'CR-1 · a tela afirmaria o OPOSTO do que o banco disse',
  },
  {
    // 🔴 O MESMO defeito, agora medido no DOM RENDERIZADO. Este é o mutante que a versão
    // anterior da guarda NÃO pegava: a `@qa` pôs o defeito no JSX e as frases num
    // comentário, e 15/15 ficaram verdes. Aqui o card é renderizado e comentário não entra
    // no DOM.
    id: 'P8 · F-2.66-02 — o card ignora `rotuloDaSemana` e volta a decidir no JSX',
    arquivo: CARD, teste: T_CARD,
    aplica: (s) => s.replace(
      '                  <div className="v">{rotuloDaSemana(s)}</div>',
      "                  <div className=\"v\">{s.contas_acima_de_3 != null && s.contas_acima_de_3 > 0 ? `${s.contas_acima_de_3} acima do limite` : s.sinal_abuso === null ? '—' : 'ninguém acima do limite'}</div>",
    ),
    marca: 'sinal ACESO com contagem NULA nunca escreve «ninguém acima do limite»',
    asercao: 'F-2.66-02 · o defeito no JSX tem de vermelhar, e comentário não salva',
  },
  {
    // 🔴 F-2.66-09: o SELO colapsando `null` no glifo de "tudo bem", com o TEXTO intacto.
    // Sobreviveu na versão anterior porque a guarda casava no primeiro par e parava.
    id: 'P9 · F-2.66-09 — no SELO, `null` colapsa em `·` (o glifo de "tudo bem")',
    arquivo: CARD, teste: T_CARD,
    aplica: (s) => s.replace(
      "              {usoEsparso.sinalAceso === true ? '!' : usoEsparso.sinalAceso === null ? '—' : '·'}",
      "              {usoEsparso.sinalAceso === true ? '!' : '·'}",
    ),
    marca: 'o selo de "sem resposta" NÃO é o mesmo de "tudo bem"',
    asercao: 'F-2.66-09 · texto e selo têm de dizer a MESMA coisa nos três estados',
  },
  {
    // 🔴 F-2.66-10: a lista encolhe e ninguém reclama.
    id: 'P10 · F-2.66-10 — a lista de medições anteriores encolhe de 8 para 1',
    arquivo: CARD, teste: T_CARD,
    aplica: (s) => s.replace(
      '{usoEsparso.semanas.slice(1, 1 + MAX_MEDICOES_ANTERIORES).map((s) => (',
      '{usoEsparso.semanas.slice(1, 2).map((s) => (',
    ),
    marca: 'emite no máximo 8 semanas, e pula a atual',
    asercao: 'F-2.66-10 · a cardinalidade do que a tela EMITE, não só a decisão do módulo',
  },
  {
    id: 'P11 · AC7 — o rótulo do ACÚMULO sai do card',
    arquivo: CARD, teste: T_CARD,
    aplica: (s) => s.replace(
      '              Saúde da coleta — <strong>acumulado desde 23/08/2026</strong>',
      '              Saúde da coleta',
    ),
    marca: 'a saúde da coleta diz "acumulado desde 23/08/2026" na própria linha',
    asercao: 'achado 8 · sem o rótulo, acúmulo é lido como deterioração',
  },
  {
    id: 'P12 · AC7 — "não medido" passa a usar a MESMA frase da falha de leitura',
    arquivo: CARD, teste: T_CARD,
    aplica: (s) => s.replace(
      '          <div className="name">ainda não medido — a medição roda toda segunda, de madrugada</div>',
      '          <div className="name">a leitura falhou — o card não afirma nada enquanto isso</div>',
    ),
    marca: 'nunca medido: diz que a medição roda toda segunda',
    asercao: 'AC7 · uma RPC quebrada se disfarçaria de "a 1ª medição ainda não rodou"',
  },
  {
    // 🔴 A METADE DA FIAÇÃO: o card perfeito que a tela não monta entrega ZERO.
    id: 'P13 · AC7 (fiação) — a tela deixa de montar o `UsoEsparsoCard`',
    arquivo: PAGE, teste: T_FIACAO,
    aplica: (s) => s.replace(
      '      <UsoEsparsoCard semanas={d.medicao_uso_esparso} erro={d.medicao_uso_esparso_erro} />',
      '      {null}',
    ),
    marca: 'a aba Contas monta o `UsoEsparsoCard`, com as DUAS props',
    asercao: 'AC7 · um card testado que ninguém monta não está no ar',
  },
  {
    // 🔴 A prop de erro some: "nunca medido" e "a leitura quebrou" voltam a colapsar.
    id: 'P14 · AC7 (fiação) — a prop `erro` some da montagem',
    arquivo: PAGE, teste: T_FIACAO,
    aplica: (s) => s.replace(
      '      <UsoEsparsoCard semanas={d.medicao_uso_esparso} erro={d.medicao_uso_esparso_erro} />',
      '      <UsoEsparsoCard semanas={d.medicao_uso_esparso} />',
    ),
    marca: 'a aba Contas monta o `UsoEsparsoCard`, com as DUAS props',
    asercao: 'AC7 · sem a prop de erro os dois estados de ausência voltam a colapsar',
  },
  {
    // 🔴 O MUTANTE DA `@qa` NA RODADA 2 (F-2.66-11), reaplicado. Ela removeu a prop `erro`
    // da montagem e deixou um DECOY num comentário JSX logo acima — a guarda de fiação
    // ficou verde, o `tsc` ficou verde (prop opcional some sem erro) e os 120 testes
    // passaram. Agora a fatia é recortada a partir do ELEMENTO e limpa de comentários.
    id: 'P15 · F-2.66-11 — a prop `erro` some e um DECOY fica no comentário JSX acima',
    arquivo: PAGE, teste: T_FIACAO,
    aplica: (s) => s.replace(
      '      <UsoEsparsoCard semanas={d.medicao_uso_esparso} erro={d.medicao_uso_esparso_erro} />',
      '      {/* erro={d.medicao_uso_esparso_erro} — decoy do mutante F-2.66-11 */}\n' +
        '      <UsoEsparsoCard semanas={d.medicao_uso_esparso} />',
    ),
    marca: 'a aba Contas monta o `UsoEsparsoCard`, com as DUAS props',
    asercao: 'F-2.66-11 · comentário não é executado; a guarda não pode aceitá-lo como prova',
  },
  {
    // 🔴 A VARIANTE MAIS AFIADA: mover a âncora sozinha não bastaria, porque dentro da
    // PRÓPRIA TAG cabe comentário de bloco. Sem o limpador, este decoy passaria.
    id: 'P16 · F-2.66-11 — o DECOY vai para DENTRO da tag, como comentário de bloco',
    arquivo: PAGE, teste: T_FIACAO,
    aplica: (s) => s.replace(
      '      <UsoEsparsoCard semanas={d.medicao_uso_esparso} erro={d.medicao_uso_esparso_erro} />',
      '      <UsoEsparsoCard /* erro={d.medicao_uso_esparso_erro} */ semanas={d.medicao_uso_esparso} />',
    ),
    marca: 'a aba Contas monta o `UsoEsparsoCard`, com as DUAS props',
    asercao: 'F-2.66-11 · o decoy dentro da tag também não pode contar como prop',
  },
  {
    // ═══════════════════════════════════════════════════════════════════════════
    // OS QUATRO ATAQUES DA `@qa` NA RODADA 3 (F-2.66-12), reaplicados nominalmente.
    //
    // A fresta era a ORDEM: `fatiaDoCard()` procurava a âncora no arquivo CRU e só limpava
    // comentários DEPOIS do recorte. Um comentário ACIMA da montagem que citasse o
    // elemento fazia o `indexOf` parar nele e RETARGETAVA a fatia.
    //
    // 🔴 E `erro={undefined}` é o outro lado: a prop obrigatória cobre OMISSÃO, não VALOR.
    // O `tsc` aceita `undefined` (é parte do tipo), então quem tem de reprovar aqui é a
    // GUARDA — e ela só reprova se a fatia for a montagem de verdade.
    // ═══════════════════════════════════════════════════════════════════════════
    id: 'P17 · F-2.66-12 (ataque 1) — `erro={undefined}`, sem decoy nenhum',
    arquivo: PAGE, teste: T_FIACAO,
    aplica: (s) => s.replace(
      '      <UsoEsparsoCard semanas={d.medicao_uso_esparso} erro={d.medicao_uso_esparso_erro} />',
      '      <UsoEsparsoCard semanas={d.medicao_uso_esparso} erro={undefined} />',
    ),
    marca: 'a aba Contas monta o `UsoEsparsoCard`, com as DUAS props',
    asercao: 'F-12 · `undefined` compila (é parte do tipo) — quem reprova tem de ser a guarda',
  },
  {
    id: 'P18 · F-2.66-12 (ataque 2) — `erro={undefined}` + decoy em comentário de LINHA acima',
    arquivo: PAGE, teste: T_FIACAO,
    aplica: (s) => s.replace(
      '      <UsoEsparsoCard semanas={d.medicao_uso_esparso} erro={d.medicao_uso_esparso_erro} />',
      '      {/* <UsoEsparsoCard semanas={d.medicao_uso_esparso} erro={d.medicao_uso_esparso_erro} /> */}\n' +
        '      <UsoEsparsoCard semanas={d.medicao_uso_esparso} erro={undefined} />',
    ),
    marca: 'a aba Contas monta o `UsoEsparsoCard`, com as DUAS props',
    asercao: 'F-12 · o comentário acima NÃO pode retargetar a fatia',
  },
  {
    id: 'P19 · F-2.66-12 (ataque 3) — `erro={undefined}` + decoy em comentário de BLOCO acima',
    arquivo: PAGE, teste: T_FIACAO,
    aplica: (s) => s.replace(
      '      <UsoEsparsoCard semanas={d.medicao_uso_esparso} erro={d.medicao_uso_esparso_erro} />',
      '      {/*\n       * <UsoEsparsoCard erro={d.medicao_uso_esparso_erro} />\n       */}\n' +
        '      <UsoEsparsoCard semanas={d.medicao_uso_esparso} erro={undefined} />',
    ),
    marca: 'a aba Contas monta o `UsoEsparsoCard`, com as DUAS props',
    asercao: 'F-12 · bloco multilinha também não pode retargetar',
  },
  {
    // 🔴 Este é o único dos quatro que o `tsc` TAMBÉM reprova (TS2741, omissão da prop) —
    // é o F-2.66-11 combinado com a fresta de ordem do F-2.66-12.
    id: 'P20 · F-2.66-12 (ataque 4) — prop REMOVIDA + decoy acima (o `tsc` também reprova)',
    arquivo: PAGE, teste: T_FIACAO,
    aplica: (s) => s.replace(
      '      <UsoEsparsoCard semanas={d.medicao_uso_esparso} erro={d.medicao_uso_esparso_erro} />',
      '      {/* <UsoEsparsoCard erro={d.medicao_uso_esparso_erro} /> */}\n' +
        '      <UsoEsparsoCard semanas={d.medicao_uso_esparso} />',
    ),
    marca: 'a aba Contas monta o `UsoEsparsoCard`, com as DUAS props',
    asercao: 'F-11 + F-12 · omissão da prop COM decoy: guarda vermelha E `TS2741`',
  },
  {
    // 🔴 SENTINELA. A `@qa` plantou uma na revisão dela (QP0, palavra de comentário) e ela
    // sobreviveu, como tinha de ser. Aqui a sentinela é PERMANENTE: se ela morder, a
    // bancada está matando tudo e nenhum «MORDEU» acima significa alguma coisa.
    id: 'S1 · SENTINELA — troca uma palavra de COMENTÁRIO no card (tem de SOBREVIVER)',
    arquivo: CARD, teste: T_CARD,
    aplica: (s) => s.replace('* Story 2.66 (AC7) — o card', '* Story 2.66 (AC-7) — o card'),
    sentinela: true,
    asercao: 'controle do instrumento · mutação sem efeito não pode ser creditada',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 🔬 CONTROLE DO INSTRUMENTO DA CÓPIA — antes de tudo, e é barato
//
// `verificarIntocado()` afirma que o fonte rastreado não mudou. Sozinha, essa afirmação é
// satisfeita por uma bancada que **não muta nada** — o falso verde dentro do medidor de
// falso verde. Este bloco prova o outro lado: a cópia REALMENTE recebe o mutante, e o
// fonte NÃO. As duas metades juntas é que sustentam a frase.
// ═══════════════════════════════════════════════════════════════════════════════
{
  const marcador = '/* controle-do-instrumento-2.66 */';
  const raiz = copiaComMutante(MODULO, base.get(MODULO) + marcador);
  try {
    if (!readFileSync(join(raiz, MODULO), 'utf8').includes(marcador)) {
      console.error('\n🔴 ABORTADO — a cópia NÃO recebeu o mutante. A bancada não está mutando nada.');
      process.exit(1);
    }
    if (readFileSync(MODULO, 'utf8').includes(marcador)) {
      console.error('\n🔴 ABORTADO — o marcador vazou para o arquivo RASTREADO.');
      process.exit(2);
    }
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
  console.log('🔬 controle do instrumento: a cópia recebe o mutante, o fonte não.\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔴 A RODADA BASE (F-2.66-03) — antes de qualquer mutante
// ═══════════════════════════════════════════════════════════════════════════════
console.log('▶ rodada BASE (sem mutante) — se ela não vier verde, «N/N morderam» não vale nada\n');
// 🔬 `MUT_QUEBRAR_BASE=1` é o MUTANTE DESTA GUARDA — existe para provar que a rodada base
// MORDE, não para conveniência. Quebra a peça central SÓ na cópia da base; a bancada tem de
// ABORTAR sem rodar mutante nenhum. Sem o knob, «base verde» seria uma frase que ninguém
// nunca viu falhar.
// ⚠️ A âncora é a linha INTEIRA do `if`, e o guard abaixo aborta se ela não casar:
// substituição que casa noutro lugar é pior que substituição que não casa (aconteceu na
// bancada da edge, onde a âncora curta pegou um carregador irmão e a base seguiu verde).
const quebrarBase = process.env.MUT_QUEBRAR_BASE === '1';
let textoBase = null;
if (quebrarBase) {
  textoBase = base.get(MODULO).replace(
    "  if (typeof s.sinal_abuso !== 'boolean') return '—';",
    "  if (typeof s.sinal_abuso !== 'boolean') return 'ninguém acima do limite';",
  );
  if (textoBase === base.get(MODULO)) {
    console.error('🔴 ABORTADO — MUT_QUEBRAR_BASE não casou; a âncora mudou.');
    process.exit(1);
  }
}
const raizBase = copiaComMutante(quebrarBase ? MODULO : null, textoBase);
let baseOk = true;
try {
  for (const t of [T_MODULO, T_CARD, T_FIACAO]) {
    const { ok, saida } = rodarVitest(raizBase, t);
    console.log(`   ${ok ? '✅' : '🔴'} base · ${t}`);
    if (!ok) {
      baseOk = false;
      console.error(saida.slice(-2000));
    }
  }
} finally {
  rmSync(raizBase, { recursive: true, force: true });
}
if (!baseOk) {
  console.error(
    '\n🔴 ABORTADO — a rodada BASE não passou. Com a base quebrada TODO mutante «morde», ' +
      'e o placar sairia idêntico ao de uma bancada que mede.',
  );
  process.exit(1);
}
console.log('');

let mordeu = 0;
let sentinelasVivas = 0;
const sobreviventes = [];

for (const m of MUTANTES) {
  const texto = base.get(m.arquivo);
  const out = m.aplica(texto);
  if (out === texto) {
    console.error(`\n🔴 ABORTADO — ${m.id}: a substituição NÃO casou (no-op mudo). Reancore o alvo.`);
    process.exit(1);
  }

  const raiz = copiaComMutante(m.arquivo, out);
  let ok, saida;
  try {
    ({ ok, saida } = rodarVitest(raiz, m.teste));
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
  verificarIntocado(`depois de ${m.id}`);

  if (m.sentinela) {
    if (ok) {
      sentinelasVivas++;
      console.log(`\n🛡️  SOBREVIVEU (esperado) — ${m.id}`);
    } else {
      console.error(
        `\n🔴 A SENTINELA MORDEU — ${m.id}. A bancada está matando tudo: nenhum «MORDEU» ` +
          'acima distingue asserção que mede de bancada quebrada.',
      );
      process.exitCode = 1;
    }
    continue;
  }

  if (ok) {
    sobreviventes.push(m);
    console.log(`\n❌ SOBREVIVEU — ${m.id}\n   esperava vermelhar: ${m.asercao}`);
    continue;
  }
  // 🔴 Não basta a suíte ficar vermelha: o teste VISADO tem de ser o que vermelhou. Um erro
  // de sintaxe também derruba tudo, sem exercitar asserção nenhuma.
  const nomes = testesQueVermelharam(saida);
  const acertou = nomes.some((n) => n.includes(m.marca));
  console.log(`\n${acertou ? '✅' : '⚠️ '} MORDEU — ${m.id}`);
  console.log(`   efeito:  ${(nomes.join(' | ') || '(nenhum teste × na saída)').slice(0, 240)}`);
  if (acertou) mordeu++;
  else {
    console.error(`   🔴 mordida INVÁLIDA: o teste visado («${m.marca}») não vermelhou.`);
    if (process.env.MUT_DEBUG) console.error(saida.slice(-3000));
    process.exitCode = 1;
  }
}

verificarIntocado('no fim da bancada');
const deAtaque = MUTANTES.filter((m) => !m.sentinela).length;
const deSentinela = MUTANTES.length - deAtaque;
console.log(`\n════ ${mordeu}/${deAtaque} mutantes morderam · ${sentinelasVivas}/${deSentinela} sentinelas vivas ════`);
console.log('✅ fonte rastreado INTOCADO (sha256 conferido a cada mutante e no fim).');
if (sobreviventes.length) {
  console.log('🔴 SOBREVIVENTES (asserções que não estavam medindo nada):');
  sobreviventes.forEach((m) => console.log(`   • ${m.id} → ${m.asercao}`));
  process.exitCode = 1;
}
process.exit(process.exitCode ?? 0);

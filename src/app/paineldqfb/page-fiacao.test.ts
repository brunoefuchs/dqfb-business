/**
 * Guard de FIAÇÃO: a tela usa os módulos testados, ou os testes são teatro.
 *
 * 🔴 Por que um teste que lê o `page.tsx` como TEXTO:
 *
 * O defeito que ele trava já aconteceu três vezes neste projeto (2.19, 2.21 e a primeira
 * versão da 12.B4): o teste exercita um módulo, a tela calcula a mesma coisa inline, e os
 * dois ficam verdes sem nunca se falarem. Mutar o módulo não quebra nada — logo o módulo
 * não é o que está no ar.
 *
 * Renderizar o `page.tsx` de verdade seria melhor e não é viável: é um client component de
 * ~2700 linhas que faz fetch na montagem. Enquanto isso, verificar que a CHAMADA existe no
 * fonte custa milissegundos e mata exatamente o mutante "voltou a calcular inline".
 *
 * ⛔ Isto NÃO cobre o JSX. Não afirma que o texto aparece bonito na tela — afirma que a
 * tela pergunta ao módulo. O resto continua declarado como não coberto.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Caminho a partir da raiz do projeto: no ambiente `jsdom` o `import.meta.url` não é
// `file:` e `readFileSync(new URL(...))` recusa. O vitest roda com a cwd na raiz.
const PAGE = readFileSync(resolve(process.cwd(), 'src/app/paineldqfb/page.tsx'), 'utf8');

/**
 * 🔴 Recorta SÓ o bloco do card de uso esparso, entre âncoras — nunca o arquivo inteiro.
 *
 * A lição de F-2.66-02: `expect(PAGE).toMatch(…)` prova que o texto existe EM ALGUM LUGAR
 * do arquivo, não que ele está no trecho que vai à tela. Qualquer segunda ocorrência
 * (comentário, bloco comentado, card irmão) satisfaz a asserção. Aqui a âncora inicial é o
 * comentário do card e a final é a linha seguinte ao componente; se qualquer uma deixar de
 * casar, a função LEVANTA em vez de devolver string vazia — fatia vazia passaria verde em
 * toda asserção negativa.
 */
function fatiaDoCard(): string {
  // 🔴 A âncora inicial é o ELEMENTO, não o comentário que o antecede — conserto de
  // F-2.66-11. A versão anterior recortava a partir do `{/* … */}` do card, então o
  // comentário INTEIRO entrava na fatia: a `@qa` removeu a prop `erro` da montagem, deixou
  // `erro={d.medicao_uso_esparso_erro}` num comentário logo acima, e a guarda ficou verde.
  const i = PAGE.indexOf('<UsoEsparsoCard');
  if (i < 0) throw new Error('âncora inicial do card de uso esparso não casou no page.tsx');
  const j = PAGE.indexOf('/>', i);
  if (j < 0) throw new Error('âncora final do card de uso esparso não casou no page.tsx');
  return semComentarios(PAGE.slice(i, j + 2));
}

/**
 * 🔴 Tira comentários antes de asserir — a segunda metade do conserto de F-2.66-11.
 *
 * Mover a âncora sozinha não bastaria: dentro da própria tag cabe comentário de bloco
 * (`<UsoEsparsoCard /* erro={…} *​/ semanas={…} />`), e um decoy ali satisfaria a guarda
 * do mesmo jeito. Guarda de texto só é honesta sobre o que a tela EXECUTA, e comentário
 * não é executado.
 *
 * ⚠️ Isto é a defesa BARATA. A que de fato fecha o achado é estrutural e mora noutro
 * gate: a prop `erro` do `UsoEsparsoCard` deixou de ser opcional, então removê-la da
 * montagem **reprova no `tsc`** — e não há comentário que salve um compilador vermelho.
 * As duas juntas porque falham em gates diferentes (`npm test` e `npm run typecheck`).
 */
function semComentarios(t: string): string {
  return t
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ') // {/* comentário JSX */}
    .replace(/\/\*[\s\S]*?\*\//g, ' ') //      /* comentário de bloco */
    .replace(/^\s*\/\/.*$/gm, ' '); //            // comentário de linha
}

describe('a tela chama os módulos, não uma cópia', () => {
  it('o card de aparelhos usa `estadoDosAparelhos` e o campo `semDado`', () => {
    expect(PAGE).toContain('estadoDosAparelhos(d.aparelhos_resumo)');
    expect(PAGE).toContain('aparelhos.semDado');
  });

  it('🔴 as duas mensagens de "sem linha" são DIFERENTES', () => {
    // "não apurado" e "apurado, ninguém bate" não podem sair com a mesma frase — era
    // esse colapso que fazia o card afirmar sobre número que ninguém olhou.
    expect(PAGE).toContain('ainda não medido');
    expect(PAGE).toContain('nenhuma conta com mais de um aparelho registrado');
  });

  it('(2.27/T10) o card do registro legal usa `estadoDoRegistroLegal`, não uma cópia', () => {
    expect(PAGE).toContain("estadoDoRegistroLegal(d.registro_legal)");
    // e a lista renderizada vem do módulo — não de `d.registro_legal` direto, que é o
    // caminho pelo qual a régua voltaria a ser recalculada aqui dentro
    expect(PAGE).toMatch(/regLegal\.linhas\.map\(/);
  });

  it('🔴 (2.27/T10) o card distingue os TRÊS estados de um sinal', () => {
    // aceso · apagado · SEM RESPOSTA. Se `l.aceso === null` sumir daqui, um sinal que
    // não respondeu volta a sair como "ok" — o zero inventado com outra roupa.
    expect(PAGE).toMatch(/l\.aceso === true[\s\S]{0,200}l\.aceso === null/);
    expect(PAGE).toContain('sem resposta');
  });

  it('🔴 (2.27/T10) o card NUNCA escreve "tudo certo" sem medição', () => {
    // O ramo sem medição só pode dizer "ainda não medido" ou nomear a falha de leitura.
    expect(PAGE).toContain('registro_legal_erro');
    expect(PAGE).not.toMatch(/registro legal[\s\S]{0,600}tudo certo/i);
  });

  it('o rótulo do sinal vem de `rotuloSinal` E é de fato renderizado', () => {
    // 🔴 Não basta a chamada existir em algum lugar do arquivo: o primeiro mutante
    // ("{false ? (" no lugar da condição) sobreviveu porque a chamada continuava escrita
    // dentro do ramo morto. A regex exige a condição E o valor impresso logo abaixo.
    expect(PAGE).toMatch(/rotuloSinalAparelho\(l\)\s*\?[\s\S]{0,300}\{rotuloSinalAparelho\(l\)\}/);
  });

  it('a legenda do "Olhar" e AS DUAS ressalvas estão na tela', () => {
    expect(PAGE).toContain('LEGENDA_OLHAR');
    expect(PAGE).toContain('RESSALVAS_APARELHOS.map');
  });

  /**
   * 🔴 (2.66) A METADE QUE ESTA GUARDA PODE PROVAR — e a que ela NÃO pode.
   *
   * A `@qa` derrubou a versão anterior destes testes (F-2.66-02): eles casavam regex sobre
   * o ARQUIVO INTEIRO, então ela pôs o defeito no JSX e as frases procuradas num
   * COMENTÁRIO — 15/15 verdes com a tela dizendo o oposto do banco.
   *
   * O conserto tem duas partes, e esta é a segunda:
   *   1. o JSX saiu para `uso-esparso-card.tsx` e é RENDERIZADO em
   *      `uso-esparso-card.test.tsx`, onde as asserções são sobre o DOM (comentário não
   *      entra no DOM);
   *   2. aqui fica só o que o render NÃO alcança: que a TELA usa aquele card, com as duas
   *      props certas. Amarrado ao TRECHO recortado por âncoras, nunca ao arquivo todo.
   */
  it('(2.66/AC7) a aba Contas monta o `UsoEsparsoCard`, com as DUAS props', () => {
    const trecho = fatiaDoCard();
    expect(trecho).toMatch(/<UsoEsparsoCard\b/);
    expect(trecho).toMatch(/semanas=\{d\.medicao_uso_esparso\}/);
    // ⛔ A prop de ERRO é obrigatória: sem ela, "nunca medido" e "a leitura quebrou"
    // voltam a sair com a mesma frase, que é o colapso que o card existe para desfazer.
    expect(trecho).toMatch(/erro=\{d\.medicao_uso_esparso_erro\}/);
  });

  it('🔴 (2.66) o card NÃO volta a ser calculado inline nesta tela', () => {
    // O mutante P7: a tela recalcula o estado por dentro e o módulo deixa de ser o que
    // está no ar. Se `estadoDoUsoEsparso` reaparecer no `page.tsx`, é isso que aconteceu.
    expect(PAGE).not.toMatch(/estadoDoUsoEsparso\s*\(/);
    expect(PAGE).not.toMatch(/rotuloDaSemana\s*\(/);
    // 🔬 CONTROLE POSITIVO do instrumento: as negativas acima são satisfeitas
    // trivialmente por um arquivo vazio ou por um caminho errado. Um irmão que SABIDAMENTE
    // calcula inline tem de ser encontrado.
    expect(PAGE).toMatch(/estadoDosAparelhos\s*\(/);
  });

  it('🔴 (2.66) a fatia do card NÃO é vazia — o recorte precisa de controle', () => {
    // Fatia vazia satisfaz `not.toMatch` trivialmente, e as asserções acima passariam a
    // medir nada. É o mesmo defeito de afirmar ausência sem controle positivo.
    const trecho = fatiaDoCard();
    expect(trecho.length).toBeGreaterThan(60);
    expect(trecho).toContain('UsoEsparsoCard');
  });

  it('🔬 (2.66/F-11) o limpador de comentários FUNCIONA — controle do instrumento', () => {
    // Sem este par, «o decoy não passa» seria satisfeito por um limpador que apaga tudo
    // (fatia vazia) ou por um que não apaga nada (e aí o decoy volta a passar). Os dois
    // lados são exercitados com texto conhecido.
    expect(semComentarios('a {/* erro={d.x} */} b')).not.toContain('erro={d.x}');
    expect(semComentarios('a /* erro={d.x} */ b')).not.toContain('erro={d.x}');
    expect(semComentarios('  // erro={d.x}\nreal')).not.toContain('erro={d.x}');
    // 🔴 e o lado POSITIVO: o que NÃO é comentário tem de sobreviver intacto
    expect(semComentarios('<X erro={d.y} />')).toContain('erro={d.y}');
    expect(semComentarios('a {/* c */} b')).toContain('b');
  });

  it('a data do card da cota passa por `fmtDataBr`', () => {
    expect(PAGE).toContain('fmtDataBr(mq.periodo_fim)');
  });

  it('🔴 "Medido em" lê `cota.medidoEmMs`, nunca o campo cru', () => {
    // Com `mq.medido_em` a condição passa mesmo com data corrompida e a tela imprime
    // `Invalid Date`. O estado validado é o único que pode governar essa linha.
    expect(PAGE).toContain('cota.medidoEmMs != null');
    expect(PAGE).not.toContain('new Date(mq.medido_em)');
  });
});

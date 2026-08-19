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

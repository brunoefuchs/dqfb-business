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

  it('(2.66/AC7) o card de uso esparso usa `estadoDoUsoEsparso`, não uma cópia', () => {
    expect(PAGE).toContain('estadoDoUsoEsparso(d.medicao_uso_esparso)');
    // e o que a tela desenha vem do ESTADO, não de `d.medicao_uso_esparso` direto — que é
    // o caminho pelo qual a régua voltaria a ser recalculada aqui dentro.
    expect(PAGE).toMatch(/usoEsparso\.distribuicao\.map\(/);
    expect(PAGE).toContain('usoEsparso.temSerie');
  });

  it('🔴 (2.66/AC7) o card distingue os TRÊS estados do sinal', () => {
    // aceso · apagado · NÃO RESPONDEU. Se `sinalAceso === null` sumir daqui, um sinal que
    // não respondeu volta a sair como "está tudo bem" — o zero inventado com outra roupa.
    expect(PAGE).toMatch(/usoEsparso\.sinalAceso === true[\s\S]{0,400}usoEsparso\.sinalAceso === null/);
    expect(PAGE).toContain('o sinal não respondeu nesta medição');
  });

  it('🔴 (2.66/AC7) "não medido" e "a leitura falhou" NÃO saem com a mesma frase', () => {
    // Os dois chegam como campo AUSENTE; só `medicao_uso_esparso_erro` os separa. Sem
    // isso, uma RPC quebrada se disfarça de "a primeira medição ainda não rodou".
    expect(PAGE).toContain('medicao_uso_esparso_erro');
    expect(PAGE).toContain('ainda não medido — a medição roda toda segunda, de madrugada');
  });

  it('🔴 (2.66/AC7) o card NUNCA afirma ausência de abuso sem medição', () => {
    // O ramo sem série só pode dizer "ainda não medido" ou nomear a falha de leitura.
    expect(PAGE).not.toMatch(/ainda não medido[\s\S]{0,200}nenhuma conta passou do limite/);
  });

  it('🔴 (2.66) na lista de semanas, o SINAL decide antes da CONTAGEM', () => {
    // Defeito real, achado pelo CodeRabbit em 02/09: `contas_acima_de_3` é NULL-ável. Com a
    // contagem ausente e o sinal ACESO, a ordem antiga caía no ramo final e escrevia
    // "ninguém acima do limite" — a tela afirmando o OPOSTO do que o banco disse.
    // A regex exige `s.sinal_abuso === null` ANTES de `s.contas_acima_de_3` na expressão.
    expect(PAGE).toMatch(/s\.sinal_abuso === null[\s\S]{0,200}s\.contas_acima_de_3 != null/);
    expect(PAGE).toContain('acima do limite — quantidade não informada');
  });

  it('🔴 (2.66/achado 8) o rótulo do ACÚMULO está na tela, junto dos números', () => {
    // Sem ele, "144 desistências, subindo toda semana" é lido como piora quando é acúmulo
    // desde o gatilho. As ressalvas do módulo também são renderizadas, não só importadas.
    expect(PAGE).toContain('acumulado desde 23/08/2026');
    expect(PAGE).toContain('RESSALVAS_USO_ESPARSO.map');
    expect(PAGE).toContain('LEGENDA_SINAL_USO_ESPARSO');
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

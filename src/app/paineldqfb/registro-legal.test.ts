/**
 * Story 2.27 (T10) — card "Registro legal de acesso".
 *
 * O que está provado aqui é a distinção que o card inteiro existe para manter:
 * **"nada apurado" ≠ "tudo saudável" ≠ "não respondeu"**. As três saíam iguais na tela
 * antes deste módulo, e é o mesmo defeito que deixou o monitor do Mailtrap morto por meses.
 *
 * ⛔ NÃO cobre a renderização do JSX — o card é markup direto dentro de `page.tsx`.
 *    Está declarado assim em vez de listado como coberto.
 */
import { describe, expect, it } from 'vitest';

import { estadoDoRegistroLegal, type SinalRegistroLegal } from './registro-legal';

function sinal(nome: string, over: Partial<SinalRegistroLegal> = {}): SinalRegistroLegal {
  return { sinal: nome, aceso: false, medida: null, numero: null, limiar: null, ...over };
}

const SAUDAVEL: SinalRegistroLegal[] = [
  sinal('falhas', { numero: 0 }),
  sinal('expurgo', { medida: '2026-08-18T03:50:00Z' }),
  sinal('rotacao', { medida: '2026-08-18T04:05:00Z' }),
  sinal('anulacao', { medida: '2026-08-18T11:05:00Z' }),
  sinal('volume', { numero: 1200 }),
  sinal('privilegio', { numero: 0 }),
  sinal('hook_ligado'),
];

describe('estadoDoRegistroLegal', () => {
  it('🔴 ausente ⇒ sem_medicao, e NUNCA "tudo certo"', () => {
    for (const vazio of [undefined, null, [] as SinalRegistroLegal[]]) {
      const e = estadoDoRegistroLegal(vazio);
      expect(e.temMedicao).toBe(false);
      expect(e.nivel).toBe('sem_medicao');
      expect(e.linhas).toHaveLength(0);
      // o ponto: `acesos === 0` sozinho NÃO pode ser lido como saúde
      expect(e.acesos).toBe(0);
    }
  });

  it('tudo apagado e medido ⇒ ok, com os sete sinais', () => {
    const e = estadoDoRegistroLegal(SAUDAVEL);
    expect(e.temMedicao).toBe(true);
    expect(e.nivel).toBe('ok');
    expect(e.acesos).toBe(0);
    expect(e.indefinidos).toBe(0);
    expect(e.linhas).toHaveLength(7);
  });

  it('🔴 a gravação desligada acende, e vem PRIMEIRO na lista', () => {
    // É o achado Q1 do gate: sem este sinal, "ninguém foi capturado" e "tudo perfeito"
    // eram a mesma cor — e o interruptor desligava a coleta sem rastro no painel.
    const e = estadoDoRegistroLegal(
      SAUDAVEL.map((s) => (s.sinal === 'hook_ligado' ? { ...s, aceso: true } : s)),
    );
    expect(e.nivel).toBe('atencao');
    expect(e.acesos).toBe(1);
    expect(e.linhas[0]?.sinal).toBe('hook_ligado');
    expect(e.linhas[0]?.aceso).toBe(true);
  });

  it('🔴 sinal sem resposta é ATENÇÃO, não ok — "não sei" ≠ "está bem"', () => {
    const e = estadoDoRegistroLegal(
      // `aceso` vindo nulo (ou de tipo errado, como um JSON malformado entregaria)
      SAUDAVEL.map((s) => (s.sinal === 'privilegio' ? { ...s, aceso: null } : s)),
    );
    expect(e.indefinidos).toBe(1);
    expect(e.acesos).toBe(0);
    expect(e.nivel).toBe('atencao');
    expect(e.linhas.find((l) => l.sinal === 'privilegio')?.aceso).toBeNull();
  });

  it('🔴 sinal DESCONHECIDO aparece, não some', () => {
    // Se o servidor ganhar um oitavo sinal e o painel não souber dele, sumir da tela
    // seria o pior resultado: o card ficaria verde escondendo um alerta novo.
    const e = estadoDoRegistroLegal([...SAUDAVEL, sinal('sinal_do_futuro', { aceso: true })]);
    expect(e.linhas).toHaveLength(8);
    const novo = e.linhas.find((l) => l.sinal === 'sinal_do_futuro');
    expect(novo?.aceso).toBe(true);
    // sem rótulo conhecido, mostra o próprio nome — feio é melhor que invisível
    expect(novo?.rotulo).toBe('sinal_do_futuro');
    expect(e.nivel).toBe('atencao');
    // e vai para o fim, sem empurrar os conhecidos de lugar
    expect(e.linhas[e.linhas.length - 1]?.sinal).toBe('sinal_do_futuro');
  });

  it('🔴 o limiar NÃO é recalculado aqui — o card pinta o que o banco decidiu', () => {
    // Trava um DESENHO, não um comportamento: quem quiser "calcular o aceso no painel"
    // passa por este teste. A régua (48h/48h/3h e o gatilho de volume) mora no banco;
    // este repositório é público e uma segunda cópia divergiria sem ninguém notar.
    const e = estadoDoRegistroLegal([
      // carimbo antiquíssimo, e mesmo assim o servidor diz APAGADO
      sinal('expurgo', { aceso: false, medida: '2020-01-01T00:00:00Z' }),
      // número minúsculo, e mesmo assim o servidor diz ACESO
      sinal('volume', { aceso: true, numero: 1 }),
    ]);
    expect(e.linhas.find((l) => l.sinal === 'expurgo')?.aceso).toBe(false);
    expect(e.linhas.find((l) => l.sinal === 'volume')?.aceso).toBe(true);
    expect(e.acesos).toBe(1);
  });

  it('número inválido vira null, e o texto do limiar vem do servidor', () => {
    const e = estadoDoRegistroLegal([
      sinal('volume', { numero: Number.NaN, limiar: 'acende em 50000 linhas' }),
    ]);
    expect(e.linhas[0]?.numero).toBeNull();
    expect(e.linhas[0]?.limiar).toBe('acende em 50000 linhas');
  });

  it('rótulos não vazam jargão de infraestrutura', () => {
    const e = estadoDoRegistroLegal(SAUDAVEL);
    const texto = e.linhas.map((l) => l.rotulo).join(' | ').toLowerCase();
    for (const proibido of ['mci', 'schema', 'rls', 'hmac', 'pgp', 'chave_id', 'dblink']) {
      expect(texto).not.toContain(proibido);
    }
  });
});

'use client';

/**
 * Lu · Curso — o chat que substitui o iframe do Chatbase na área de membros.
 * =============================================================================
 * 🔴 REGRA MASTER (dono, 2026-07-30): é SÓ CURSO. Esta página não fala com nada
 * do app — só com a edge `tutor-curso`, que tem acervo e teto próprios.
 *
 * Onde ela roda: dentro de um <iframe> numa aula da Hotmart. Duas consequências
 * de projeto que valem estar escritas:
 *   • altura 100% do iframe (h-dvh), nunca a página inteira rolando por fora
 *   • sem login: a aluna já entrou na área de membros; não há sessão Supabase
 *     aqui. A identidade que existe é o id de sessão do navegador, usado só
 *     para rate limit — nenhum dado dela é gravado.
 *
 * Como colar na Hotmart (vai no runbook também):
 *   <iframe src="https://www.businessdqfb.francielecaleffi.com.br/lu-curso"
 *           style="width:100%;height:640px;border:0;border-radius:16px"></iframe>
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const EDGE = 'https://xwiomidydfappnrrsjqh.supabase.co/functions/v1/tutor-curso';

/** Perguntas de partida — as 4 que mais chegam no suporte, segundo o dono (30/07). */
const SUGESTOES = [
  'Onde eu baixo o ConfeitBook?',
  'Como funciona o suporte do curso?',
  'Qual o grupo de WhatsApp das alunas?',
  'Posso substituir a manteiga ghee?',
];

const SAUDACAO =
  'Oi! Eu sou a Lu, a IA do Doce que Faz Bem. 💛\n\n' +
  'Pode perguntar sobre as receitas, os módulos do curso, substituições de ingrediente ou onde ' +
  'encontrar as coisas por aqui. Se eu não souber, eu te digo — e mando você para quem sabe.';

const ERRO_REDE =
  'Não consegui falar com o servidor agora. 💛 Tenta de novo em instantes — se continuar, chama a ' +
  'Mi no +55 47 99724-1701 (https://wa.me/5547997241701).';

interface Msg { autor: 'lu' | 'aluna'; texto: string }

/** id por navegador — só para o rate limit da edge. Não identifica a aluna. */
function pegarSessao(): string {
  const CHAVE = 'lu-curso-sessao';
  try {
    const salvo = localStorage.getItem(CHAVE);
    if (salvo) return salvo;
    const novo = crypto.randomUUID();
    localStorage.setItem(CHAVE, novo);
    return novo;
  } catch {
    // navegador com storage bloqueado: sessão efêmera, o limite por IP ainda vale
    return `efemera-${Math.random().toString(36).slice(2)}`;
  }
}

/**
 * Renderiza o texto da Lu preservando o que as respostas curadas realmente usam:
 * quebras de linha, **negrito** e links (as respostas de suporte trazem wa.me —
 * link morto em texto puro obriga a aluna a copiar número na mão).
 */
function Texto({ children }: { children: string }) {
  const linhas = children.split('\n');
  return (
    <>
      {linhas.map((linha, i) => (
        <span key={i}>
          {i > 0 && <br />}
          {formatar(linha)}
        </span>
      ))}
    </>
  );
}

function formatar(linha: string) {
  // um passe só, alternando entre **negrito** e links, na ordem em que aparecem
  const partes: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*)|(https?:\/\/[^\s)]+)/g;
  let ultimo = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(linha)) !== null) {
    if (m.index > ultimo) partes.push(linha.slice(ultimo, m.index));
    if (m[1]) {
      partes.push(<strong key={k++}>{m[1].slice(2, -2)}</strong>);
    } else if (m[2]) {
      const url = m[2].replace(/[.,;]$/, '');
      partes.push(
        <a
          key={k++}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-1 underline-offset-2 break-all"
        >
          {url.replace(/^https?:\/\//, '')}
        </a>,
      );
      if (url !== m[2]) partes.push(m[2].slice(url.length));
    }
    ultimo = m.index + m[0].length;
  }
  if (ultimo < linha.length) partes.push(linha.slice(ultimo));
  return partes.length ? partes : linha;
}

export default function LuCursoPage() {
  const [msgs, setMsgs] = useState<Msg[]>([{ autor: 'lu', texto: SAUDACAO }]);
  const [texto, setTexto] = useState('');
  const [carregando, setCarregando] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [msgs, carregando]);

  const enviar = useCallback(
    async (pergunta: string) => {
      const p = pergunta.trim();
      if (!p || carregando) return;
      setMsgs((m) => [...m, { autor: 'aluna', texto: p }]);
      setTexto('');
      setCarregando(true);
      try {
        const r = await fetch(EDGE, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ mensagem: p, sessao_id: pegarSessao() }),
        });
        const j = (await r.json()) as { resposta?: string };
        setMsgs((m) => [...m, { autor: 'lu', texto: j.resposta || ERRO_REDE }]);
      } catch {
        setMsgs((m) => [...m, { autor: 'lu', texto: ERRO_REDE }]);
      } finally {
        setCarregando(false);
        inputRef.current?.focus();
      }
    },
    [carregando],
  );

  const primeiraPergunta = msgs.length === 1;

  return (
    <main className="flex h-dvh flex-col bg-surface-container-low font-body">
      {/* cabeçalho */}
      <header className="flex items-center gap-3 bg-primary px-4 py-3 text-on-primary shadow-sm">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-lg">
          💛
        </div>
        <div className="min-w-0">
          <p className="font-display text-base leading-tight font-semibold">Lu</p>
          <p className="truncate text-xs opacity-80">a IA do Doce que Faz Bem</p>
        </div>
      </header>

      {/* conversa */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          {msgs.map((m, i) => (
            <div
              key={i}
              className={
                m.autor === 'aluna'
                  ? 'max-w-[85%] self-end rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-on-primary'
                  : 'max-w-[92%] self-start rounded-2xl rounded-bl-sm bg-surface-container-lowest px-4 py-2.5 text-on-surface shadow-sm'
              }
            >
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
                <Texto>{m.texto}</Texto>
              </p>
            </div>
          ))}

          {carregando && (
            <div className="max-w-[92%] self-start rounded-2xl rounded-bl-sm bg-surface-container-lowest px-4 py-3 shadow-sm">
              <span className="flex gap-1" aria-label="Lu está escrevendo">
                {[0, 150, 300].map((d) => (
                  <span
                    key={d}
                    className="h-2 w-2 animate-bounce rounded-full bg-outline"
                    style={{ animationDelay: `${d}ms` }}
                  />
                ))}
              </span>
            </div>
          )}

          {/* sugestões só na tela vazia: depois da 1ª pergunta viram ruído */}
          {primeiraPergunta && !carregando && (
            <div className="mt-1 flex flex-wrap gap-2">
              {SUGESTOES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => enviar(s)}
                  className="rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-[13px] text-on-surface-variant transition hover:bg-surface-container"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div ref={fimRef} />
        </div>
      </div>

      {/* composer */}
      <div className="border-t border-outline-variant bg-surface-container-lowest px-4 py-3">
        <form
          className="mx-auto flex max-w-2xl items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void enviar(texto);
          }}
        >
          <textarea
            ref={inputRef}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              // Enter envia, Shift+Enter quebra linha — o que a aluna espera de um chat
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void enviar(texto);
              }
            }}
            rows={1}
            maxLength={1000}
            placeholder="Escreva sua dúvida..."
            aria-label="Sua dúvida para a Lu"
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-outline-variant bg-surface px-4 py-2.5 text-[15px] text-on-surface outline-none placeholder:text-on-surface-variant/60 focus:border-primary"
          />
          <button
            type="submit"
            disabled={carregando || !texto.trim()}
            aria-label="Enviar"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary transition disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[20px]">send</span>
          </button>
        </form>
        {/* Disclosure de IA — exigência do parecer jurídico (EPIC-10, aprovado 30/06). */}
        <p className="mx-auto mt-2 max-w-2xl text-center text-[11px] leading-snug text-on-surface-variant/70">
          A Lu é uma inteligência artificial e pode errar. Confira sempre o rótulo dos produtos e,
          para dúvidas de saúde, procure seu médico ou nutricionista.
        </p>
      </div>
    </main>
  );
}

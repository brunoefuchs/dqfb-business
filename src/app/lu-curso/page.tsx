'use client';

/**
 * Lu · Curso — o chat que substitui o iframe do Chatbase na área de membros.
 * =============================================================================
 * 🔴 REGRA MASTER (dono, 2026-07-30): é SÓ CURSO. Esta página não fala com nada
 * do app — só com a edge `tutor-curso`, que tem acervo e teto próprios.
 *
 * Onde ela roda: dentro de um <iframe> numa aula da Hotmart. Duas consequências
 * de projeto que valem estar escritas:
 *   • `fixed inset-0` (NÃO h-dvh — ver comentário no <main>), nunca a página
 *     inteira rolando por fora
 *   • sem login: a aluna já entrou na área de membros; não há sessão Supabase
 *     aqui. A identidade que existe é o id de sessão do navegador, usado só
 *     para rate limit — nenhum dado dela é gravado.
 *
 * Como colar na Hotmart (vai no runbook também):
 *   <iframe src="https://www.businessdqfb.francielecaleffi.com.br/lu-curso"
 *           style="width:100%;height:640px;border:0;border-radius:16px"></iframe>
 *
 * ⚠️ O APP da Hotmart ignora essa altura e entrega um quadro bem mais baixo
 * (~250px, medido em 31/07). Por isso o layout precisa sobreviver a qualquer
 * altura: daí o `fixed inset-0` e os ajustes em @media (max-height: 430px).
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
    <>
      {/*
        ALTURA DENTRO DO IFRAME — duas tentativas queimadas antes desta:
          1. `h-dvh`  → no WebView do iOS, dvh devolve a altura da JANELA DO APP,
                        não a do iframe: a página nascia com ~800px num quadro de
                        ~250px e o campo de digitar já nascia fora.
          2. `fixed inset-0` → position:fixed dentro de iframe é quebrado no
                        WebKit do iOS: ancora na janela, não no quadro. Mesmo fim.
        O que funciona é altura PERCENTUAL encadeada — html → body → main. Cada
        elo precisa de 100%, senão a corrente arrebenta e o main volta a crescer
        com o conteúdo, empurrando o rodapé para fora.
        `overflow:hidden` no body garante que só a lista de mensagens role: se a
        página inteira rolar, o campo de digitar sai de vista de novo.
      */}
      <style>{`
        html,body{height:100%;margin:0;overflow:hidden}
        /* o layout raiz põe min-h-screen (100vh) no body — e 100vh dentro de
           iframe no iOS é a altura da JANELA. Sem zerar isto, o body volta a ser
           mais alto que o quadro e o rodapé sai de vista de novo. */
        body{min-height:0}
      `}</style>
      <main className="flex h-full flex-col overflow-hidden bg-surface-container-low font-body">
      {/* cabeçalho */}
      <header className="flex items-center gap-2 bg-primary px-3 py-2 text-on-primary shadow-sm">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-sm">
          💛
        </div>
        <div className="min-w-0">
          <p className="font-display text-[13px] leading-tight font-semibold">Lu</p>
          <p className="truncate text-[10px] opacity-80 [@media(max-height:430px)]:hidden">
            a IA do Doce que Faz Bem
          </p>
        </div>
      </header>

      {/* conversa */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3">
        <div className="mx-auto flex max-w-2xl flex-col gap-2">
          {msgs.map((m, i) => (
            <div
              key={i}
              className={
                m.autor === 'aluna'
                  ? 'max-w-[85%] self-end rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-on-primary'
                  : 'max-w-[92%] self-start rounded-2xl rounded-bl-sm bg-surface-container-lowest px-3 py-2 text-on-surface shadow-sm'
              }
            >
              <p className="text-[13px] leading-[1.55] whitespace-pre-wrap">
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

          <div ref={fimRef} />
        </div>
      </div>

      {/* composer */}
      <div className="border-t border-outline-variant bg-surface-container-lowest px-3 py-2">
        {/* Sugestões coladas no campo de escrever, não no fim da conversa: no
            celular é onde o polegar já está, e assim elas não empurram a saudação
            para fora da tela. Somem depois da 1ª pergunta — aí viram ruído. */}
        {primeiraPergunta && !carregando && (
          <div className="mx-auto mb-2 flex max-w-2xl flex-wrap gap-1.5 [@media(max-height:430px)]:mb-1 [@media(max-height:430px)]:flex-nowrap [@media(max-height:430px)]:overflow-x-auto">
            {SUGESTOES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => enviar(s)}
                className="shrink-0 rounded-full border border-outline-variant bg-surface px-2.5 py-1 text-[11px] whitespace-nowrap text-on-surface-variant transition hover:bg-surface-container"
              >
                {s}
              </button>
            ))}
          </div>
        )}
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
            // Caixa alta de propósito (pedido do dono, 31/07): é o que o Chatbase
            // usava, e a aluna precisa achar onde digitar sem procurar.
            placeholder="DIGITE AQUI SUA PERGUNTA..."
            aria-label="Digite aqui sua pergunta para a Lu"
            className="max-h-28 min-h-[38px] flex-1 resize-none rounded-2xl border border-outline-variant bg-surface px-3 py-2 text-[13px] text-on-surface outline-none placeholder:text-on-surface-variant/60 focus:border-primary"
          />
          <button
            type="submit"
            disabled={carregando || !texto.trim()}
            aria-label="Enviar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary transition disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[17px]">send</span>
          </button>
        </form>
        {/* Disclosure de IA — exigência do parecer jurídico (EPIC-10, aprovado 30/06). */}
        <p className="mx-auto mt-1.5 max-w-2xl text-center text-[10px] leading-snug text-on-surface-variant/70 [@media(max-height:430px)]:mt-1 [@media(max-height:430px)]:text-[9px]">
          A Lu é uma inteligência artificial e pode errar. Confira sempre o rótulo dos produtos e,
          para dúvidas de saúde, procure seu médico ou nutricionista.
        </p>
      </div>
    </main>
    </>
  );
}

'use client';

/**
 * /paineldqfb — Painel admin de IA (custo + revisar respostas da Mel).
 *
 * Página client self-contained: fala com a Edge Function `admin-painel` do Supabase
 * (API JSON + HTTP Basic Auth + CORS). 1ª vez pede a senha (usuário `dqfb`) e guarda
 * no navegador. Os dados ficam atrás do login na função; a página em si é pública.
 *
 * Abas: CUSTO (lê app.vw_custo_ia) · REVISAR RESPOSTAS (fila da Mel: revisar/descartar/
 * promover ao acervo). Estilo na paleta DQFB (wine/magenta/cream), inline para não
 * depender do design system do site.
 */
import { useCallback, useEffect, useState } from 'react';

const BASE = 'https://xwiomidydfappnrrsjqh.supabase.co/functions/v1/admin-painel';
const USER = 'dqfb';

const fmt = (n: number) =>
  'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Custo {
  dias_grafico: number;
  usd_brl: number;
  total_brl: number;
  chamadas: number;
  usuarias: number;
  custo_medio_brl: number;
  algum_estimado: boolean;
  desde: string | null;
  provedor: { provedor: string; brl: number; chamadas: number }[];
  feature: { feature: string; brl: number; chamadas: number }[];
  mes: { mes: string; brl: number; chamadas: number }[];
  dia: { dia: string; brl: number }[];
  usuaria: { usuaria: string; brl: number; chamadas: number }[];
}
interface Fonte {
  tipo?: string;
  doi?: string | null;
  id?: string | null;
  url?: string | null;
}
interface FilaItem {
  id: string;
  pergunta: string;
  resposta: string;
  tier_usado: string;
  fontes_citadas: Fonte[] | null;
  feedback: string | null;
  created_at: string;
}
interface AvaliadorItem {
  fatos_hash: string;
  produto: string;
  ingredientes: string;
  veredito_ia: string;
  porque_ia: string;
  fonte: string;
  n_avaliacoes: number;
  marcada_aluna: boolean;
  n_marcacoes: number;
  curado_status: string | null;
  curado_validado: boolean;
  curado_veredito: string | null;
  curado_porque: string | null;
  curado_em: string | null;
  usar_como_fewshot: boolean;
  ultima: string;
}
interface AvaliadorResp {
  itens: AvaliadorItem[];
  total: number;
  marcadas: number;
  curados: number;
}

// Lu — Dúvidas Receitas (Story 10.10 do app-dqfb). Payload da ?fila=lu.
interface LuItem {
  id: string;
  conversa_id: string | null;
  tipo: string; // 'faq' | 'geracao' | 'abstencao' | ...
  pergunta: string;
  resposta: string;
  thumbs: number | null; // -1 | 1 | null
  review_status: string;
  fontes: { fonte_tipo?: string; id?: string }[] | null;
  receita_titulo?: string | null;
  scores: {
    qaScore?: number | string | null;
    curadoria_lu?: {
      modo?: string;
      em?: string;
      resposta_nova?: string | null;
      resposta_anterior?: string | null;
    } | null;
  } | null;
  created_at: string;
}
interface LuResp {
  itens: LuItem[];
  pendentes: number;
}

// Lu — Curadoria PROPONENTE (Story 16.2). Payload da ?fila=lu-proposta.
interface LuPropostaItem {
  id: string;
  pergunta: string; // canônica (desidratada — sem a pessoa, com o referente)
  proposta: string;
  classe: 'nova' | 'enriquecimento';
  fonte: 'abstencao' | 'conflito_runtime' | 'thumbs' | 'ima' | null;
  ancora_id: string | null;
  ancora_titulo: string | null;
  alvo_id: string | null; // vizinha a enriquecer (quando classe='enriquecimento')
  alvo_pergunta: string | null;
  alvo_resposta_atual: string | null;
  created_at: string;
}
interface LuPropostaResp {
  itens: LuPropostaItem[];
  pendentes: number;
}
interface MineracaoResp {
  ok?: boolean;
  lote?: number;
  geradas?: number;
  skips?: number;
  descartes?: number;
}

function usePainelApi() {
  const getPass = useCallback(() => {
    let p = localStorage.getItem('dqfb_pass');
    if (!p) {
      p = window.prompt(`Senha do painel (usuário ${USER}):`) || '';
      if (p) localStorage.setItem('dqfb_pass', p);
    }
    return p;
  }, []);

  const api = useCallback(
    async (path: string, opts?: RequestInit) => {
      for (let t = 0; t < 3; t++) {
        const r = await fetch(BASE + path, {
          ...opts,
          headers: { authorization: 'Basic ' + btoa(`${USER}:${getPass()}`), 'content-type': 'application/json' },
        });
        if (r.status === 401) {
          localStorage.removeItem('dqfb_pass');
          throw new Error('Senha incorreta — recarregue a página.');
        }
        if (r.status >= 500 && t < 2) {
          await sleep(1500);
          continue;
        }
        if (!r.ok) throw new Error('Erro ' + r.status);
        return r.json();
      }
    },
    [getPass],
  );

  return api;
}

export default function PainelDqfb() {
  const api = usePainelApi();
  const [tab, setTab] = useState<'custo' | 'revisar' | 'avaliador' | 'lu' | 'lu-proposta'>('custo');
  const [custo, setCusto] = useState<Custo | null>(null);
  const [fila, setFila] = useState<FilaItem[] | null>(null);
  const [avaliador, setAvaliador] = useState<AvaliadorResp | null>(null);
  const [lu, setLu] = useState<LuResp | null>(null);
  const [luProp, setLuProp] = useState<LuPropostaResp | null>(null);
  const [minerando, setMinerando] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  const loadCusto = useCallback(async () => {
    setErro('');
    setCarregando(true);
    try {
      setCusto((await api('?data=1')) as Custo);
    } catch (e) {
      setErro(String(e));
    } finally {
      setCarregando(false);
    }
  }, [api]);

  const loadFila = useCallback(async () => {
    setErro('');
    setCarregando(true);
    try {
      const d = (await api('?fila=mel')) as { itens: FilaItem[] };
      setFila(d.itens ?? []);
    } catch (e) {
      setErro(String(e));
    } finally {
      setCarregando(false);
    }
  }, [api]);

  const loadAvaliador = useCallback(async () => {
    setErro('');
    setCarregando(true);
    try {
      setAvaliador((await api('?fila=avaliador')) as AvaliadorResp);
    } catch (e) {
      setErro(String(e));
    } finally {
      setCarregando(false);
    }
  }, [api]);

  const [luStatus, setLuStatus] = useState<'pendente' | 'revisadas'>('pendente');
  const loadLu = useCallback(async (st?: 'pendente' | 'revisadas') => {
    setErro('');
    setCarregando(true);
    try {
      setLu((await api('?fila=lu&status=' + (st ?? luStatus))) as LuResp);
    } catch (e) {
      setErro(String(e));
    } finally {
      setCarregando(false);
    }
  }, [api, luStatus]);

  const loadLuProp = useCallback(async () => {
    setErro('');
    setCarregando(true);
    try {
      setLuProp((await api('?fila=lu-proposta')) as LuPropostaResp);
    } catch (e) {
      setErro(String(e));
    } finally {
      setCarregando(false);
    }
  }, [api]);

  useEffect(() => {
    void loadCusto();
  }, [loadCusto]);

  const trocarTab = (t: 'custo' | 'revisar' | 'avaliador' | 'lu' | 'lu-proposta') => {
    setTab(t);
    if (t === 'custo') void loadCusto();
    else if (t === 'revisar') void loadFila();
    else if (t === 'lu') void loadLu();
    else if (t === 'lu-proposta') void loadLuProp();
    else void loadAvaliador();
  };

  const atualizarTab = () => {
    if (tab === 'custo') void loadCusto();
    else if (tab === 'revisar') void loadFila();
    else if (tab === 'lu') void loadLu();
    else if (tab === 'lu-proposta') void loadLuProp();
    else void loadAvaliador();
  };

  // Lu — Curadoria proponente (Story 16.2): botão "Minerar" + 3 ações na fila.
  const minerar = async () => {
    setMinerando(true);
    try {
      const res = (await api('', {
        method: 'POST',
        body: JSON.stringify({ action: 'lu_minerar' }),
      })) as MineracaoResp;
      window.alert(
        `Mineração concluída.\n\nPropostas novas: ${res?.geradas ?? 0}\n` +
          `Sem material suficiente (puladas): ${res?.skips ?? 0}\n` +
          `Barradas nos guards: ${res?.descartes ?? 0}`,
      );
      await loadLuProp();
    } catch (e) {
      window.alert(String(e));
    } finally {
      setMinerando(false);
    }
  };

  const acaoProposta = async (
    action: 'lu_prop_confiar' | 'lu_prop_corrigir' | 'lu_prop_ignorar',
    id: string,
    resposta?: string,
  ): Promise<boolean> => {
    try {
      const res = (await api('', {
        method: 'POST',
        body: JSON.stringify({ action, id, ...(resposta ? { resposta } : {}) }),
      })) as { ok?: boolean; error?: string };
      if (res?.error) {
        window.alert(res.error);
        return false;
      }
      setLuProp((d) =>
        d ? { ...d, itens: d.itens.filter((x) => x.id !== id), pendentes: d.pendentes - 1 } : d,
      );
      return true;
    } catch (e) {
      window.alert(String(e));
      return false;
    }
  };

  const removerDaFila = (id: string) => setFila((f) => (f ? f.filter((x) => x.id !== id) : f));

  const acao = async (id: string, action: 'revisar' | 'descartar') => {
    let nota: string | null = null;
    if (action === 'descartar') nota = window.prompt('Motivo do descarte (opcional):') || null;
    try {
      await api('', { method: 'POST', body: JSON.stringify({ action, id, nota }) });
      removerDaFila(id);
    } catch (e) {
      window.alert(String(e));
    }
  };

  const promover = async (
    id: string,
    p: { titulo: string; resumo: string; lente: string | null; doi: string },
  ) => {
    if (!p.titulo.trim() || !p.resumo.trim()) {
      window.alert('Título e resumo são obrigatórios.');
      return;
    }
    try {
      const res = (await api('', {
        method: 'POST',
        body: JSON.stringify({ action: 'promover', id, ...p }),
      })) as { embedded?: boolean };
      removerDaFila(id);
      window.alert(
        res?.embedded
          ? 'Adicionado ao acervo! ✅ Já está pesquisável pela Mel.'
          : 'Adicionado ao acervo! ⚠️ Ficou sem busca por ora — avise o suporte técnico para indexar.',
      );
    } catch (e) {
      window.alert(String(e));
    }
  };

  // Avaliador (Cozinha da Fran) — curar/ignorar/exemplo. Retorna true no sucesso
  // (a tela fecha o editor); erros de voz voltam 200 c/ {error, detalhes}.
  const acaoAvaliador = async (body: Record<string, unknown>): Promise<boolean> => {
    try {
      const res = (await api('', { method: 'POST', body: JSON.stringify(body) })) as {
        error?: string;
        detalhes?: string;
        warnings?: string[];
      };
      if (res?.error) {
        window.alert(res.detalhes || res.error);
        return false;
      }
      if (res?.warnings?.length) {
        window.alert('Salvo com avisos:\n• ' + res.warnings.join('\n• '));
      }
      await loadAvaliador();
      return true;
    } catch (e) {
      window.alert(String(e));
      return false;
    }
  };

  // Lu — Dúvidas Receitas: Confiar/Ignorar/Exemplo são diretas; Corrigir tem o fluxo
  // preview-then-confirm (quando o backend detecta vizinha ≥0,90, a 1ª chamada volta
  // requer_confirmacao com o alvo — mostramos e reenviamos com confirmar:true).
  const acaoLuSimples = async (action: 'lu_confiar' | 'lu_ignorar' | 'lu_exemplo', id: string) => {
    try {
      const res = (await api('', { method: 'POST', body: JSON.stringify({ action, id }) })) as {
        ensinou?: boolean;
      } | undefined;
      // AC-9: Confiar em resposta GERADA sem parecida no acervo → virou FAQ (a Lu aprendeu).
      if (action === 'lu_confiar' && res?.ensinou) {
        window.alert('Além de confiar, guardei essa resposta no acervo — a próxima aluna recebe na hora. ✅');
      }
      setLu((d) => (d ? { ...d, itens: d.itens.filter((x) => x.id !== id), pendentes: d.pendentes - 1 } : d));
    } catch (e) {
      window.alert(String(e));
    }
  };

  const reabrirLu = async (id: string) => {
    try {
      const res = (await api('', { method: 'POST', body: JSON.stringify({ action: 'lu_reabrir', id }) })) as {
        desfeito?: string;
      };
      if (res?.desfeito === 'faq-criada-rejeitada') {
        window.alert('Reaberta — e a resposta que tinha entrado no acervo foi removida. ↩️');
      } else if (res?.desfeito === 'resposta-anterior-restaurada') {
        window.alert('Reaberta — e a resposta do acervo voltou ao texto anterior. ↩️');
      }
      void loadLu();
    } catch (e) {
      window.alert(String(e));
    }
  };

  const corrigirLu = async (id: string, resposta: string): Promise<boolean> => {
    try {
      const res = (await api('', {
        method: 'POST',
        body: JSON.stringify({ action: 'lu_corrigir', id, resposta }),
      })) as {
        ok?: boolean;
        requer_confirmacao?: boolean;
        modo?: string;
        modo_previsto?: string;
        vizinha_pergunta?: string;
        vizinha_resposta_atual?: string | null;
        score?: number;
        error?: string;
      };
      if (res?.error) {
        window.alert(res.error);
        return false;
      }
      if (res?.requer_confirmacao) {
        const okSubstituir = window.confirm(
          'Já existe uma resposta MUITO parecida no acervo (' +
            Math.round((res.score ?? 0) * 100) +
            '% igual):\n\nPergunta dela: ' +
            (res.vizinha_pergunta ?? '') +
            '\n\nResposta atual dela: ' +
            (res.vizinha_resposta_atual ?? '') +
            '\n\nSubstituir o texto dessa resposta pelo seu? (Cancelar = não mexe em nada)',
        );
        if (!okSubstituir) return false;
        const res2 = (await api('', {
          method: 'POST',
          body: JSON.stringify({ action: 'lu_corrigir', id, resposta, confirmar: true }),
        })) as { ok?: boolean; modo?: string; error?: string };
        if (res2?.error) {
          window.alert(res2.error);
          return false;
        }
        window.alert('Atualizei a resposta que já existia — a Lu vai responder com o seu texto. ✅');
      } else if (res?.modo === 'faq-atualizada') {
        window.alert('Atualizei a resposta que a Lu tinha usado — já vale na próxima pergunta. ✅');
      } else if (res?.modo === 'faq-nova') {
        window.alert('Criei uma resposta nova no acervo com a sua correção — já pesquisável. ✅');
      } else {
        window.alert('Correção salva. ✅');
      }
      setLu((d) => (d ? { ...d, itens: d.itens.filter((x) => x.id !== id), pendentes: d.pendentes - 1 } : d));
      return true;
    } catch (e) {
      window.alert(String(e));
      return false;
    }
  };

  return (
    <>
      <meta name="robots" content="noindex" />
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="pdqfb-wrap">
        <div className="pdqfb-top">
          <div>
            <div className="pdqfb-eyebrow">DQFB · Admin</div>
            <h1 className="pdqfb-h1">
              Painel <span>DQFB</span>
            </h1>
            <div className="pdqfb-tools">
              <button onClick={atualizarTab}>Atualizar</button>
              <button
                onClick={() => {
                  localStorage.removeItem('dqfb_pass');
                  location.reload();
                }}
              >
                Trocar senha
              </button>
            </div>
          </div>
          <div className="pdqfb-note">
            {custo?.desde ? `histórico desde ${custo.desde} · US$ ${custo.usd_brl}` : ''}
          </div>
        </div>

        <div className="pdqfb-tabs">
          <button className={tab === 'custo' ? 'on' : ''} onClick={() => trocarTab('custo')}>
            Custo de IA
          </button>
          <button className={tab === 'revisar' ? 'on' : ''} onClick={() => trocarTab('revisar')}>
            Mel respostas
          </button>
          <button className={tab === 'avaliador' ? 'on' : ''} onClick={() => trocarTab('avaliador')}>
            Avaliador
          </button>
          <button className={tab === 'lu' ? 'on' : ''} onClick={() => trocarTab('lu')}>
            Lu · Dúvidas Receitas
          </button>
          <button className={tab === 'lu-proposta' ? 'on' : ''} onClick={() => trocarTab('lu-proposta')}>
            Lu · Propostas
          </button>
        </div>

        {erro ? <div className="pdqfb-err">{erro}</div> : null}
        {carregando ? <div className="pdqfb-loading">Carregando…</div> : null}

        {!carregando && tab === 'custo' && custo ? <CustoView d={custo} /> : null}
        {!carregando && tab === 'revisar' && fila ? (
          <RevisarView itens={fila} onAcao={acao} onPromover={promover} />
        ) : null}
        {!carregando && tab === 'avaliador' && avaliador ? (
          <AvaliadorView d={avaliador} onAcao={acaoAvaliador} />
        ) : null}
        {!carregando && tab === 'lu' && lu ? (
          <LuView
            d={lu}
            status={luStatus}
            onStatus={(st) => {
              setLuStatus(st);
              void loadLu(st);
            }}
            onSimples={acaoLuSimples}
            onCorrigir={corrigirLu}
            onReabrir={reabrirLu}
          />
        ) : null}
        {!carregando && tab === 'lu-proposta' && luProp ? (
          <LuPropostaView d={luProp} minerando={minerando} onMinerar={minerar} onAcao={acaoProposta} />
        ) : null}
      </div>
    </>
  );
}

function CustoView({ d }: { d: Custo }) {
  const maxDia = Math.max(1, ...d.dia.map((x) => x.brl));
  const maxProv = Math.max(1, ...d.provedor.map((x) => x.brl));
  return (
    <>
      <div className="pdqfb-kpis">
        <div className="pdqfb-kpi dark">
          <div className="lbl">Total · histórico</div>
          <div className="val">{fmt(d.total_brl)}</div>
        </div>
        <div className="pdqfb-kpi">
          <div className="lbl">Chamadas de IA</div>
          <div className="val">{d.chamadas.toLocaleString('pt-BR')}</div>
        </div>
        <div className="pdqfb-kpi">
          <div className="lbl">Usuárias</div>
          <div className="val">{d.usuarias}</div>
        </div>
        <div className="pdqfb-kpi">
          <div className="lbl">Custo médio</div>
          <div className="val">
            {fmt(d.custo_medio_brl)}
            <small>/chamada</small>
          </div>
        </div>
      </div>

      <div className="pdqfb-grid">
        <div className="pdqfb-panel">
          <h2>Por provedor</h2>
          {d.provedor.map((p) => (
            <div key={p.provedor}>
              <div className="pdqfb-row">
                <div className="name">
                  {p.provedor} <small>{p.chamadas} chamadas</small>
                </div>
                <div className="v">{fmt(p.brl)}</div>
              </div>
              <div className="pdqfb-bar">
                <span style={{ width: `${Math.round((p.brl / maxProv) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="pdqfb-panel">
          <h2>Por feature</h2>
          <table>
            <thead>
              <tr>
                <th>Feature</th>
                <th className="num">Chamadas</th>
                <th className="num">Custo</th>
              </tr>
            </thead>
            <tbody>
              {d.feature.map((f) => (
                <tr key={f.feature}>
                  <td>{f.feature}</td>
                  <td className="num">{f.chamadas}</td>
                  <td className="num">{fmt(f.brl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pdqfb-panel" style={{ marginTop: 18 }}>
        <h2>
          Por mês <small>histórico completo</small>
        </h2>
        <table>
          <thead>
            <tr>
              <th>Mês</th>
              <th className="num">Chamadas</th>
              <th className="num">Custo</th>
            </tr>
          </thead>
          <tbody>
            {d.mes.map((m) => (
              <tr key={m.mes}>
                <td>{m.mes}</td>
                <td className="num">{m.chamadas}</td>
                <td className="num">{fmt(m.brl)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pdqfb-panel" style={{ marginTop: 18 }}>
        <h2>
          Por dia <small>últimos {d.dias_grafico}d</small>
        </h2>
        <div className="pdqfb-spark">
          {d.dia.map((x) => (
            <div key={x.dia} className="d" style={{ height: `${Math.round((x.brl / maxDia) * 100)}%` }}>
              <span className="t">
                {x.dia.slice(5)} · {fmt(x.brl)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="pdqfb-panel" style={{ marginTop: 18 }}>
        <h2>
          Top usuárias <small>por custo</small>
        </h2>
        <table>
          <thead>
            <tr>
              <th>Usuária</th>
              <th className="num">Chamadas</th>
              <th className="num">Custo</th>
            </tr>
          </thead>
          <tbody>
            {d.usuaria.map((u) => (
              <tr key={u.usuaria}>
                <td>{u.usuaria}…</td>
                <td className="num">{u.chamadas}</td>
                <td className="num">{fmt(u.brl)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function RevisarView({
  itens,
  onAcao,
  onPromover,
}: {
  itens: FilaItem[];
  onAcao: (id: string, a: 'revisar' | 'descartar') => void;
  onPromover: (id: string, p: { titulo: string; resumo: string; lente: string | null; doi: string }) => void;
}) {
  if (itens.length === 0) return <div className="pdqfb-loading">Nenhuma resposta pendente. 🎉</div>;
  return (
    <>
      <div className="pdqfb-filahead">{itens.length} resposta(s) pendente(s)</div>
      {itens.map((it) => (
        <ReviewCard key={it.id} it={it} onAcao={onAcao} onPromover={onPromover} />
      ))}
    </>
  );
}

function ReviewCard({
  it,
  onAcao,
  onPromover,
}: {
  it: FilaItem;
  onAcao: (id: string, a: 'revisar' | 'descartar') => void;
  onPromover: (id: string, p: { titulo: string; resumo: string; lente: string | null; doi: string }) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [resumo, setResumo] = useState('');
  const [lente, setLente] = useState<string | null>(null);
  const [doi, setDoi] = useState('');
  const fb = it.feedback === 'positivo' ? '👍' : it.feedback === 'negativo' ? '👎' : '';
  const fontes = it.fontes_citadas ?? [];

  return (
    <div className="pdqfb-rcard">
      <div className="rhead">
        <span className="tier">{it.tier_usado}</span>
        {fb ? <span>{fb}</span> : null}
        <span className="rdata">{(it.created_at || '').slice(0, 10)}</span>
      </div>
      <div className="rperg">{it.pergunta}</div>
      <div className="rresp">{it.resposta}</div>
      {fontes.length > 0 ? (
        <div className="rfontes">
          {fontes.map((f, i) => (
            <span key={i} className="fchip">
              {(f.tipo || 'fonte') + (f.doi ? ` · ${f.doi}` : f.id ? ` · ${f.id}` : '')}
            </span>
          ))}
        </div>
      ) : null}
      <div className="racoes">
        <button className="b ok" onClick={() => onAcao(it.id, 'revisar')}>
          Revisada
        </button>
        <button className="b" onClick={() => onAcao(it.id, 'descartar')}>
          Descartar
        </button>
        <button className="b pink" onClick={() => setAberto((v) => !v)}>
          Ao acervo
        </button>
      </div>
      {aberto ? (
        <div className="promform">
          <div className="hint">
            Escreva a versão CERTA — vira fonte das próximas respostas (não copie a conversa)
          </div>
          <input className="pi" placeholder="Título do artigo" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          <textarea
            className="pi"
            placeholder="Resumo curado e citável"
            value={resumo}
            onChange={(e) => setResumo(e.target.value)}
          />
          <div className="lentes">
            {(['alinhado', 'ressalva', 'contra'] as const).map((l) => (
              <button
                key={l}
                className={`lb${lente === l ? ' on' : ''}`}
                onClick={() => setLente((cur) => (cur === l ? null : l))}
              >
                {l === 'alinhado' ? 'Alinhado' : l === 'ressalva' ? 'Com ressalva' : 'Contra'}
              </button>
            ))}
          </div>
          <input className="pi" placeholder="DOI (opcional)" value={doi} onChange={(e) => setDoi(e.target.value)} />
          <button className="b pink" onClick={() => onPromover(it.id, { titulo, resumo, lente, doi })}>
            Adicionar ao acervo
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ─── Avaliador (Cozinha da Fran) — fatia read-only: lista por produto ─────────
// Suporta as escalas de 3 (combina/depende/nao_combina) e 5/8 níveis (12.Q5.1).
const VEREDITO_LABEL: Record<string, string> = {
  combina: 'Combina',
  depende: 'Depende',
  nao_combina: 'Não combina',
  gosto: 'Gosto',
  rotina: 'Rotina',
  excecao: 'Exceção',
  prateleira: 'Prateleira',
  nao_entra: 'Não entra',
};
const FONTE_LABEL: Record<string, string> = {
  ia: 'IA',
  cache: 'cache',
  curado: 'curado',
  deterministico: 'regra',
};

function vereditoTom(v: string): 'ok' | 'no' | 'mid' {
  if (v === 'combina' || v === 'rotina') return 'ok';
  if (v === 'nao_combina' || v === 'nao_entra' || v === 'prateleira') return 'no';
  return 'mid';
}

function estadoCuradoria(it: AvaliadorItem): string {
  if (it.curado_status === 'curado' && it.curado_validado) {
    return it.usar_como_fewshot ? '✓ curado · exemplo' : '✓ curado';
  }
  if (it.curado_status === 'arquivado') return 'arquivado';
  if (it.curado_status) return it.curado_status;
  return 'pendente';
}

// Data em fuso BR (America/Sao_Paulo) — o dia bate com o calendário da Fran.
function fmtData(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Os 5 níveis oficiais (12.Q5.1) — usados no <select> do editor de curadoria.
const NIVEIS: ReadonlyArray<{ v: string; label: string }> = [
  { v: 'gosto', label: 'Dessa eu gosto (1)' },
  { v: 'rotina', label: 'Uso, mas fico de olho (2)' },
  { v: 'excecao', label: 'Somente como exceção (3)' },
  { v: 'prateleira', label: 'Deixo na prateleira (4)' },
  { v: 'nao_entra', label: 'Não entra de jeito nenhum (5)' },
];

type AcaoAvaliador = (body: Record<string, unknown>) => Promise<boolean>;

function AvaliadorCard({ it, onAcao }: { it: AvaliadorItem; onAcao: AcaoAvaliador }) {
  const [editor, setEditor] = useState<null | 'confiar' | 'corrigir'>(null);
  const [veredito, setVeredito] = useState('');
  const [porque, setPorque] = useState('');
  const [salvando, setSalvando] = useState(false);

  const jaCurado = it.curado_status === 'curado' && it.curado_validado;
  // Quando curado, o card mostra a decisão da FRAN (veredito + texto); a IA vira "base".
  const vExibido = jaCurado && it.curado_veredito ? it.curado_veredito : it.veredito_ia;

  const abrir = (modo: 'confiar' | 'corrigir') => {
    if (modo === 'confiar') {
      // decisão B: traz o veredito + o texto da IA para a Fran revisar e assinar.
      setVeredito(it.veredito_ia);
      setPorque(it.porque_ia || '');
    } else {
      setVeredito(it.curado_veredito || it.veredito_ia);
      setPorque(it.curado_porque || '');
    }
    setEditor(modo);
  };

  const salvar = async () => {
    if (!veredito || !porque.trim()) {
      window.alert('Escolha o veredito e escreva o porquê.');
      return;
    }
    setSalvando(true);
    const ok = await onAcao({
      action: 'curar',
      fatos_hash: it.fatos_hash,
      veredito,
      porque,
      produto_nome: it.produto,
    });
    setSalvando(false);
    if (ok) setEditor(null);
  };

  const ignorar = async () => {
    if (!window.confirm('Arquivar este produto? Sai da fila e não entra no treino da IA.')) return;
    await onAcao({ action: 'ignorar', fatos_hash: it.fatos_hash });
  };

  const toggleExemplo = () => onAcao({ action: 'exemplo', fatos_hash: it.fatos_hash, on: !it.usar_como_fewshot });

  // Mantém o veredito atual como opção se ele for um dos 3 antigos (backward-compat).
  const opcoes = !veredito || NIVEIS.some((n) => n.v === veredito)
    ? NIVEIS
    : [{ v: veredito, label: `${VEREDITO_LABEL[veredito] ?? veredito} (atual)` }, ...NIVEIS];

  return (
    <div className="pdqfb-acard">
      <div className="ahead">
        {it.marcada_aluna ? (
          <span className="star" title={`${it.n_marcacoes} reporte(s) de aluna`}>⭐</span>
        ) : null}
        <span className="prod">{it.produto}</span>
        <span className={`vchip ${vereditoTom(vExibido)}`}>
          {VEREDITO_LABEL[vExibido] ?? vExibido}
        </span>
        <span className="meta">
          {it.n_avaliacoes}× · {FONTE_LABEL[it.fonte] ?? it.fonte}
        </span>
        <span className="estado">{estadoCuradoria(it)}</span>
      </div>
      {it.ingredientes ? <div className="aingr">{it.ingredientes}</div> : null}
      {jaCurado && it.curado_porque ? (
        <>
          <div className="aporque curado">
            <span className="tag fran">Fran</span>“{it.curado_porque}”
          </div>
          {it.porque_ia ? (
            <div className="aporque ia-base">
              <span className="tag ia">IA base</span>“{it.porque_ia}”
            </div>
          ) : null}
        </>
      ) : it.porque_ia ? (
        <div className="aporque">“{it.porque_ia}”</div>
      ) : null}

      <div className="adatas">
        Avaliado em {fmtData(it.ultima)}
        {jaCurado && it.curado_em ? ` · Curado em ${fmtData(it.curado_em)}` : ''}
      </div>

      {editor === null ? (
        <div className="aacts">
          <button className="act ok" onClick={() => abrir('confiar')}>✅ Confiar</button>
          <button className="act" onClick={() => abrir('corrigir')}>✏️ Corrigir</button>
          <button className="act" onClick={ignorar}>🗄️ Ignorar</button>
          <button
            className={`act ${it.usar_como_fewshot ? 'on' : ''}`}
            disabled={!jaCurado}
            onClick={toggleExemplo}
            title={
              jaCurado
                ? 'Guarda este caso para o treino futuro da IA. Ainda NÃO muda a avaliação — a marcação fica salva para quando o treino for ligado.'
                : 'Confie ou corrija o veredito antes de guardar como exemplo de treino.'
            }
          >
            ⭐ Exemplo{it.usar_como_fewshot ? ' ✓ guardado' : ''}
          </button>
        </div>
      ) : (
        <div className="aedit">
          <div className="ehint">
            {editor === 'confiar'
              ? 'Confiar: revise o texto da IA e assine como a sua opinião.'
              : 'Corrigir: escolha o veredito e escreva o porquê na sua voz.'}
          </div>
          <label className="elbl">Veredito</label>
          <select value={veredito} onChange={(e) => setVeredito(e.target.value)}>
            {opcoes.map((o) => (
              <option key={o.v} value={o.v}>{o.label}</option>
            ))}
          </select>
          <label className="elbl">Porquê — vira o texto curado que a aluna vê</label>
          <textarea
            rows={4}
            value={porque}
            onChange={(e) => setPorque(e.target.value)}
            placeholder="Ex.: Esse produto usa maltitol e eritritol…"
          />
          <div className="ebtns">
            <button className="act ok" disabled={salvando} onClick={salvar}>
              {salvando ? 'Salvando…' : 'Salvar curadoria'}
            </button>
            <button className="act" disabled={salvando} onClick={() => setEditor(null)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function AvaliadorView({ d, onAcao }: { d: AvaliadorResp; onAcao: AcaoAvaliador }) {
  if (d.total === 0) {
    return <div className="pdqfb-loading">Nenhum produto avaliado ainda.</div>;
  }
  return (
    <>
      <div className="pdqfb-kpis">
        <div className="pdqfb-kpi dark">
          <div className="lbl">Produtos avaliados</div>
          <div className="val">{d.total}</div>
        </div>
        <div className="pdqfb-kpi">
          <div className="lbl">⭐ Marcados por aluna</div>
          <div className="val">{d.marcadas}</div>
        </div>
        <div className="pdqfb-kpi">
          <div className="lbl">Já curados</div>
          <div className="val">{d.curados}</div>
        </div>
        <div className="pdqfb-kpi">
          <div className="lbl">Pendentes</div>
          <div className="val">{d.total - d.curados}</div>
        </div>
      </div>
      <div className="pdqfb-filahead">
        {d.total} produto(s) · ⭐ = aluna reportou · ✅ confiar · ✏️ corrigir · 🗄️ ignorar · ⭐ exemplo (guarda p/ treino futuro da IA)
      </div>
      {d.itens.map((it) => (
        <AvaliadorCard key={it.fatos_hash} it={it} onAcao={onAcao} />
      ))}
    </>
  );
}

// ─── Lu — Dúvidas Receitas (Story 10.10) ──────────────────────────────────────
// Fila já vem ordenada do backend (👎 primeiro, depois recentes). As 4 ações espelham
// a UX do Avaliador que a Fran já conhece; Corrigir abre editor com o texto da Lu.
function LuView({
  d,
  status,
  onStatus,
  onSimples,
  onCorrigir,
  onReabrir,
}: {
  d: LuResp;
  status: 'pendente' | 'revisadas';
  onStatus: (st: 'pendente' | 'revisadas') => void;
  onSimples: (a: 'lu_confiar' | 'lu_ignorar' | 'lu_exemplo', id: string) => Promise<void>;
  onCorrigir: (id: string, resposta: string) => Promise<boolean>;
  onReabrir: (id: string) => void;
}) {
  const filtro = (
    <div className="pdqfb-tabs" style={{ margin: '0 0 14px', borderBottom: 'none' }}>
      <button className={status === 'pendente' ? 'on' : ''} onClick={() => onStatus('pendente')}>
        Pendentes
      </button>
      <button className={status === 'revisadas' ? 'on' : ''} onClick={() => onStatus('revisadas')}>
        Já avaliadas
      </button>
    </div>
  );
  if (d.itens.length === 0) {
    return (
      <>
        {filtro}
        <div className="pdqfb-loading">
          {status === 'pendente' ? 'Nenhuma resposta pendente — a Lu está em dia. 💛' : 'Nenhuma resposta avaliada ainda.'}
        </div>
      </>
    );
  }
  const negativas = d.itens.filter((x) => x.thumbs === -1).length;
  return (
    <>
      {filtro}
      <div className="pdqfb-kpis">
        <div className="pdqfb-kpi dark">
          <div className="lbl">{status === 'pendente' ? 'Respostas pendentes' : 'Já avaliadas'}</div>
          <div className="val">{d.itens.length}</div>
        </div>
        <div className="pdqfb-kpi">
          <div className="lbl">👎 da aluna (olhar primeiro)</div>
          <div className="val">{negativas}</div>
        </div>
        <div className="pdqfb-kpi">
          <div className="lbl">👍 da aluna</div>
          <div className="val">{d.itens.filter((x) => x.thumbs === 1).length}</div>
        </div>
        <div className="pdqfb-kpi">
          <div className="lbl">Sem feedback</div>
          <div className="val">{d.itens.filter((x) => x.thumbs == null).length}</div>
        </div>
      </div>
      <div className="pdqfb-filahead">
        {d.pendentes} resposta(s) · 👎 aparecem primeiro · ✅ confiar · ✏️ corrigir (ensina a Lu) · 🗄️ ignorar · ⭐ exemplo
      </div>
      {d.itens.map((it) => (
        <LuCard key={it.id} it={it} onSimples={onSimples} onCorrigir={onCorrigir} onReabrir={onReabrir} />
      ))}
    </>
  );
}

function LuCard({
  it,
  onSimples,
  onCorrigir,
  onReabrir,
}: {
  it: LuItem;
  onSimples: (a: 'lu_confiar' | 'lu_ignorar' | 'lu_exemplo', id: string) => Promise<void>;
  onCorrigir: (id: string, resposta: string) => Promise<boolean>;
  onReabrir: (id: string) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(it.resposta);
  const [salvando, setSalvando] = useState(false);

  const qa = it.scores?.qaScore != null ? Number(it.scores.qaScore) : null;
  const tipoLabel = it.tipo === 'faq' ? 'FAQ curada' : it.tipo === 'geracao' ? 'Gerada' : it.tipo;
  const trilha = it.scores?.curadoria_lu ?? null;
  const respostaNova = trilha?.resposta_nova && trilha.resposta_nova !== it.resposta ? trilha.resposta_nova : null;

  const salvar = async () => {
    if (!texto.trim()) {
      window.alert('Escreva a resposta corrigida.');
      return;
    }
    setSalvando(true);
    const ok = await onCorrigir(it.id, texto.trim());
    setSalvando(false);
    if (ok) setEditando(false);
  };

  const ignorar = () => {
    if (!window.confirm('Arquivar esta resposta? Ela sai da fila e não muda nada no acervo.')) return;
    void onSimples('lu_ignorar', it.id);
  };

  return (
    <div className="pdqfb-rcard">
      <div className="rhead">
        <span className="tier">{tipoLabel}</span>
        {it.receita_titulo ? (
          <span className="tier" style={{ background: '#EAF2EE', color: '#2F5A46' }}>🍰 {it.receita_titulo}</span>
        ) : (
          <span className="tier" style={{ background: '#FBEEDC', color: '#8A5A18' }}>sem receita identificada</span>
        )}
        {it.thumbs === -1 ? <span className="tier" style={{ background: '#F8E2E4', color: '#881D28' }}>👎 aluna</span> : null}
        {it.thumbs === 1 ? <span className="tier" style={{ background: '#E3F0E9', color: '#2F7A5A' }}>👍 aluna</span> : null}
        {qa != null && Number.isFinite(qa) ? <span className="tier">match {Math.round(qa * 100)}%</span> : null}
        {it.review_status !== 'pendente' ? (
          <span className="tier" style={{ background: '#EEE9F5', color: '#5B4B7A' }}>
            {it.review_status === 'revisada' ? '✅ confiada' : it.review_status === 'promovida_faq' ? '✏️ corrigida' : it.review_status === 'descartada' ? '🗄️ ignorada' : '⭐ exemplo'}
          </span>
        ) : null}
        <span className="rdata">
          aluna {fmtData(it.created_at)}
          {trilha?.em ? ' · curada ' + fmtData(trilha.em) : ''}
        </span>
      </div>
      <div className="rperg">{it.pergunta}</div>
      {editando ? (
        <div className="promform">
          <div className="hint">Sua correção vira a resposta oficial da Lu (na hora, sem retreino)</div>
          <textarea
            className="pi"
            rows={7}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            disabled={salvando}
          />
          <div className="racoes">
            <button className="b pink" onClick={() => void salvar()} disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar correção'}
            </button>
            <button className="b" onClick={() => setEditando(false)} disabled={salvando}>
              Cancelar
            </button>
          </div>
        </div>
      ) : it.review_status !== 'pendente' ? (
        <>
          {respostaNova ? (
            <>
              <div className="hint" style={{ fontFamily: 'ui-monospace,monospace', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--pinky)', margin: '4px 0 6px' }}>
                Resposta nova — vale a partir de agora
              </div>
              <div className="rresp" style={{ borderLeft: '3px solid var(--pinky)' }}>{respostaNova}</div>
              <div className="hint" style={{ fontFamily: 'ui-monospace,monospace', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)', margin: '10px 0 6px' }}>
                O que a aluna recebeu na época
              </div>
              <div className="rresp" style={{ opacity: 0.7 }}>{it.resposta}</div>
            </>
          ) : (
            <div className="rresp">{it.resposta}</div>
          )}
          <div className="racoes">
            <button
              className="b"
              onClick={() => {
                if (window.confirm('Reabrir esta resposta? Ela volta para a fila — e se a ação tinha guardado algo no acervo, o desfazer é automático.')) {
                  onReabrir(it.id);
                }
              }}
            >
              ↩️ Reabrir
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="rresp">{it.resposta}</div>
          <div className="racoes">
            <button className="b ok" onClick={() => void onSimples('lu_confiar', it.id)}>
              ✅ Confiar
            </button>
            <button className="b pink" onClick={() => { setTexto(it.resposta); setEditando(true); }}>
              ✏️ Corrigir
            </button>
            <button className="b" onClick={ignorar}>
              🗄️ Ignorar
            </button>
            <button
              className="b"
              onClick={() => {
                if (window.confirm('Marcar como EXEMPLO? Guarda esta resposta para o treino futuro da Lu.')) {
                  void onSimples('lu_exemplo', it.id);
                }
              }}
            >
              ⭐ Exemplo
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Lu — Curadoria PROPONENTE (Story 16.2) ────────────────────────────────────
// A Lu minera os próprios pontos-cegos e traz PROPOSTAS já redigidas (âncora + números
// conferidos + guards). A Fran decide em 1 clique: Confiar / Corrigir / Ignorar — nunca
// redige do zero. Mesma UX/visual da aba "Lu · Dúvidas Receitas".
function LuPropostaView({
  d,
  minerando,
  onMinerar,
  onAcao,
}: {
  d: LuPropostaResp;
  minerando: boolean;
  onMinerar: () => void;
  onAcao: (
    a: 'lu_prop_confiar' | 'lu_prop_corrigir' | 'lu_prop_ignorar',
    id: string,
    resposta?: string,
  ) => Promise<boolean>;
}) {
  const botao = (
    <div className="pdqfb-tabs" style={{ margin: '0 0 14px', borderBottom: 'none' }}>
      <button className="pdqfb-minerar" onClick={onMinerar} disabled={minerando}>
        {minerando ? '⛏️ Minerando…' : '🔍 Minerar pontos-cegos'}
      </button>
    </div>
  );
  const novas = d.itens.filter((x) => x.classe === 'nova').length;
  const enriq = d.itens.filter((x) => x.classe === 'enriquecimento').length;
  return (
    <>
      {botao}
      <div className="pdqfb-kpis">
        <div className="pdqfb-kpi dark">
          <div className="lbl">Propostas na fila</div>
          <div className="val">{d.pendentes}</div>
        </div>
        <div className="pdqfb-kpi">
          <div className="lbl">Perguntas novas</div>
          <div className="val">{novas}</div>
        </div>
        <div className="pdqfb-kpi">
          <div className="lbl">Enriquecer resposta curta</div>
          <div className="val">{enriq}</div>
        </div>
        <div className="pdqfb-kpi">
          <div className="lbl">Ações</div>
          <div className="val" style={{ fontSize: 15 }}>✅ ✏️ 🗄️</div>
        </div>
      </div>
      {d.itens.length === 0 ? (
        <div className="pdqfb-loading">
          Nenhuma proposta na fila. Clique em “Minerar pontos-cegos” para a Lu buscar lacunas e trazer rascunhos. 💛
        </div>
      ) : (
        <>
          <div className="pdqfb-filahead">
            {d.pendentes} proposta(s) · ✅ confiar (publica) · ✏️ corrigir (seu texto) · 🗄️ ignorar
          </div>
          {d.itens.map((it) => (
            <LuPropostaCard key={it.id} it={it} onAcao={onAcao} />
          ))}
        </>
      )}
    </>
  );
}

const FONTE_PROP_LABEL: Record<string, string> = {
  abstencao: 'ficou sem resposta',
  conflito_runtime: 'respostas em conflito',
  thumbs: '👎 da aluna',
  ima: 'resposta curta demais',
};

function LuPropostaCard({
  it,
  onAcao,
}: {
  it: LuPropostaItem;
  onAcao: (
    a: 'lu_prop_confiar' | 'lu_prop_corrigir' | 'lu_prop_ignorar',
    id: string,
    resposta?: string,
  ) => Promise<boolean>;
}) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(it.proposta);
  const [salvando, setSalvando] = useState(false);
  const enriquecimento = it.classe === 'enriquecimento';

  const confiar = async () => {
    setSalvando(true);
    await onAcao('lu_prop_confiar', it.id);
    setSalvando(false);
  };
  const salvar = async () => {
    if (!texto.trim()) {
      window.alert('Escreva a resposta.');
      return;
    }
    setSalvando(true);
    const ok = await onAcao('lu_prop_corrigir', it.id, texto.trim());
    setSalvando(false);
    if (ok) setEditando(false);
  };
  const ignorar = () => {
    if (!window.confirm('Descartar esta proposta? Ela sai da fila e nada é publicado.')) return;
    void onAcao('lu_prop_ignorar', it.id);
  };

  return (
    <div className="pdqfb-rcard">
      <div className="rhead">
        <span className="tier" style={enriquecimento
          ? { background: '#EEE9F5', color: '#5B4B7A' }
          : { background: '#E3F0E9', color: '#2F7A5A' }}>
          {enriquecimento ? '➕ enriquecer resposta' : '🆕 pergunta nova'}
        </span>
        {it.ancora_titulo ? (
          <span className="tier" style={{ background: '#EAF2EE', color: '#2F5A46' }}>🍰 {it.ancora_titulo}</span>
        ) : (
          <span className="tier" style={{ background: '#FBEEDC', color: '#8A5A18' }}>sem receita amarrada</span>
        )}
        {it.fonte ? <span className="tier">{FONTE_PROP_LABEL[it.fonte] ?? it.fonte}</span> : null}
        <span className="rdata">minerada {fmtData(it.created_at)}</span>
      </div>
      <div className="rperg">{it.pergunta}</div>

      {enriquecimento && it.alvo_resposta_atual ? (
        <>
          <div className="hint" style={{ fontFamily: 'ui-monospace,monospace', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)', margin: '4px 0 6px' }}>
            Resposta curta de hoje
          </div>
          <div className="rresp" style={{ opacity: 0.7 }}>{it.alvo_resposta_atual}</div>
          <div className="hint" style={{ fontFamily: 'ui-monospace,monospace', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--pinky)', margin: '10px 0 6px' }}>
            Proposta da Lu — auto-contida
          </div>
        </>
      ) : null}

      {editando ? (
        <div className="promform">
          <div className="hint">Seu texto entra no lugar da proposta — publica ao salvar</div>
          <textarea className="pi" rows={6} value={texto} onChange={(e) => setTexto(e.target.value)} disabled={salvando} />
          <div className="racoes">
            <button className="b pink" onClick={() => void salvar()} disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar e publicar'}
            </button>
            <button className="b" onClick={() => setEditando(false)} disabled={salvando}>Cancelar</button>
          </div>
        </div>
      ) : (
        <>
          <div className="rresp" style={{ borderLeft: '3px solid var(--pinky)' }}>{it.proposta}</div>
          <div className="racoes">
            <button className="b ok" onClick={() => void confiar()} disabled={salvando}>✅ Confiar</button>
            <button className="b pink" onClick={() => { setTexto(it.proposta); setEditando(true); }} disabled={salvando}>✏️ Corrigir</button>
            <button className="b" onClick={ignorar} disabled={salvando}>🗄️ Ignorar</button>
          </div>
        </>
      )}
    </div>
  );
}

const CSS = `
.pdqfb-wrap{--pinky:#CE3B87;--velvet:#881D28;--cream-200:#F5E6E8;--off:#F8F4F3;--paper:#FFFFFF;--ink:#1A1416;--ink-2:#4E3F44;--ink-3:#8E7E83;--ink-4:#C9BDC0;--hairline:rgba(26,20,22,0.08);--success:#2F7A5A;--pink-300:#E07AAE;
  max-width:1100px;margin:0 auto;padding:28px 24px 64px;color:var(--ink);background:var(--off);min-height:100vh;font-family:var(--font-manrope),-apple-system,Helvetica,Arial,sans-serif;}
.pdqfb-wrap *{box-sizing:border-box;}
.pdqfb-top{display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:4px;}
.pdqfb-eyebrow{font-family:ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:var(--ink-3);}
.pdqfb-h1{font-family:var(--font-fraunces),Georgia,serif;font-weight:600;font-size:40px;line-height:0.95;margin:6px 0 0;}
.pdqfb-h1 span{color:var(--pinky);}
.pdqfb-note{font-family:ui-monospace,monospace;font-size:10px;letter-spacing:0.12em;color:var(--ink-3);text-transform:uppercase;}
.pdqfb-tools{display:flex;gap:8px;margin-top:8px;}
.pdqfb-tools button{font-family:ui-monospace,monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;background:var(--paper);border:1px solid var(--ink-4);color:var(--ink-2);border-radius:999px;padding:6px 12px;cursor:pointer;}
.pdqfb-tabs{display:flex;gap:8px;margin:18px 0 22px;border-bottom:1px solid var(--hairline);}
.pdqfb-tabs button{font-family:ui-monospace,monospace;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:var(--ink-3);background:none;border:none;border-bottom:2px solid transparent;padding:10px 6px;cursor:pointer;}
.pdqfb-tabs button.on{color:var(--pinky);border-bottom-color:var(--pinky);}
.pdqfb-minerar{font-family:inherit;font-size:13px;font-weight:600;letter-spacing:0.01em;text-transform:none;background:var(--pinky);color:#fff;border:1px solid var(--pinky);border-bottom:1px solid var(--pinky);border-radius:999px;padding:9px 18px;cursor:pointer;}
.pdqfb-minerar:disabled{opacity:0.55;cursor:not-allowed;}
.pdqfb-err{color:var(--velvet);font-size:13px;margin:8px 0;}
.pdqfb-loading{color:var(--ink-3);font-family:ui-monospace,monospace;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;padding:20px 0;}
.pdqfb-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:4px 0 22px;}
@media(max-width:760px){.pdqfb-kpis{grid-template-columns:repeat(2,1fr);}}
.pdqfb-kpi{background:var(--paper);border:1px solid var(--hairline);border-radius:16px;padding:16px 18px;}
.pdqfb-kpi.dark{background:var(--ink);color:var(--off);border-color:transparent;position:relative;overflow:hidden;}
.pdqfb-kpi.dark::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--pinky);}
.pdqfb-kpi .lbl{font-family:ui-monospace,monospace;font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:var(--ink-3);}
.pdqfb-kpi.dark .lbl{color:var(--cream-200);}
.pdqfb-kpi .val{font-family:var(--font-fraunces),Georgia,serif;font-weight:600;font-size:34px;line-height:1;margin-top:8px;}
.pdqfb-kpi.dark .val{color:#fff;}
.pdqfb-kpi .val small{font-family:ui-monospace,monospace;font-size:11px;color:var(--ink-3);letter-spacing:0.1em;margin-left:3px;}
.pdqfb-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;}
@media(max-width:760px){.pdqfb-grid{grid-template-columns:1fr;}}
.pdqfb-panel{background:var(--paper);border:1px solid var(--hairline);border-radius:16px;padding:20px;}
.pdqfb-panel h2{font-family:var(--font-fraunces),Georgia,serif;font-weight:600;font-size:20px;margin:0 0 14px;}
.pdqfb-panel h2 small{font-family:ui-monospace,monospace;font-size:9px;letter-spacing:0.14em;color:var(--ink-3);text-transform:uppercase;}
.pdqfb-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px;}
.pdqfb-row .name{font-size:13px;color:var(--ink);}
.pdqfb-row .name small{font-family:ui-monospace,monospace;font-size:9px;color:var(--ink-3);letter-spacing:0.1em;text-transform:uppercase;margin-left:6px;}
.pdqfb-row .v{font-family:var(--font-fraunces),Georgia,serif;font-size:16px;}
.pdqfb-bar{height:5px;background:var(--cream-200);border-radius:999px;overflow:hidden;margin-bottom:12px;}
.pdqfb-bar>span{display:block;height:100%;border-radius:999px;background:var(--pinky);}
.pdqfb-panel table{width:100%;border-collapse:collapse;font-size:13px;}
.pdqfb-panel th{font-family:ui-monospace,monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:var(--ink-3);text-align:left;font-weight:500;padding:8px 6px;border-bottom:1px solid var(--hairline);}
.pdqfb-panel td{padding:9px 6px;border-bottom:1px solid var(--hairline);}
.pdqfb-panel td.num,.pdqfb-panel th.num{text-align:right;font-family:ui-monospace,monospace;}
.pdqfb-spark{display:flex;align-items:flex-end;gap:4px;height:90px;margin-top:8px;}
.pdqfb-spark .d{flex:1;background:var(--pink-300);border-radius:3px 3px 0 0;min-height:3px;position:relative;}
.pdqfb-spark .d:hover{background:var(--pinky);}
.pdqfb-spark .d .t{position:absolute;bottom:100%;left:50%;transform:translateX(-50%);font-family:ui-monospace,monospace;font-size:8px;color:var(--ink-3);white-space:nowrap;margin-bottom:2px;opacity:0;}
.pdqfb-spark .d:hover .t{opacity:1;}
.pdqfb-filahead{font-family:ui-monospace,monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:var(--ink-3);margin-bottom:14px;}
.pdqfb-rcard{background:var(--paper);border:1px solid var(--hairline);border-radius:16px;padding:18px 20px;margin-bottom:16px;}
.pdqfb-rcard .rhead{display:flex;align-items:center;gap:10px;font-family:ui-monospace,monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--ink-3);margin-bottom:10px;}
.pdqfb-rcard .rhead .tier{background:var(--cream-200);color:var(--ink-2);padding:2px 8px;border-radius:999px;}
.pdqfb-rcard .rhead .rdata{margin-left:auto;}
.pdqfb-rcard .rperg{font-family:var(--font-fraunces),Georgia,serif;font-style:italic;font-size:18px;color:var(--ink);margin-bottom:8px;}
.pdqfb-rcard .rresp{font-size:14px;line-height:1.55;color:var(--ink-2);white-space:pre-wrap;max-height:240px;overflow:auto;background:var(--off);border-radius:10px;padding:12px;}
.pdqfb-rcard .rfontes{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;}
.pdqfb-rcard .fchip{font-family:ui-monospace,monospace;font-size:9px;color:var(--ink-3);background:var(--cream-200);padding:2px 7px;border-radius:999px;}
.pdqfb-rcard .racoes{display:flex;gap:8px;margin-top:14px;}
.pdqfb-rcard .b{font-family:inherit;font-size:13px;font-weight:500;border:1px solid var(--ink-4);background:var(--paper);color:var(--ink-2);border-radius:10px;padding:8px 16px;cursor:pointer;}
.pdqfb-rcard .b.ok{border-color:var(--success);color:var(--success);}
.pdqfb-rcard .b.pink{background:var(--pinky);border-color:var(--pinky);color:#fff;}
.pdqfb-rcard .promform{margin-top:14px;border-top:1px dashed var(--hairline);padding-top:14px;display:flex;flex-direction:column;gap:10px;}
.pdqfb-rcard .promform .hint{font-family:ui-monospace,monospace;font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:var(--ink-3);}
.pdqfb-rcard .pi{font-family:inherit;font-size:14px;color:var(--ink);background:var(--paper);border:1px solid var(--hairline);border-radius:10px;padding:10px 12px;width:100%;}
.pdqfb-rcard textarea.pi{min-height:90px;resize:vertical;}
.pdqfb-rcard .lentes{display:flex;gap:8px;}
.pdqfb-rcard .lb{font-family:inherit;font-size:12px;border:1px solid var(--hairline);background:var(--paper);color:var(--ink-2);border-radius:999px;padding:6px 14px;cursor:pointer;}
.pdqfb-rcard .lb.on{background:var(--pinky);border-color:var(--pinky);color:#fff;}
.pdqfb-acard{background:var(--paper);border:1px solid var(--hairline);border-radius:14px;padding:14px 16px;margin-bottom:10px;}
.pdqfb-acard .ahead{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.pdqfb-acard .star{font-size:14px;line-height:1;}
.pdqfb-acard .prod{font-family:var(--font-fraunces),Georgia,serif;font-size:16px;font-weight:600;color:var(--ink);}
.pdqfb-acard .meta{font-family:ui-monospace,monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--ink-3);}
.pdqfb-acard .estado{margin-left:auto;font-family:ui-monospace,monospace;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:var(--ink-2);background:var(--cream-200);padding:3px 9px;border-radius:999px;}
.pdqfb-acard .aingr{font-size:12px;color:var(--ink-3);margin-top:6px;line-height:1.45;}
.pdqfb-acard .vchip{font-family:ui-monospace,monospace;font-size:9px;letter-spacing:0.1em;text-transform:uppercase;padding:3px 9px;border-radius:999px;}
.pdqfb-acard .vchip.ok{background:rgba(47,122,90,0.12);color:var(--success);}
.pdqfb-acard .vchip.no{background:rgba(136,29,40,0.10);color:var(--velvet);}
.pdqfb-acard .vchip.mid{background:var(--cream-200);color:var(--ink-2);}
.pdqfb-acard .aporque{font-size:12.5px;color:var(--ink-2);margin-top:8px;line-height:1.5;font-style:italic;border-left:2px solid var(--cream-200);padding-left:10px;}
.pdqfb-acard .aporque.curado{color:var(--ink);border-left-color:var(--pinky);font-style:normal;}
.pdqfb-acard .aporque.ia-base{opacity:0.6;font-size:11.5px;margin-top:6px;}
.pdqfb-acard .aporque .tag{display:inline-block;font-family:ui-monospace,monospace;font-size:8px;letter-spacing:0.1em;text-transform:uppercase;padding:2px 6px;border-radius:999px;margin-right:8px;vertical-align:middle;font-style:normal;}
.pdqfb-acard .aporque .tag.fran{background:var(--pinky);color:#fff;}
.pdqfb-acard .aporque .tag.ia{background:var(--cream-200);color:var(--ink-3);}
.pdqfb-acard .adatas{font-family:ui-monospace,monospace;font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:var(--ink-3);margin-top:10px;}
.pdqfb-acard .aacts{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;}
.pdqfb-acard .act{font-family:inherit;font-size:12.5px;font-weight:500;border:1px solid var(--ink-4);background:var(--paper);color:var(--ink-2);border-radius:10px;padding:7px 13px;cursor:pointer;}
.pdqfb-acard .act:hover:not(:disabled){border-color:var(--ink-3);}
.pdqfb-acard .act.ok{border-color:var(--success);color:var(--success);}
.pdqfb-acard .act.on{background:var(--pinky);border-color:var(--pinky);color:#fff;}
.pdqfb-acard .act:disabled{opacity:0.45;cursor:not-allowed;}
.pdqfb-acard .aedit{margin-top:12px;border-top:1px dashed var(--hairline);padding-top:12px;display:flex;flex-direction:column;gap:8px;}
.pdqfb-acard .aedit .ehint{font-family:ui-monospace,monospace;font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:var(--ink-3);}
.pdqfb-acard .aedit .elbl{font-size:11px;color:var(--ink-3);margin-top:2px;}
.pdqfb-acard .aedit select,.pdqfb-acard .aedit textarea{font-family:inherit;font-size:14px;color:var(--ink);background:var(--paper);border:1px solid var(--hairline);border-radius:10px;padding:9px 12px;width:100%;}
.pdqfb-acard .aedit textarea{resize:vertical;line-height:1.5;}
.pdqfb-acard .aedit .ebtns{display:flex;gap:8px;margin-top:4px;}
`;

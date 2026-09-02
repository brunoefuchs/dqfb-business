/**
 * Story 2.66 (AC7) — o card "Uso esparso de aparelhos", como COMPONENTE PRÓPRIO.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔴 POR QUE ELE SAIU DE DENTRO DO `page.tsx` — e isto é o conserto do F-2.66-02
 *
 * A primeira versão era JSX inline no `page.tsx`, e a guarda que protegia o conserto do
 * achado MAJOR do CodeRabbit lia o arquivo como TEXTO (`expect(PAGE).toMatch(…)`). A `@qa`
 * derrubou essa guarda: **reintroduziu o defeito no JSX renderizado e deixou as duas
 * frases que a guarda procura dentro de um COMENTÁRIO no mesmo arquivo — 15/15 testes
 * ficaram verdes** com a tela dizendo «ninguém acima do limite» sobre um sinal ACESO.
 *
 * A guarda amarrava ao ARQUIVO, não ao trecho que vai para a tela. Qualquer segunda
 * ocorrência do texto (comentário, bloco comentado, card irmão) a satisfazia.
 *
 * Com o card num componente de ~150 linhas, sem `fetch`, sem `useEffect` e sem estado, o
 * teste **RENDERIZA de verdade** (`@testing-library/react` + jsdom) e afirma sobre o DOM:
 * o texto que aparece, o selo ao lado dele e quantas linhas a lista emite. Comentário
 * nenhum entra no DOM — é o que fecha o buraco por construção, não por regex mais esperta.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ⛔ Nada aqui decide se o sinal acende: o servidor entrega `sinal_abuso` resolvido (o
 *    limite do dono não pode morar num repositório público — D4).
 * ⛔ Este quadro não limita nada. A trava é decisão do dono (2.23/2.45).
 */
'use client';

import {
  contasNaSerie,
  diaCurtoBr,
  estadoDoUsoEsparso,
  LEGENDA_SINAL_USO_ESPARSO,
  RESSALVAS_USO_ESPARSO,
  rotuloDaSemana,
  type SemanaUsoEsparso,
} from './uso-esparso';

/**
 * 🔴 Quantas medições anteriores a lista emite. Constante NOMEADA porque ela é asserção:
 * o mutante da `@qa` (QP3) trocou `slice(1, 9)` por `slice(1, 2)` e SOBREVIVEU — a lista
 * encolheu de 8 para 1 sem nenhum teste reclamar (F-2.66-10).
 */
export const MAX_MEDICOES_ANTERIORES = 8;

/**
 * O card "Uso esparso de aparelhos" da aba Contas.
 *
 * @param props.semanas Série entregue pelo servidor, já em ordem decrescente de dia (é
 *   contrato de `app.painel_medicao_uso_esparso()`, guardado no smoke efêmero). A primeira
 *   linha é a medição atual. 🔴 `undefined`/`null` significa **nunca medido**, NUNCA
 *   "ninguém acima do limite" — a distinção é a razão de o card existir.
 * @param props.erro Código curto do erro de leitura, vindo de `medicao_uso_esparso_erro`.
 *   Presente e sem série, o card diz que a leitura FALHOU, com frase diferente da de
 *   "nunca medido": "não apurei" e "tentei e falhei" pedem ações diferentes.
 *   🔴 **OBRIGATÓRIA, e não opcional — é o conserto de F-2.66-11.** Com `erro?:`, a `@qa`
 *   removeu a prop da montagem no `page.tsx`, deixou um decoy num comentário JSX, e TUDO
 *   ficou verde: a guarda de texto (o decoy a satisfazia), o `tsc` (prop opcional some sem
 *   erro) e os 120 testes. Exigindo a prop, **quem reprova é o compilador** — e não há
 *   comentário que salve um `tsc` vermelho. Passe `erro={null}` explicitamente quando não
 *   houver erro: escrever `null` é uma decisão, omitir é um esquecimento silencioso.
 * @returns O card renderizado. Sem estado, sem `fetch`, sem `useEffect` — é o que torna
 *   `uso-esparso-card.test.tsx` capaz de renderizar e afirmar sobre o DOM.
 *
 * @example
 * <UsoEsparsoCard semanas={d.medicao_uso_esparso} erro={d.medicao_uso_esparso_erro} />
 */
export function UsoEsparsoCard({
  semanas,
  erro,
}: {
  semanas: SemanaUsoEsparso[] | undefined | null;
  /** 🔴 OBRIGATÓRIA (F-2.66-11) — ver o bloco acima. `null` = não houve erro. */
  erro: string | null | undefined;
}) {
  const usoEsparso = estadoDoUsoEsparso(semanas);
  // maior balde da distribuição, para escalar as barras (nunca 0: divisão por zero).
  const maxBalde = Math.max(1, ...usoEsparso.distribuicao.map((b) => b.contas));
  const contas = contasNaSerie(usoEsparso);
  return (
    <div className="pdqfb-panel" style={{ marginBottom: 18 }} data-testid="card-uso-esparso">
      <h2>Uso esparso de aparelhos</h2>
      {usoEsparso.temSerie ? (
        <>
          {/* O SINAL, primeiro — é a resposta à pergunta "tem conta compartilhando?" */}
          <div className="pdqfb-row">
            <div className="name" data-testid="uso-esparso-sinal-texto">
              {usoEsparso.sinalAceso === true ? (
                <>alguma conta passou do limite definido pelo dono</>
              ) : usoEsparso.sinalAceso === null ? (
                /* 🔴 TERCEIRO estado: medi a série, mas o sinal não respondeu. Não é
                   "tudo bem" — sai como "—", igual ao card do registro legal. */
                <>o sinal não respondeu nesta medição</>
              ) : (
                <>nenhuma conta passou do limite definido pelo dono</>
              )}
            </div>
            <div
              className="v"
              data-testid="uso-esparso-sinal-selo"
              // ⚠️ Hex literal, e é deliberado: NÃO existe token `--danger`/`--alert` neste
              // repositório (medido: 0 ocorrências de "danger" em `globals.css`). Trocar
              // por `var(--danger)` deixaria a variável indefinida e o sinal aceso SEM
              // destaque nenhum. `#c0392b` é o padrão vivo — os cards de cota e de
              // registro legal usam o mesmo, no mesmo arquivo de tela.
              // 🔴 E a cor nunca é o único portador do sinal (WCAG 1.4.1): o rótulo
              // "Olhar" em texto vai ao lado, e há teste renderizado para ele.
              style={usoEsparso.sinalAceso === true ? { color: '#c0392b' } : undefined}
            >
              {/* Rótulo em TEXTO, não só cor (WCAG 1.4.1) — como nos cards irmãos. */}
              {usoEsparso.sinalAceso === true ? (
                <small style={{ marginRight: 6, fontWeight: 600 }}>Olhar</small>
              ) : null}
              {/* 🔴 O SELO tem os MESMOS TRÊS estados do texto ao lado, e isso é achado
                  medido: o mutante QP2 da `@qa` colapsou `null` em `·` (o glifo de "tudo
                  bem") deixando o texto intacto, e SOBREVIVEU. Agora o teste renderiza e
                  lê este nó (F-2.66-09). */}
              {usoEsparso.sinalAceso === true ? '!' : usoEsparso.sinalAceso === null ? '—' : '·'}
            </div>
          </div>

          {/* A DISTRIBUIÇÃO — o retrato do momento, e o que responde à pergunta. */}
          <div style={{ marginTop: 14 }}>
            <small style={{ color: 'var(--ink-3)' }}>
              Aparelhos confirmados por conta
              {contas != null ? <> — {contas.toLocaleString('pt-BR')} contas</> : null}
            </small>
            {usoEsparso.distribuicao.map((b) => (
              <div key={b.aparelhos}>
                <div className="pdqfb-row">
                  <div className="name">
                    {b.aparelhos === 1 ? '1 aparelho' : `${b.aparelhos} aparelhos`}
                  </div>
                  <div className="v">{b.contas.toLocaleString('pt-BR')}</div>
                </div>
                <div className="pdqfb-bar">
                  <span style={{ width: `${Math.round((b.contas / maxBalde) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* A SAÚDE DA COLETA — cumulativa, e o rótulo diz isso na própria linha. */}
          <div style={{ marginTop: 16 }}>
            <small style={{ color: 'var(--ink-3)' }}>
              Saúde da coleta — <strong>acumulado desde 23/08/2026</strong>
            </small>
            <div className="pdqfb-row">
              <div className="name">aparelhos que não voltaram em outro dia</div>
              <div className="v">
                {usoEsparso.atual!.candidatos != null
                  ? usoEsparso.atual!.candidatos.toLocaleString('pt-BR')
                  : '—'}
              </div>
            </div>
            <div className="pdqfb-row">
              <div className="name">destes, a conta nunca voltou (instalou e parou)</div>
              <div className="v">
                {usoEsparso.atual!.desistencia != null
                  ? usoEsparso.atual!.desistencia.toLocaleString('pt-BR')
                  : '—'}
              </div>
            </div>
            <div className="pdqfb-row">
              <div className="name">uso esparso confirmado (voltou em outro aparelho)</div>
              <div className="v">
                {usoEsparso.atual!.esparso_confirmado != null
                  ? usoEsparso.atual!.esparso_confirmado.toLocaleString('pt-BR')
                  : '—'}
              </div>
            </div>
            <div className="pdqfb-row">
              <div className="name">a conta voltou mas nenhum aparelho se moveu</div>
              <div className="v">
                {usoEsparso.atual!.suspeita != null
                  ? usoEsparso.atual!.suspeita.toLocaleString('pt-BR')
                  : '—'}
              </div>
            </div>
            <div className="pdqfb-row">
              <div className="name">aparelhos confirmados desde o início da coleta</div>
              <div className="v">
                {usoEsparso.atual!.pct_confirmado != null
                  ? `${usoEsparso.atual!.pct_confirmado}%`
                  : '—'}
              </div>
            </div>
          </div>

          {/* A SÉRIE — as medições anteriores, para ver o movimento. */}
          {usoEsparso.semanas.length > 1 ? (
            <div style={{ marginTop: 16 }} data-testid="uso-esparso-anteriores">
              <small style={{ color: 'var(--ink-3)' }}>Medições anteriores</small>
              {usoEsparso.semanas.slice(1, 1 + MAX_MEDICOES_ANTERIORES).map((s) => (
                <div className="pdqfb-row" key={s.dia} data-testid="uso-esparso-semana">
                  <div className="name">{diaCurtoBr(s.dia)}</div>
                  {/* 🔴 O RÓTULO VEM DO MÓDULO (`rotuloDaSemana`), não de uma cadeia de
                      ternários aqui dentro. Foi assim que o conserto do achado MAJOR do
                      CodeRabbit ganhou detector de verdade: a regra mora numa função pura,
                      testada com fixture, e mutá-la vermelha o teste unitário. Reintroduzir
                      o defeito aqui significa deixar de chamar a função — e a guarda de
                      fiação pega isso. */}
                  <div className="v">{rotuloDaSemana(s)}</div>
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : erro ? (
        /* 🔴 SEGUNDO estado: a leitura QUEBROU. Frase diferente da de baixo, de propósito —
           "não apurei" e "tentei e falhei" pedem ações diferentes. */
        <div className="pdqfb-row">
          <div className="name">
            a leitura falhou ({erro}) — o card não afirma nada enquanto isso
          </div>
          <div className="v">—</div>
        </div>
      ) : (
        /* 🔴 PRIMEIRO estado: NADA foi medido ainda. ⛔ Isto NÃO é "ninguém está acima do
           limite" — a medição roda 1× por semana e a primeira pode não ter rodado. */
        <div className="pdqfb-row">
          <div className="name">ainda não medido — a medição roda toda segunda, de madrugada</div>
          <div className="v">—</div>
        </div>
      )}
      <small style={{ display: 'block', marginTop: 8, color: 'var(--ink-3)' }}>
        {RESSALVAS_USO_ESPARSO.map((r, i) => (
          <span key={i} style={{ display: 'block', marginTop: i ? 4 : 0 }}>
            ⚠️ {r}
          </span>
        ))}
        <span style={{ display: 'block', marginTop: 4 }}>{LEGENDA_SINAL_USO_ESPARSO}</span>
        <span style={{ display: 'block', marginTop: 4 }}>
          Este quadro <strong>não limita nada</strong> — nenhum acesso é bloqueado por causa
          dele.
        </span>
      </small>
    </div>
  );
}

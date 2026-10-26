'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Code2,
  Compass,
  Lightbulb,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { Answer, RunView } from '@/lib/diagnostic/types';
import styles from './diagnostic.module.css';
type Phase = 'LOADING' | 'INTRO' | 'RESUME' | 'QUESTION' | 'FEEDBACK' | 'COMPLETED';
async function request(
  body?: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<{ session?: boolean; run?: RunView | null }> {
  const response = await fetch(
    '/api/diagnostic-v2' + (!body && typeof window !== 'undefined' ? window.location.search : ''),
    {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: signal ?? AbortSignal.timeout(20000),
      cache: 'no-store',
    },
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Could not connect. Please retry.');
  return data;
}
export function DiagnosticExperience() {
  const [phase, setPhase] = useState<Phase>('LOADING'),
    [run, setRun] = useState<RunView | null>(null);
  const [session, setSession] = useState(false),
    [name, setName] = useState('');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    request(undefined, controller.signal)
      .then((data) => {
        setSession(!!data.session);
        setRun(data.run ?? null);
        setPhase(data.run ? (data.run.status === 'completed' ? 'COMPLETED' : 'RESUME') : 'INTRO');
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setError(e.message);
          setPhase('INTRO');
        }
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    heading.current?.focus();
  }, [phase, run?.current?.id]);
  async function act(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed. Retry when connected.');
    } finally {
      setBusy(false);
    }
  }
  async function start(restart = false) {
    await act(async () => {
      if (!session) {
        await request({ action: 'enter', name: name.trim() });
        setSession(true);
      }
      const data = await request({ action: 'start', restart });
      window.history.replaceState(null, '', '/diagnostic-v2');
      setRun(data.run!);
      setPhase(data.run!.status === 'completed' ? 'COMPLETED' : 'QUESTION');
    });
  }
  const current = run?.current;
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <span className={styles.mark}>S</span> SkillSetu
          <span className={styles.lab}>/ discovery lab</span>
        </Link>
        <span className={styles.pilot}>
          <span /> Python pilot
        </span>
      </header>
      <main className={styles.main} id="diagnostic-main" aria-busy={busy}>
        {error && (
          <div role="alert" className={styles.error}>
            {error}
            <button
              onClick={() =>
                void act(async () => {
                  const data = await request();
                  setSession(!!data.session);
                  setRun(data.run ?? null);
                  setPhase(
                    data.run ? (data.run.status === 'completed' ? 'COMPLETED' : 'RESUME') : 'INTRO',
                  );
                })
              }
              disabled={busy}
            >
              Reconnect & resume
            </button>
            <button
              disabled={busy}
              onClick={() =>
                void act(async () => {
                  await request({ action: 'leave' });
                  setSession(false);
                  setRun(null);
                  setPhase('INTRO');
                  window.history.replaceState(null, '', '/diagnostic-v2');
                })
              }
            >
              Start a new browser session
            </button>
          </div>
        )}
        {phase === 'LOADING' && <p role="status">Finding your saved progress…</p>}
        {(phase === 'INTRO' || phase === 'RESUME') && (
          <div className={styles.intro}>
            <section>
              <p className={styles.eyebrow}>
                <Compass size={16} /> A clearer next step
              </p>
              <h1 ref={heading} tabIndex={-1}>
                Discover what
                <br />
                you can <em>really do.</em>
              </h1>
              <p className={styles.lead}>
                Trace a little code. Repair a boundary. Plan a safer change. Build a picture of your
                Python skills, one decision at a time.
              </p>
              <div className={styles.facts}>
                <span>
                  <b>18–30</b> adaptive tasks
                </span>
                <span>
                  <b>6</b> core competencies
                </span>
                <span>
                  <b>Your pace</b> saved as you go
                </span>
              </div>
              <p>
                Different answers lead to different questions. When the evidence is unclear, your
                report will say so.
              </p>
              {phase === 'RESUME' && run ? (
                <div className={styles.entry}>
                  <b>Your progress is waiting.</b>
                  <p>{run.answered} answers saved · next task ready</p>
                  <button className={styles.primary} onClick={() => setPhase('QUESTION')}>
                    Resume diagnostic <ArrowRight size={18} />
                  </button>
                </div>
              ) : (
                <form
                  className={styles.entry}
                  onSubmit={(e) => {
                    e.preventDefault();
                    void start();
                  }}
                >
                  {!session && (
                    <>
                      <label htmlFor="pilot-name">What should we call you?</label>
                      <input
                        id="pilot-name"
                        autoComplete="nickname"
                        maxLength={40}
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your nickname"
                      />
                    </>
                  )}
                  <button className={styles.primary} disabled={busy || (!session && !name.trim())}>
                    {busy ? 'Preparing your first task…' : 'Explore my Python skills'}{' '}
                    <ArrowRight size={18} />
                  </button>
                </form>
              )}
              <p className={styles.note}>
                <ShieldCheck size={16} /> Private to this browser session. A preliminary learning
                diagnostic, with no hiring score. Keep this browser’s cookies to resume.
              </p>
            </section>
            <aside
              className={styles.pathCard}
              aria-label="Six competencies explored in this diagnostic"
            >
              <p className={styles.eyebrow}>Your discovery map</p>
              <h2>
                Small tasks.
                <br />
                Useful signals.
              </h2>
              {[
                'Values & control flow',
                'Collections & mutation',
                'Function contracts',
                'Failure handling',
                'Input validation',
                'Testing & verification',
              ].map((label, i) => (
                <div className={styles.pathNode} key={label}>
                  <span>{i === 0 ? <Code2 size={20} /> : `0${i + 1}`}</span>
                  <div>
                    <b>{label}</b>
                    <small>
                      {i === 0 ? 'Start with one concrete input' : 'Explore through applied tasks'}
                    </small>
                  </div>
                </div>
              ))}
              <p className={styles.note}>About 30–45 minutes. Take breaks whenever you need.</p>
            </aside>
          </div>
        )}
        {(phase === 'QUESTION' || phase === 'FEEDBACK') && run && (
          <>
            <div className={styles.sessionBar}>
              <span>
                Python Developer <span className={styles.separator}>/</span> Skill discovery
              </span>
              <span>
                {run.answered} answered · up to {run.maximum}
              </span>
            </div>
            <progress
              className={styles.progress}
              value={run.answered}
              max={run.maximum}
              aria-label={`${run.answered} answers saved, maximum ${run.maximum}; length adapts to your evidence`}
            />
            <div className={styles.workspace}>
              <aside className={styles.coverage}>
                <p className={styles.eyebrow}>Competencies</p>
                {run.competencies.map((c) => (
                  <div
                    key={c.id}
                    className={current?.competencyId === c.id ? styles.activeCompetency : ''}
                  >
                    <span>{c.name}</span>
                    <small>{c.count} responses</small>
                  </div>
                ))}
                <p className={styles.note}>
                  Length adapts to your evidence. Progress measures saved responses, not
                  proficiency.
                </p>
              </aside>
              <section className={styles.taskCard}>
                {phase === 'FEEDBACK' ? (
                  <div className={styles.feedback}>
                    <span className={styles.feedbackIcon}>
                      {run.lastFeedback?.correct ? <Check size={32} /> : <Compass size={32} />}
                    </span>
                    <p className={styles.eyebrow}>Response saved</p>
                    <h1 ref={heading} tabIndex={-1}>
                      {run.lastFeedback?.correct
                        ? 'That matches this task.'
                        : 'A useful signal to explore.'}
                    </h1>
                    <p>
                      {run.lastFeedback?.correct
                        ? 'We’ll check understanding through more than one response.'
                        : 'One response doesn’t define your ability. We’ll use a different task to build a clearer picture.'}
                    </p>
                    {run.lastFeedback?.assisted && (
                      <p>You used a process hint. This response is labelled as assisted.</p>
                    )}
                    <p className={styles.note}>
                      Worked explanations appear after the diagnostic to limit coaching during
                      assessment.
                    </p>
                    <button
                      className={styles.primary}
                      onClick={() =>
                        setPhase(run.status === 'completed' ? 'COMPLETED' : 'QUESTION')
                      }
                    >
                      {run.status === 'completed' ? 'See my skill map' : 'Continue discovery'}{' '}
                      <ArrowRight size={18} />
                    </button>
                  </div>
                ) : (
                  current && (
                    <>
                      <p className={styles.eyebrow}>
                        <Code2 size={16} /> Task {run.answered + 1} <span>·</span>{' '}
                        {current.type === 'completion'
                          ? 'Code completion'
                          : current.type === 'ordering'
                            ? 'Repair workflow'
                            : current.type === 'prediction'
                              ? 'Trace & predict'
                              : 'Reasoning'}
                      </p>
                      <h1 ref={heading} tabIndex={-1}>
                        {current.title}
                      </h1>
                      <p className={styles.prompt}>{current.prompt}</p>
                      {current.code && (
                        <div className={styles.codePanel}>
                          <div>
                            <span className={styles.codeDot} /> Python <span>Read & reason</span>
                          </div>
                          <pre>
                            <code>{current.code}</code>
                          </pre>
                        </div>
                      )}
                      <QuestionControls
                        key={current.id}
                        run={run}
                        busy={busy}
                        onAnswer={async (answer) => {
                          await act(async () => {
                            const data = await request({
                              action: 'answer',
                              runId: run.id,
                              questionId: current.id,
                              answer,
                            });
                            setRun(data.run!);
                            setPhase('FEEDBACK');
                          });
                        }}
                      />
                      <div className={styles.hintArea}>
                        <button
                          className={styles.quiet}
                          disabled={busy || !!run.hint}
                          onClick={() =>
                            void act(async () => {
                              const data = await request({
                                action: 'hint',
                                runId: run.id,
                                questionId: current.id,
                              });
                              setRun(data.run!);
                            })
                          }
                        >
                          <Lightbulb size={16} /> Process hint
                        </button>
                        {run.hint && <p role="status">{run.hint}</p>}
                      </div>
                      <details className={styles.why}>
                        <summary>Why this task?</summary>
                        <p>{run.rationale}</p>
                      </details>
                    </>
                  )
                )}
              </section>
            </div>
          </>
        )}
        {phase === 'COMPLETED' && run?.report && (
          <section className={styles.report}>
            <p className={styles.eyebrow}>
              <Sparkles size={16} /> Your Python skill map
            </p>
            <h1 ref={heading} tabIndex={-1}>
              Evidence into direction.
            </h1>
            <p className={styles.lead}>
              {run.report.answered} responses across six competencies. A starting point for
              learning, with uncertainty kept visible.
            </p>
            <p>
              <Link href={`/diagnostic-v2?run=${run.id}`}>Bookmark this report</Link>{' '}
              <span className={styles.note}>· Requires this browser’s session cookie</span>
            </p>
            <p className={styles.note}>
              {run.report.stopReason} · Bank {run.report.bankId}
            </p>
            <div className={styles.findings}>
              {run.report.findings.map((f) => (
                <article key={f.competencyId}>
                  <span
                    className={
                      f.status === 'Demonstrated strength' ? styles.strength : styles.signal
                    }
                  >
                    {f.status}
                  </span>
                  <h2>{f.name}</h2>
                  <p>{f.reason}</p>
                  <p className={styles.note}>
                    {f.count} responses · {f.independent} unaided · {f.correct} unaided matches ·{' '}
                    {f.types} task types
                  </p>
                  {f.prerequisites.length > 0 && (
                    <p className={styles.note}>
                      Prerequisites:{' '}
                      {f.prerequisites
                        .map((id) => run.report!.findings.find((s) => s.competencyId === id)?.name)
                        .join(', ')}
                    </p>
                  )}
                  <Link href={`/diagnostic-v2/learn?skill=${encodeURIComponent(f.moduleSkillId)}`}>
                    Explore the SkillSetu module <ArrowRight size={14} />
                  </Link>
                </article>
              ))}
            </div>
            <div className={styles.nextPlan}>
              <h2>Your next learning steps</h2>
              {run.report.learningOrder.length ? (
                <ol>
                  {run.report.learningOrder.map((id) => {
                    const f = run.report!.findings.find((s) => s.competencyId === id)!;
                    return (
                      <li key={id}>
                        <Link href={`/diagnostic-v2/learn?skill=${f.moduleSkillId}`}>{f.name}</Link>{' '}
                        <span>
                          —{' '}
                          {f.status === 'Likely gap'
                            ? 'repair the suspected gap'
                            : 'study, then collect fresh evidence'}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p>
                  Try a fresh practical project and independent review to confirm these preliminary
                  strengths.
                </p>
              )}
              <p>
                Learning and practice do not change this diagnostic. Reassessment collects new
                evidence and may give a different result.
              </p>
            </div>
            <details className={styles.review}>
              <summary>Review your submitted evidence & explanations</summary>
              {run.report.evidence.map((e, i) => (
                <article key={e.questionId}>
                  <h3>
                    {i + 1}. {e.title}
                  </h3>
                  <p>
                    {e.correct ? 'Matched this task' : 'Did not match this task'}
                    {e.assisted ? ' · Assisted' : ' · Unaided'}
                  </p>
                  <p>{e.explanation}</p>
                  {e.misconception && (
                    <small>
                      Possible misconception: {e.misconception}. This is a hypothesis, not a
                      diagnosis.
                    </small>
                  )}
                </article>
              ))}
            </details>
            <button className={styles.primary} disabled={busy} onClick={() => void start(true)}>
              <RotateCcw size={16} /> Start a fresh diagnostic
            </button>
            <p className={styles.note}>
              This pilot reuses its small bank. Familiarity can affect results. Earlier reports
              remain stored.
            </p>
          </section>
        )}
      </main>
      <footer className={styles.footer}>
        <span>SkillSetu · build skills with direction.</span>
        <span>Diagnostic evidence ≠ practice rewards</span>
      </footer>
    </div>
  );
}
function QuestionControls({
  run,
  busy,
  onAnswer,
}: {
  run: RunView;
  busy: boolean;
  onAnswer: (answer: Answer) => Promise<void>;
}) {
  const q = run.current!,
    storageKey = `diagnostic:${run.id}:${q.id}`;
  const [answer, setAnswer] = useState<Answer>(() => {
    const fallback =
      run.draft.order || run.draft.text || run.draft.selected !== undefined
        ? run.draft
        : q.steps
          ? { order: q.steps.map((s) => s.id) }
          : {};
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (
          parsed &&
          typeof parsed === 'object' &&
          !Array.isArray(parsed) &&
          (!parsed.order || Array.isArray(parsed.order))
        )
          return parsed;
      }
    } catch {
      /* Server draft remains available. */
    }
    return fallback;
  });
  const [saved, setSaved] = useState('Your submitted answers are saved automatically.');
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(answer));
    } catch {
      /* Server autosave still works. */
    }
    if (busy) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      request(
        {
          action: 'draft',
          runId: run.id,
          questionId: q.id,
          answer: answer.text === '' ? {} : answer,
        },
        controller.signal,
      )
        .then(() => setSaved('Draft saved to your session.'))
        .catch(() => {
          if (!controller.signal.aborted)
            setSaved('Draft kept in this browser. Reconnect before submitting.');
        });
    }, 650);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [answer, busy, storageKey, q.id, run.id]);
  const ready =
    q.type === 'decision'
      ? answer.selected !== undefined
      : q.type === 'ordering'
        ? !!answer.order
        : !!answer.text?.trim();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onAnswer(answer);
      }}
      className={styles.answer}
    >
      {q.options ? (
        <fieldset disabled={busy}>
          <legend>Choose your answer</legend>
          {q.options.map((option, selected) => (
            <label key={option} className={answer.selected === selected ? styles.selected : ''}>
              <input
                type="radio"
                name={q.id}
                checked={answer.selected === selected}
                onChange={() => setAnswer({ selected })}
              />
              <span>{option}</span>
            </label>
          ))}
        </fieldset>
      ) : q.steps ? (
        <div>
          <p>Move every step into the safest sequence.</p>
          <ol className={styles.orderList}>
            {answer.order?.map((id, i) => (
              <li key={id}>
                <span>{q.steps!.find((s) => s.id === id)?.text}</span>
                <div>
                  {[-1, 1].map((direction) => (
                    <button
                      type="button"
                      key={direction}
                      disabled={busy || i + direction < 0 || i + direction >= q.steps!.length}
                      aria-label={`Move step ${i + 1} ${direction < 0 ? 'up' : 'down'}`}
                      onClick={() => {
                        const order = [...answer.order!];
                        [order[i], order[i + direction]] = [order[i + direction], order[i]];
                        setAnswer({ order });
                      }}
                    >
                      {direction < 0 ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <>
          <label htmlFor="diagnostic-answer">{q.accessibility.inputLabel}</label>
          <input
            id="diagnostic-answer"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            maxLength={1000}
            value={answer.text ?? ''}
            disabled={busy}
            onChange={(e) => setAnswer({ text: e.target.value })}
            placeholder={
              q.type === 'completion'
                ? 'Enter only the missing fragment'
                : 'Enter the value or Python name'
            }
          />
          <p className={styles.note}>
            Use the requested format. Code fragments are checked against authored answers. If
            unsure, enter “unsure”.
          </p>
        </>
      )}
      <div className={styles.submitRow}>
        <span role="status" className={styles.note}>
          {busy ? 'Saving your response…' : saved}
        </span>
        <button className={styles.primary} disabled={busy || !ready}>
          {busy ? 'Saving…' : 'Submit response'} <ArrowRight size={18} />
        </button>
      </div>
    </form>
  );
}

'use client';
import { useEffect, useRef, useState } from 'react';
import type { Answer, DiagnosticView, PublicItem } from '@/lib/diagnostic/types';
import Link from 'next/link';
import styles from './diagnostic.module.css';
async function api(body?: unknown) {
  const result = await fetch(
    '/api/diagnostic-v2',
    body
      ? {
          method: 'POST',
          signal: AbortSignal.timeout(15000),
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      : { cache: 'no-store', signal: AbortSignal.timeout(15000) },
  );
  const data = await result.json();
  if (!result.ok) throw new Error(data.error ?? 'Request failed.');
  return data;
}
function Question({
  item,
  attemptId,
  busy,
  onSubmit,
}: {
  item: PublicItem;
  attemptId: string;
  busy: boolean;
  onSubmit: (answer: Answer) => Promise<void>;
}) {
  const key = `adaptive-draft:${attemptId}:${item.id}`;
  const [answer, setAnswer] = useState<Answer>({});
  const [ready, setReady] = useState(false);
  const [hint, setHint] = useState(false);
  useEffect(() => {
    const task = window.setTimeout(() => {
      try {
        const stored = localStorage.getItem(key);
        if (stored) setAnswer(JSON.parse(stored));
      } catch {}
      setReady(true);
    }, 0);
    return () => window.clearTimeout(task);
  }, [key]);
  const update = (value: Answer) => {
    setAnswer(value);
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  };
  const order = answer.order ?? item.steps?.map((s) => s.id) ?? [];
  const valid = item.options
    ? answer.selected !== undefined
    : item.steps
      ? true
      : !!answer.text?.trim();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy && valid) void onSubmit(item.steps ? { order } : answer);
      }}
    >
      <p className={styles.eyebrow}>
        {item.context} · {item.minutes} min
      </p>
      <h2 tabIndex={-1}>{item.prompt}</h2>
      {item.code && (
        <pre aria-label="Python code">
          <code>{item.code}</code>
        </pre>
      )}
      {item.options ? (
        <fieldset disabled={busy}>
          <legend>Your response</legend>
          {item.options.map((text, index) => (
            <label
              className={answer.selected === index ? styles.selected : styles.option}
              key={index}
            >
              <input
                type="radio"
                name="response"
                checked={answer.selected === index}
                onChange={() => update({ selected: index })}
              />
              <span>{text}</span>
            </label>
          ))}
        </fieldset>
      ) : item.steps ? (
        <fieldset disabled={busy}>
          <legend>Order the steps</legend>
          <ol className={styles.steps}>
            {order.map((id, index) => (
              <li key={id}>
                <span>{item.steps!.find((s) => s.id === id)!.text}</span>
                <div>
                  <button
                    type="button"
                    aria-label={`Move step ${index + 1} up`}
                    disabled={index === 0}
                    onClick={() => {
                      const next = [...order];
                      [next[index - 1], next[index]] = [next[index], next[index - 1]];
                      update({ order: next });
                    }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`Move step ${index + 1} down`}
                    disabled={index === order.length - 1}
                    onClick={() => {
                      const next = [...order];
                      [next[index + 1], next[index]] = [next[index], next[index + 1]];
                      update({ order: next });
                    }}
                  >
                    ↓
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </fieldset>
      ) : (
        <label className={styles.written}>
          {item.type === 'completion' ? 'Your code fragment' : 'Your reasoning'}
          <textarea
            spellCheck={false}
            rows={item.type === 'completion' ? 3 : 5}
            value={answer.text ?? ''}
            disabled={busy}
            maxLength={4000}
            onChange={(e) => update({ text: e.target.value })}
          />
          {item.type === 'completion' && (
            <small>
              Constrained completion: follow the requested syntax. This exercise checks an authored
              fragment; it does not execute Python.
            </small>
          )}
        </label>
      )}
      <details onToggle={(e) => setHint(e.currentTarget.open)}>
        <summary>Response guidance</summary>
        <p>
          {hint &&
            'Work independently. You can pause and return in this browser. Detailed explanations unlock in your report.'}
        </p>
      </details>
      <footer>
        <span>Draft stays in this browser</span>
        <button className={styles.primary} disabled={!ready || busy || !valid} type="submit">
          {busy ? 'Saving response…' : 'Submit response'}
        </button>
      </footer>
    </form>
  );
}
export default function DiagnosticPage() {
  const [view, setView] = useState<DiagnosticView | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [feedback, setFeedback] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    api()
      .then((data) => {
        if (data.id) setView(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    heading.current?.focus();
  }, [view?.revision, feedback]);
  async function perform(body?: unknown) {
    setBusy(true);
    setError('');
    try {
      const data = await api(body);
      if (data.id) setView(data);
      else setView(null);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save.');
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <span>↗</span> SkillSetu
        </Link>
        <span className={styles.badge}>ADAPTIVE LAB · V2</span>
        <Link href="/">Exit to home</Link>
      </header>
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <p className={styles.eyebrow}>YOUR NEXT STEP</p>
          <h2>
            Evidence over
            <br />
            assumptions.
          </h2>
          <p>Small tasks. A clearer picture of what to practice next.</p>
          <ol>
            <li>Work through real decisions</li>
            <li>Follow your adaptive route</li>
            <li>Leave with a learning plan</li>
          </ol>
          <p className={styles.note}>
            Python Developer
            <br />
            18–30 tasks · Six core competencies
            <br />
            Pause and resume in this browser
          </p>
          <Link href="/">Existing tracks & learning modules ↗</Link>
        </aside>
        <section className={styles.workspace} aria-busy={busy || loading}>
          {error && (
            <div role="alert" className={styles.error}>
              <p>{error}</p>
              <button disabled={busy} onClick={() => void perform()}>
                Reload saved progress
              </button>
            </div>
          )}
          {loading ? (
            <p role="status">Loading saved progress…</p>
          ) : !view ? (
            <div className={styles.intro}>
              <p className={styles.eyebrow}>PYTHON DEVELOPER / CORE DIAGNOSTIC</p>
              <h1 ref={heading} tabIndex={-1}>
                Find the edges
                <br />
                of your understanding.
              </h1>
              <p>
                Trace a service. Repair a fragment. Explain your reasoning. Each response shapes
                what comes next.
              </p>
              <div className={styles.cards}>
                <div>
                  <b>01</b>
                  <h3>Show your thinking</h3>
                  <p>Five task formats, beyond recognition alone.</p>
                </div>
                <div>
                  <b>02</b>
                  <h3>Get a useful next step</h3>
                  <p>Evidence and gaps, with uncertainty made visible.</p>
                </div>
              </div>
              <p>
                Independent first responses count. Detailed feedback appears at the end. This
                experimental assessment does not certify job readiness.
              </p>
              <button
                className={styles.primary}
                disabled={busy}
                onClick={() => void perform({ action: 'start' })}
              >
                {busy ? 'Preparing…' : 'Begin Python diagnostic →'}
              </button>
            </div>
          ) : feedback ? (
            <div className={styles.intro}>
              <p className={styles.eyebrow}>PROGRESS SAVED</p>
              <h1 ref={heading} tabIndex={-1}>
                One more piece
                <br />
                of the picture.
              </h1>
              <p role="status">{view.feedback}</p>
              <button className={styles.primary} onClick={() => setFeedback(false)}>
                {view.report ? 'View my skill-gap report' : 'Continue to next task →'}
              </button>
            </div>
          ) : view.report ? (
            <>
              <p className={styles.eyebrow}>PYTHON DEVELOPER · {view.answered} RESPONSES</p>
              <h1 ref={heading} tabIndex={-1}>
                Your evidence, explained.
              </h1>
              <p>{view.report.stopReason}</p>
              <p>
                These are observations on six competencies, not a validated ability score. Practice
                completion never changes this evidence.
              </p>
              <div className={styles.results}>
                {view.report.competencies.map((row) => (
                  <article key={row.id}>
                    <h3>{row.name}</h3>
                    <strong>{row.status}</strong>
                    <p>
                      {row.demonstrated} demonstrated / {row.count} observations · {row.types}{' '}
                      formats
                    </p>
                  </article>
                ))}
              </div>
              <h2>Recommended learning order</h2>
              <ol>
                {view.report.learningOrder.map((row) => (
                  <li key={row.id}>
                    <Link href={`/diagnostic-v2/learn/${row.id}`}>{row.name} →</Link>
                    <p>{row.status}. Study the concept and worked example.</p>
                  </li>
                ))}
              </ol>
              {!view.report.learningOrder.length && (
                <p>
                  Core tasks were consistent. Next, verify transfer in a fresh independently
                  reviewed case.
                </p>
              )}
              <p>
                <Link href="/">Explore all SkillSetu learning tracks ↗</Link>
              </p>
              <details>
                <summary>Areas with insufficient evidence</summary>
                <p>
                  Not measured in this slice: {view.report.unmeasured.join(', ')}. No proficiency
                  claim is made for these skills.
                </p>
              </details>
              <Review />
              <p className={styles.note}>
                Bank {view.bankVersion}. Targeted reassessment with a fresh bank is a next
                milestone; repeating known items would not establish transfer.
              </p>
            </>
          ) : (
            <>
              <div className={styles.progressLabel}>
                <span>CORE PYTHON</span>
                <span>{view.answered} saved · 18–30 tasks</span>
              </div>
              <progress
                max={view.max}
                value={view.answered}
                aria-label="Saved responses toward maximum assessment length"
              />
              <h1 className={styles.questionTitle} ref={heading} tabIndex={-1}>
                Task {view.answered + 1}
                <span>{view.question?.competency.replace('py-', '')}</span>
              </h1>
              {view.question && (
                <Question
                  key={view.question.id}
                  attemptId={view.id}
                  item={view.question}
                  busy={busy}
                  onSubmit={async (answer) => {
                    if (
                      await perform({
                        action: 'answer',
                        id: view.id,
                        revision: view.revision,
                        itemId: view.question!.id,
                        answer,
                      })
                    )
                      setFeedback(true);
                  }}
                />
              )}
              <details>
                <summary>Why this task?</summary>
                <p>{view.rationale}</p>
              </details>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
function Review() {
  const [rows, setRows] = useState<
      { itemId: string; prompt: string; earned: boolean; explanation: string; signal: string }[]
    >([]),
    [error, setError] = useState('');
  return (
    <details
      onToggle={async (e) => {
        if (e.currentTarget.open && !rows.length) {
          try {
            const res = await fetch('/api/diagnostic-v2?review=1');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setRows(data);
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Review unavailable.');
          }
        }
      }}
    >
      <summary>Review submitted evidence and explanations</summary>
      {error && <p role="alert">{error}</p>}
      {rows.map((row) => (
        <article className={styles.review} key={row.itemId}>
          <h3>{row.prompt}</h3>
          <b>{row.earned ? 'Demonstrated' : 'Needs verification'}</b>
          <p>{row.signal}</p>
          <p>{row.explanation}</p>
        </article>
      ))}
    </details>
  );
}

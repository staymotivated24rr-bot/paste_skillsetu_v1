'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Compass,
  FileBarChart2,
  FlaskConical,
  GraduationCap,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Target,
  X,
  Zap,
} from 'lucide-react';
import { roleCatalog } from '@/lib/role-catalog';
import type { DemoState } from '@/lib/types';
import { planGaps, readiness, readinessLabel } from '@/lib/engine';
import { Cohort } from './cohort';
import { Learning } from './learning';
import { Results } from './results';
import { SimulationRunner } from './simulation';
import { Empty, Meter, Stat, Steps } from './ui';
type View = 'home' | 'workspace' | 'assessment' | 'results' | 'learning' | 'report' | 'college';
const views: View[] = [
  'home',
  'workspace',
  'assessment',
  'results',
  'learning',
  'report',
  'college',
];
export function SkillSetu() {
  const [view, setView] = useState<View>('home');
  const [state, setState] = useState<DemoState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [selectedRole, setSelectedRole] = useState('data-analyst');
  const [name, setName] = useState('Demo student');
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const refresh = useCallback(async () => {
    const r = await fetch('/api/demo');
    if (r.status === 401) {
      setState(null);
      return null;
    }
    const d = await r.json();
    if (!r.ok) throw new Error(d.error ?? 'Could not load your demo.');
    setState(d);
    return d as DemoState;
  }, []);
  useEffect(() => {
    let live = true;
    const sync = () => {
      const v = window.location.hash.slice(1) as View;
      setView(views.includes(v) ? v : 'home');
    };
    window.addEventListener('hashchange', sync);
    fetch('/api/demo')
      .then(async (r) => {
        if (r.status === 401) return null;
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? 'Could not load your demo.');
        return d as DemoState;
      })
      .then((d) => {
        if (live) {
          setState(d);
          sync();
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
      window.removeEventListener('hashchange', sync);
    };
  }, []);
  function navigate(v: View) {
    setView(v);
    window.location.hash = v;
    setMobileMenu(false);
    setError('');
    if (v !== 'learning') setLessonId(null);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  async function post<T = Record<string, unknown>>(body: Record<string, unknown>): Promise<T> {
    const r = await fetch('/api/demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error ?? 'Could not save this action. Try again.');
    return d;
  }
  async function action<T>(fn: () => Promise<T>): Promise<T> {
    setBusy(true);
    setError('');
    try {
      return await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      throw e;
    } finally {
      setBusy(false);
    }
  }
  function safely(fn: () => Promise<unknown>) {
    void fn().catch(() => {});
  }
  async function enter() {
    await action(async () => {
      await post({ action: 'enter', name, roleId: selectedRole });
      await refresh();
      navigate('workspace');
    });
  }
  async function start(kind: 'diagnostic' | 'reassessment') {
    await action(async () => {
      const d = await post<{ attemptId: string }>({
        action: 'start',
        kind,
        roleId: state?.role.id,
      });
      setActiveId(d.attemptId);
      await refresh();
      navigate('assessment');
    });
  }
  async function switchRole(roleId: string) {
    await action(async () => {
      await post({ action: 'select-role', roleId });
      setActiveId(null);
      setLessonId(null);
      await refresh();
      navigate('workspace');
    });
  }
  async function openLesson(id: string) {
    await action(async () => {
      await post({
        action: 'lesson',
        lessonId: id,
        mode: state?.progress.find((p) => p.lessonId === id)?.mode ?? 'interactive',
      });
      await refresh();
      setLessonId(id);
      navigate('learning');
    });
  }
  function learn(id?: string) {
    if (id) safely(() => openLesson(id));
    else {
      setLessonId(null);
      navigate('learning');
    }
  }
  const complete = state?.attempts.filter((a) => a.status === 'complete') ?? [];
  const latest = complete.at(-1);
  const inProgress =
    state?.attempts.find((a) => a.id === activeId && a.status === 'in_progress') ??
    state?.attempts.filter((a) => a.status === 'in_progress').at(-1);
  const gaps = latest && state ? planGaps(latest.scores, state.skills) : [];
  const nav = [
    { id: 'workspace' as View, label: 'My workspace', icon: LayoutDashboard },
    { id: 'assessment' as View, label: 'Workplace diagnostic', icon: ClipboardCheck },
    { id: 'results' as View, label: 'My skill map', icon: BarChart3 },
    { id: 'learning' as View, label: 'Learning plan', icon: BookOpen },
    { id: 'report' as View, label: 'Readiness report', icon: FileBarChart2 },
  ];
  return (
    <div className={view === 'home' ? 'landing-app' : 'product-app'}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {view === 'home' ? (
        <header className="landing-nav">
          <button className="brand" onClick={() => navigate('home')} aria-label="SkillSetu home">
            <Brand />
          </button>
          <nav>
            <button onClick={() => navigate('college')}>For placement teams</button>
            <span className="badge desktop-only">A bridge to your next step</span>
            <button className="btn btn-primary" onClick={() => navigate('workspace')}>
              {state ? 'My workspace' : 'Try student demo'}
              <ArrowUpRight size={16} />
            </button>
          </nav>
        </header>
      ) : (
        <>
          <aside
            id="product-navigation"
            className={`sidebar no-print ${mobileMenu ? 'sidebar-open' : ''}`}
          >
            <button className="brand" onClick={() => navigate('home')}>
              <Brand />
            </button>
            <div className="sidebar-label">YOUR JOURNEY</div>
            <nav>
              {nav.map((n) => (
                <button
                  key={n.id}
                  className={view === n.id ? 'active' : ''}
                  onClick={() => {
                    if (n.id === 'learning') setLessonId(null);
                    navigate(n.id);
                  }}
                >
                  <n.icon size={19} />
                  {n.label}
                  {view === n.id && <span />}
                </button>
              ))}
            </nav>
            <div className="sidebar-label team-label">FOR TEAMS</div>
            <nav>
              <button
                className={view === 'college' ? 'active' : ''}
                aria-current={view === 'college' ? 'page' : undefined}
                onClick={() => navigate('college')}
              >
                <GraduationCap size={19} />
                Placement dashboard
              </button>
            </nav>
            <div className="sidebar-bottom">
              <div className="local-note">
                <span className="live-dot" />
                Prototype mode<p>Original content. No API key needed.</p>
              </div>
              <div className="profile">
                <div className="avatar">{state?.user.name.slice(0, 1).toUpperCase() ?? 'D'}</div>
                <div>
                  <b>{state?.user.name ?? 'Demo experience'}</b>
                  <small>{view === 'college' ? 'Placement officer view' : 'Student demo'}</small>
                </div>
              </div>
            </div>
          </aside>
          <header className="product-topbar no-print">
            <div>
              <button
                className="mobile-menu icon-btn"
                aria-label={mobileMenu ? 'Close navigation' : 'Open navigation'}
                aria-expanded={mobileMenu}
                aria-controls="product-navigation"
                onClick={() => setMobileMenu(!mobileMenu)}
              >
                <Menu size={22} />
              </button>
              <span>SkillSetu</span>
              <ChevronRight size={13} />
              <b>
                {view === 'college' ? 'Placement insights' : nav.find((n) => n.id === view)?.label}
              </b>
            </div>
            <div>
              {state && view !== 'college' && (
                <label className="role-switch">
                  <span>Target role</span>
                  <select
                    aria-label="Target role"
                    value={state.role.id}
                    disabled={busy}
                    onChange={(e) => safely(() => switchRole(e.target.value))}
                  >
                    {state.roles.map((role) => (
                      <option value={role.id} key={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {state && (
                <button
                  className="text-btn new-demo"
                  disabled={busy}
                  onClick={() =>
                    safely(() =>
                      action(async () => {
                        await post({ action: 'new-session' });
                        setState(null);
                        setLessonId(null);
                        setActiveId(null);
                        navigate('workspace');
                      }),
                    )
                  }
                >
                  New demo session
                </button>
              )}
            </div>
          </header>
        </>
      )}
      {error && (
        <div className="error-banner no-print" role="alert">
          <span>{error}</span>
          <button className="icon-btn" aria-label="Dismiss error" onClick={() => setError('')}>
            <X size={17} />
          </button>
        </div>
      )}
      <main id="main-content" className={view === 'home' ? 'landing-main' : 'main-content'}>
        {view === 'home' ? (
          <Landing student={() => navigate('workspace')} college={() => navigate('college')} />
        ) : view === 'college' ? (
          <Cohort />
        ) : loading ? (
          <div className="loading" role="status">
            Opening your workspace…
          </div>
        ) : !state ? (
          <Onboarding
            roleId={selectedRole}
            setRoleId={setSelectedRole}
            name={name}
            setName={setName}
            enter={() => safely(enter)}
            busy={busy}
          />
        ) : (
          <>
            {view === 'workspace' && (
              <>
                <div className="page-heading">
                  <div>
                    <span className="eyebrow">A LITTLE CLARITY. A BETTER NEXT STEP.</span>
                    <h1>Welcome, {state.user.name}.</h1>
                    <p>Your target is clear. Let’s find the shortest path to it.</p>
                  </div>
                  <span className="badge badge-green">
                    <span className="live-dot" />
                    Progress saved for this demo session
                  </span>
                </div>
                <Steps
                  active={
                    latest ? (state.progress.some((p) => p.status === 'mastered') ? 2 : 1) : 0
                  }
                />
                {!latest ? (
                  <div className="workspace-hero">
                    <div>
                      <span className="eyebrow">YOUR TARGET ROLE</span>
                      <h2>{state.role.name}</h2>
                      <p>
                        {state.role.description} {state.role.work} Start with three realistic
                        workplace cases to find which skills need your attention.
                      </p>
                      <div className="tags">
                        <span className="tag">3 workplace simulations</span>
                        <span className="tag">24 applied decisions</span>
                        <span className="tag">{state.skills.length} measurable skills</span>
                      </div>
                      <button
                        className="btn btn-primary"
                        disabled={busy}
                        onClick={() => safely(() => start('diagnostic'))}
                      >
                        {inProgress ? 'Resume workplace diagnostic' : 'Begin workplace diagnostic'}
                        <ArrowRight size={17} />
                      </button>
                      <small>No timer. No trick questions. Roughly {state.role.duration}.</small>
                    </div>
                    <div className="role-art">
                      <div className="role-art-grid" />
                      <div className="art-chip">
                        <BarChart3 size={38} />
                      </div>
                      <div className="floating-tag ft-one">
                        <CheckCircle2 size={16} />
                        Insight → action
                      </div>
                      <div className="floating-tag ft-two">
                        <MessageCircle size={16} />
                        Ask the right questions
                      </div>
                      <div className="floating-tag ft-three">
                        <Target size={16} />
                        Close specific gaps
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="stats-grid">
                      <Stat
                        label="Current readiness indicator"
                        value={`${readiness(latest.scores, state.skills)}%`}
                        detail={readinessLabel(latest.scores, state.skills)}
                        accent
                      />
                      <Stat
                        label="Skill gaps to repair"
                        value={gaps.length}
                        detail="Skills still below role targets"
                      />
                      <Stat
                        label="Modules mastered"
                        value={state.progress.filter((p) => p.status === 'mastered').length}
                        detail="From your actual practice answers"
                      />
                      <Stat
                        label="Assessments completed"
                        value={complete.length}
                        detail="Diagnostic and reassessments"
                      />
                    </div>
                    <div className="workspace-next card">
                      <div>
                        <span className="eyebrow">YOUR NEXT BEST STEP</span>
                        <h2>
                          {gaps[0]
                            ? `Focus on ${gaps[0].name.toLowerCase()}.`
                            : 'Keep building evidence.'}
                        </h2>
                        <p>
                          {gaps[0]?.description ??
                            'Every prototype target is met. Test transfer to further applied tasks.'}
                        </p>
                        <button
                          className="btn btn-primary"
                          disabled={busy}
                          onClick={() => learn(gaps[0] ? `lesson-${gaps[0].id}` : undefined)}
                        >
                          Open targeted learning
                          <ArrowRight size={16} />
                        </button>
                      </div>
                      <div className="workspace-next-score">
                        <span>Latest assessment</span>
                        <b>
                          {readiness(latest.scores, state.skills)}
                          <small>%</small>
                        </b>
                        <button className="text-btn" onClick={() => navigate('results')}>
                          See your skill map
                          <ArrowUpRight size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="actions">
                      <button
                        className="btn btn-outline"
                        disabled={busy}
                        onClick={() => safely(() => start('reassessment'))}
                      >
                        {inProgress ? 'Resume reassessment' : 'Verify with new workplace cases'}
                        <ArrowRight size={16} />
                      </button>
                      <button className="text-btn" onClick={() => navigate('report')}>
                        View readiness report
                        <ArrowUpRight size={16} />
                      </button>
                    </div>
                  </>
                )}
                <div className="section-title">
                  <h2>Practice the work, not just the theory.</h2>
                  <span className="muted small">Original SkillSetu cases</span>
                </div>
                <div className="case-cards">
                  {state.scenarios.diagnostic.map((s, i) => (
                    <div className="card case-preview" key={s.id}>
                      <div className="case-preview-top">
                        <span className="case-number">0{i + 1}</span>
                        {i === 0 ? <BarChart3 /> : i === 1 ? <FlaskConical /> : <MessageCircle />}
                      </div>
                      <h3>{s.title}</h3>
                      <p>{s.brief}</p>
                      <span className="muted small">{s.stakeholderRole} · 8 measured actions</span>
                    </div>
                  ))}
                </div>
                <div className="info-strip">
                  <Compass size={20} />
                  <p>
                    Scores are prototype indicators. A short assessment can point you toward useful
                    learning; it cannot guarantee a job or measure every workplace skill.
                  </p>
                </div>
              </>
            )}
            {view === 'assessment' &&
              (inProgress ? (
                <SimulationRunner
                  key={inProgress.id}
                  state={state}
                  attempt={inProgress}
                  busy={busy}
                  submit={(questionId, selected) =>
                    action(async () => {
                      await post({
                        action: 'answer',
                        attemptId: inProgress.id,
                        questionId,
                        selected,
                      });
                      await refresh();
                    })
                  }
                  finish={() =>
                    action(async () => {
                      await post({ action: 'complete', attemptId: inProgress.id });
                      await refresh();
                      setActiveId(null);
                      navigate('results');
                    })
                  }
                />
              ) : (
                <Empty
                  title={
                    latest ? 'Ready for another real-world challenge?' : 'Find your starting point.'
                  }
                  text={
                    latest
                      ? 'Use three different workplace cases to measure your current skills. Results may improve, stay flat, or decline — we’ll show them honestly.'
                      : 'Work with three virtual stakeholders. Clarify their requests, interpret case files, choose role-specific actions, and give a stakeholder-ready summary. All 24 actions contribute to your skill map.'
                  }
                  action={
                    <button
                      className="btn btn-primary"
                      disabled={busy}
                      onClick={() => safely(() => start(latest ? 'reassessment' : 'diagnostic'))}
                    >
                      {latest ? 'Start reassessment' : 'Begin workplace diagnostic'}
                      <ArrowRight size={16} />
                    </button>
                  }
                />
              ))}
            {(view === 'results' || view === 'report') && (
              <Results
                key={latest?.id + view}
                state={state}
                report={view === 'report'}
                busy={busy}
                learn={learn}
                reassess={() => start('reassessment')}
              />
            )}
            {view === 'learning' && (
              <>
                {lessonId && (
                  <button className="text-btn back-link" onClick={() => setLessonId(null)}>
                    ← Back to learning plan
                  </button>
                )}
                <Learning
                  state={state}
                  lessonId={lessonId}
                  busy={busy}
                  open={openLesson}
                  changeMode={(id, mode) =>
                    action(async () => {
                      await post({ action: 'lesson', lessonId: id, mode });
                      await refresh();
                    })
                  }
                  practice={(id, itemId, selected) =>
                    action(async () => {
                      const d = await post<{
                        correct?: boolean;
                        explanation?: string;
                        hint?: string;
                      }>({ action: 'practice', lessonId: id, itemId, selected });
                      if (selected !== undefined) await refresh();
                      return d;
                    })
                  }
                  restart={(id) =>
                    action(async () => {
                      await post({
                        action: 'lesson',
                        lessonId: id,
                        mode: state.progress.find((p) => p.lessonId === id)?.mode ?? 'interactive',
                        restart: true,
                      });
                      await refresh();
                    })
                  }
                  reassess={() => start('reassessment')}
                />
              </>
            )}
          </>
        )}
      </main>
      {view === 'home' ? (
        <footer className="landing-footer">
          <span className="brand">
            <Brand />
          </span>
          <span>Built for the step between learning and doing.</span>
          <small>A locally runnable prototype · No employment guarantees</small>
        </footer>
      ) : (
        <footer className="product-footer no-print">
          <span>SkillSetu · Learn with purpose.</span>
          <span>Prototype indicators. Real submitted answers.</span>
        </footer>
      )}
    </div>
  );
}
function Brand() {
  return (
    <>
      <span className="brand-symbol">
        <span />
        <span />
        <span />
      </span>
      <span>
        Skill<span className="brand-accent">Setu</span>
        <small>B R I D G E &nbsp; Y O U R &nbsp; G A P S</small>
      </span>
    </>
  );
}
function Onboarding({
  roleId,
  setRoleId,
  name,
  setName,
  enter,
  busy,
}: {
  roleId: string;
  setRoleId: (id: string) => void;
  name: string;
  setName: (n: string) => void;
  enter: () => void;
  busy: boolean;
}) {
  return (
    <div className="onboarding card">
      <span className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</span>
      <h1>Let’s make your next step clear.</h1>
      <p>
        Try the complete student journey, from a workplace diagnostic to a personalized learning
        plan and verified progress.
      </p>
      <div className="role-options" aria-label="Choose your target role">
        {roleCatalog.map((role) => (
          <button
            type="button"
            key={role.id}
            className={`role-choice ${roleId === role.id ? 'role-selected' : ''}`}
            aria-pressed={roleId === role.id}
            disabled={busy}
            onClick={() => setRoleId(role.id)}
          >
            <span className="role-choice-heading">
              <strong>{role.name}</strong>
              {roleId === role.id && <CheckCircle2 size={20} />}
            </span>
            <span>{role.description}</span>
            <span className="small">{role.work}</span>
            <span className="small muted">{role.categories.join(' · ')}</span>
            <span className="small">3 cases · 24 actions · {role.duration}</span>
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          enter();
        }}
      >
        <label className="form-label" htmlFor="demo-name">
          What should we call you?
        </label>
        <input
          id="demo-name"
          className="text-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          required
          autoComplete="off"
        />
        <small className="muted">
          A nickname is enough. This demo does not need your email or college details.
        </small>
        <button className="btn btn-primary" disabled={busy || !name.trim()}>
          Enter student demo
          <ArrowRight size={17} />
        </button>
      </form>
      <p className="small muted">
        Progress is saved to this browser’s demo session and the application database. Use “New demo
        session” to start a separate learner.
      </p>
    </div>
  );
}
function Landing({ student, college }: { student: () => void; college: () => void }) {
  return (
    <>
      <section className="landing-hero">
        <div className="hero-copy">
          <div className="hero-pill">
            <span className="live-dot" />
            LESS GUESSWORK. MORE DIRECTION.
          </div>
          <h1>
            Your next role.
            <br />
            Your exact gaps.
            <br />
            <em>Your way forward.</em>
          </h1>
          <p>
            Know exactly what stands between you and your target job. Diagnose your skills through
            real workplace scenarios, fix what matters, and verify your progress.
          </p>
          <div className="actions">
            <button className="btn btn-primary btn-large" onClick={student}>
              Find my skill gaps
              <ArrowUpRight size={19} />
            </button>
            <button className="text-btn" onClick={college}>
              Explore the college demo
              <ArrowRight size={17} />
            </button>
          </div>
          <div className="hero-proof">
            <Check size={15} />
            No courses you don’t need.
            <span />
            No API key required.
          </div>
        </div>
        <div className="hero-visual">
          <div className="visual-orbit" />
          <div className="mock-dashboard">
            <div className="mock-header">
              <div className="role-icon">
                <BarChart3 size={19} />
              </div>
              <div>
                <b>Your Data Analyst skill map</b>
                <small>Illustrative preview · not your results</small>
              </div>
              <span className="mock-dots">•••</span>
            </div>
            <div className="mock-intro">
              <span className="eyebrow">A CLEARER PICTURE</span>
              <h3>
                You don’t need to learn everything.
                <br />
                Just the right things.
              </h3>
            </div>
            <div className="mock-bars">
              {[
                ['SQL joins', 42, 75],
                ['Statistics', 38, 70],
                ['Python', 76, 65],
                ['Data visualization', 81, 70],
              ].map(([label, score, target]) => (
                <div key={label}>
                  <div>
                    <b>{label}</b>
                    <span>{score}%</span>
                  </div>
                  <Meter
                    value={score as number}
                    target={target as number}
                    label={label as string}
                    negative={(score as number) < (target as number)}
                  />
                </div>
              ))}
            </div>
            <div className="mock-recommendation">
              <Zap size={22} />
              <div>
                <b>A focused next step</b>
                <small>Build SQL joins. Then verify what changed.</small>
              </div>
              <ArrowRight size={16} />
            </div>
          </div>
          <div className="visual-float">
            <div className="float-icon">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <b>Progress you can demonstrate</b>
              <small>Before → after, from real answers</small>
            </div>
          </div>
          <div className="visual-caption">
            <span />A bridge between knowing and doing.
          </div>
        </div>
      </section>
      <section className="loop-section">
        <div className="loop-heading">
          <span className="eyebrow">ONE PURPOSEFUL LOOP</span>
          <h2>
            From “where do I start?”
            <br />
            to a plan that makes sense.
          </h2>
        </div>
        <div className="loop-cards">
          {[
            {
              icon: ClipboardCheck,
              title: 'Diagnose',
              text: 'Respond to virtual stakeholders and work through realistic analyst and developer decisions.',
            },
            {
              icon: Target,
              title: 'Fix',
              text: 'Learn only the gaps that matter, with short lessons and guided practice.',
            },
            {
              icon: CheckCircle2,
              title: 'Verify',
              text: 'Apply what you learned in new cases. See honest before-and-after scores.',
            },
            {
              icon: BriefcaseBusiness,
              title: 'Get role-ready',
              text: 'Understand your remaining gaps with a clear, evidence-based prototype report.',
            },
          ].map((s, i) => (
            <article key={s.title}>
              <div>
                <s.icon size={23} />
                <span>0{i + 1}</span>
              </div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="landing-bottom">
        <div>
          <span className="eyebrow">START FOCUSED. GROW WITH EVIDENCE.</span>
          <h2>
            Three roles. Real decisions.
            <br />A better learning path.
          </h2>
          <p>
            Choose Data Analyst, Python Developer, or Java Developer. Original workplace cases,
            targeted lessons, and independent role progress keep your learning focused and the
            complete demo affordable.
          </p>
          <button className="btn btn-primary" onClick={student}>
            Try the student experience
            <ArrowRight size={17} />
          </button>
        </div>
        <div className="college-callout">
          <GraduationCap size={29} />
          <h3>For placement teams</h3>
          <p>
            See common cohort gaps, learning completion, and changes in demonstrated readiness in a
            lightweight fictional-college dashboard.
          </p>
          <button className="text-btn" onClick={college}>
            Explore placement insights
            <ArrowUpRight size={16} />
          </button>
          <small>Seeded sample data. No real student records.</small>
        </div>
      </section>
    </>
  );
}

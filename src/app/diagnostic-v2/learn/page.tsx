import Link from 'next/link';
import { notFound } from 'next/navigation';
import { pythonRepairs } from '@/lib/authentic/python-banks';
import styles from '@/components/diagnostic.module.css';
export const dynamic = 'force-dynamic';
export default async function DiagnosticLearning({
  searchParams,
}: {
  searchParams: Promise<{ skill?: string }>;
}) {
  if (process.env.DIAGNOSTIC_V2_ENABLED !== 'true') notFound();
  const { skill } = await searchParams;
  const learningModule = pythonRepairs.find((m) => m.skillId === skill);
  if (!learningModule) notFound();
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/diagnostic-v2" className={styles.brand}>
          <span className={styles.mark}>S</span> SkillSetu
        </Link>
      </header>
      <main className={styles.main}>
        <p className={styles.eyebrow}>From your skill map · existing SkillSetu module</p>
        <h1>{learningModule.title}</h1>
        <p className={styles.lead}>{learningModule.concept}</p>
        <section className={styles.taskCard}>
          <h2>Build the intuition</h2>
          <p>{learningModule.intuition}</p>
          <h2>Work through an example</h2>
          <p>{learningModule.example}</p>
          <h2>Apply it at work</h2>
          <p>{learningModule.workplace}</p>
          <h2>Explain your reasoning</h2>
          <p>{learningModule.interview}</p>
        </section>
        <p className={styles.note}>
          Reading this module does not change assessed proficiency. Full guided practice remains in
          the existing student journey, which requires its own diagnostic.
        </p>
        <Link href="/diagnostic-v2">Return to my skill map</Link>
      </main>
    </div>
  );
}

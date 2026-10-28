import Link from 'next/link';
import { notFound } from 'next/navigation';
import { pythonTopics } from '@/lib/tracks/python-topics';
import styles from '../../diagnostic.module.css';

export default async function Study({ params }: { params: Promise<{ skillId: string }> }) {
  const { skillId } = await params;
  const topic = pythonTopics.find((entry) => `py-${entry.key}` === skillId);
  if (!topic) notFound();
  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <Link href="/diagnostic-v2" className={styles.brand}>
          ↗ SkillSetu
        </Link>
        <Link href="/diagnostic-v2">Back to my report</Link>
      </header>
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <p className={styles.eyebrow}>YOUR LEARNING PLAN</p>
          <h2>
            Build understanding.
            <br />
            Then verify it.
          </h2>
          <p>Study from the existing Python learning library.</p>
        </aside>
        <article className={styles.workspace}>
          <p className={styles.eyebrow}>PYTHON / FOCUSED STUDY</p>
          <h1>{topic.name}</h1>
          <h2>What to understand</h2>
          <p>{topic.concept}</p>
          <h2>A useful way to think</h2>
          <p>{topic.intuition}</p>
          <h2>Worked example</h2>
          <p>{topic.example}</p>
          <p className={styles.note}>
            Reading this module does not change your diagnostic evidence. Verify learning with an
            independently scored fresh task. Fresh adaptive reassessment is coming in a later
            release.
          </p>
          <Link href="/diagnostic-v2">Return to my evidence and next steps →</Link>
        </article>
      </div>
    </main>
  );
}

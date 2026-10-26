import { notFound } from 'next/navigation';
import { DiagnosticExperience } from '@/components/diagnostic-experience';
export const dynamic = 'force-dynamic';
export default function DiagnosticPage() {
  if (process.env.DIAGNOSTIC_V2_ENABLED !== 'true') notFound();
  return <DiagnosticExperience />;
}

import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'SkillSetu — Your shortest path to role-readiness',
  description:
    'Diagnose real skill gaps, learn what matters, and verify your progress through original workplace simulations.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

export type Interaction = 'prediction' | 'completion' | 'decision' | 'ordering';
export type Answer = { text?: string; selected?: number; order?: string[] };
export type Competency = {
  id: string;
  name: string;
  prerequisites: string[];
  skillIds: string[];
  moduleSkillId: string;
  subskills: string[];
};
export type Question = {
  id: string;
  version: string;
  competencyId: string;
  difficulty: 1 | 2 | 3;
  type: Interaction;
  title: string;
  prompt: string;
  code?: string;
  options?: string[];
  steps?: { id: string; text: string }[];
  expected?: string[];
  correct?: number;
  order?: string[];
  misconception: string;
  explanation: string;
  hint: string;
  seconds: number;
  context: string;
  accessibility: { inputLabel: string; codeLanguage?: 'python' };
};
export type Bank = {
  id: string;
  version: string;
  roleId: string;
  roleName: string;
  policy: { minimum: number; target: number; maximum: number; coverage: number };
  competencies: Competency[];
  questions: Question[];
};
export type Evidence = { questionId: string; correct: boolean; assisted: boolean };
export type Selection = { questionId: string | null; rationale: string };
export type Finding = {
  competencyId: string;
  name: string;
  status: 'Demonstrated strength' | 'Likely gap' | 'Insufficient evidence';
  count: number;
  independent: number;
  correct: number;
  types: number;
  reason: string;
  prerequisites: string[];
  moduleSkillId: string;
};
export type Report = {
  role: string;
  bankId: string;
  engineVersion: string;
  answered: number;
  stopReason: string;
  findings: Finding[];
  learningOrder: string[];
  evidence: {
    questionId: string;
    title: string;
    correct: boolean;
    assisted: boolean;
    explanation: string;
    misconception: string | null;
  }[];
};
export type PublicQuestion = Omit<
  Question,
  'expected' | 'correct' | 'order' | 'misconception' | 'explanation' | 'hint'
>;
export type RunView = {
  id: string;
  status: string;
  bankId: string;
  role: string;
  answered: number;
  minimum: number;
  target: number;
  maximum: number;
  competencies: { id: string; name: string; count: number }[];
  current: PublicQuestion | null;
  rationale: string;
  hint: string | null;
  draft: Answer;
  lastFeedback: { questionId: string; correct: boolean; assisted: boolean } | null;
  report: Report | null;
};

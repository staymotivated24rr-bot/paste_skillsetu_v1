export type Competency = { id: string; name: string; prerequisites: string[]; lessonId: string };
export type Item = {
  id: string;
  competency: string;
  difficulty: 1 | 2 | 3;
  version: string;
  type: 'decision' | 'prediction' | 'completion' | 'reasoning' | 'ordering';
  context: string;
  prompt: string;
  code?: string;
  options?: string[];
  steps?: { id: string; text: string }[];
  hint: string;
  minutes: number;
  accessibility: string;
  accepted?: string[];
  correct?: number;
  order?: string[];
  concepts?: string[][];
  misconception: string;
  explanation: string;
};
export type PublicItem = Pick<
  Item,
  | 'id'
  | 'competency'
  | 'difficulty'
  | 'version'
  | 'type'
  | 'context'
  | 'prompt'
  | 'code'
  | 'options'
  | 'steps'
  | 'minutes'
  | 'accessibility'
>;
export type Bank = {
  id: string;
  roleId: string;
  version: string;
  competencies: Competency[];
  items: Item[];
  min: number;
  target: number;
  max: number;
};
export type Answer = { selected?: number; text?: string; order?: string[] };
export type Evidence = {
  itemId: string;
  answer: Answer;
  earned: boolean;
  rationale: string;
  at: string;
};
export type Selection = { itemId: string; rationale: string };
export type CompetencyResult = Competency & {
  count: number;
  demonstrated: number;
  types: number;
  status:
    | 'Demonstrated in these tasks'
    | 'Likely gap'
    | 'Inconsistent evidence'
    | 'Insufficient evidence';
};
export type DiagnosticView = {
  id: string;
  revision: number;
  status: string;
  role: string;
  bankVersion: string;
  answered: number;
  min: number;
  target: number;
  max: number;
  question: PublicItem | null;
  rationale: string;
  feedback: string | null;
  report: {
    competencies: CompetencyResult[];
    learningOrder: CompetencyResult[];
    stopReason: string;
    unmeasured: string[];
  } | null;
};

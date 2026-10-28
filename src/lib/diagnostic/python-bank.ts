// Server-only authored bank. Never import this module from a client component.
import { createHash } from 'node:crypto';
import type { Bank, Item } from './types';
import { pythonTopics } from '../tracks/python-topics';
const keys = ['fundamentals', 'functions', 'structures', 'exceptions', 'testing', 'http'];
const prerequisite: Record<string, string[]> = {
  fundamentals: [],
  functions: ['fundamentals'],
  structures: ['fundamentals'],
  exceptions: ['functions'],
  testing: ['functions'],
  http: ['exceptions'],
};
type Content = {
  trace: [string, string, string, string];
  choose: [string, string, string, string];
  complete: [string, string, string];
  reason: [string, string[][]];
  steps: string[];
  misconception: string;
  hint: string;
};
const content: Record<string, Content> = {
  fundamentals: {
    trace: [
      'stock = 0\nprint(stock is None, bool(stock))',
      'False False',
      'True False',
      'False True',
    ],
    choose: [
      'An importer must accept zero stock but reject missing stock. Which check isolates missing values?',
      'stock is None',
      'not stock',
      'stock == 0',
    ],
    complete: [
      'Complete the condition so only positive quantities enter the charge branch. Use the variable qty.',
      'if ___:\n    charge(qty)',
      'qty > 0',
    ],
    reason: [
      'A loop uses range(1, len(rows)) and silently misses the first record. Explain the boundary error and one verification case.',
      [
        ['zero', '0'],
        ['first', 'index'],
        ['test', 'empty', 'boundary'],
      ],
    ],
    steps: [
      'Specify how zero, missing and negative quantities behave',
      'Trace boundary inputs through the condition',
      'Implement the explicit condition',
      'Verify empty, valid and invalid records',
    ],
    misconception: 'Zero and missing values may have been conflated.',
    hint: 'Trace concrete values, including zero, before generalizing.',
  },
  functions: {
    trace: [
      'def total(price, qty):\n    print(price * qty)\nresult = total(4, 2)\n# What value is stored in result?',
      'None',
      '8',
      '0',
    ],
    choose: [
      'A calculation reads a mutable global discount. What makes its contract independently testable?',
      'Pass the discount as a parameter and return the total',
      'Print the global before reading it',
      'Catch every exception and return zero',
    ],
    complete: [
      'Complete the body to return price times qty. Use a return statement.',
      'def subtotal(price, qty):\n    ___',
      'return price * qty',
    ],
    reason: [
      'An order helper computes a total and writes a database row. Explain how to make the calculation independently testable.',
      [
        ['pure', 'side effect'],
        ['parameter', 'input'],
        ['return', 'output'],
      ],
    ],
    steps: [
      'Write the input and output contract',
      'Separate calculation from database writes',
      'Extract a function with explicit inputs',
      'Assert its return value without database access',
    ],
    misconception: 'Printing or a hidden side effect may have been treated as a function result.',
    hint: 'Distinguish the returned value from printed output and persistence.',
  },
  structures: {
    trace: ['seen = set(["a", "a", "b"])\nprint(len(seen))', '2', '3', '1'],
    choose: [
      'A reconciliation job needs customer-ID lookup and a separate stable arrival order. Which design fits?',
      'Dictionary for lookup and list for arrival order',
      'Set for both ordered rows and balances',
      'One string joined with commas',
    ],
    complete: [
      'Fill the expression that reads an optional balance with default 0. Use balances.get.',
      'value = ___\n# key is customer_id',
      'balances.get(customer_id, 0)',
    ],
    reason: [
      'Deduplication with a set loses the original arrival order. Explain a way to keep order while checking duplicates.',
      [
        ['set', 'seen'],
        ['list', 'append'],
        ['order', 'arrival'],
      ],
    ],
    steps: [
      'Specify duplicate and ordering requirements',
      'Assign a set to membership checks and a list to output',
      'Append only IDs not already seen',
      'Test repeated IDs and output order',
    ],
    misconception: 'Uniqueness, keyed lookup and ordering may have been confused.',
    hint: 'Choose a structure for each responsibility rather than forcing one structure to do everything.',
  },
  exceptions: {
    trace: [
      'try:\n    int("bad")\nexcept ValueError:\n    result = "invalid"\n# What is result?',
      'invalid',
      '0',
      'bad',
    ],
    choose: [
      'A parser catches Exception and returns success. How should malformed input be handled?',
      'Catch ValueError and return an explicit invalid result',
      'Suppress all errors without recording them',
      'Retry forever until the same input parses',
    ],
    complete: [
      'Complete the handler for an integer conversion error. Use an except header.',
      'try:\n    value = int(raw)\n___\n    value = None',
      'except ValueError:',
    ],
    reason: [
      'A missing network configuration is silently turned into an empty successful response. Explain why and how to preserve a useful failure signal.',
      [
        ['error', 'failure'],
        ['context', 'cause'],
        ['propagate', 'raise', 'explicit'],
      ],
    ],
    steps: [
      'Reproduce the malformed input',
      'Identify the specific recoverable exception',
      'Return an explicit error while preserving context',
      'Verify valid input and unexpected failures separately',
    ],
    misconception: 'Failure may have been masked as successful empty data.',
    hint: 'Separate expected invalid input from unexpected operational failures.',
  },
  testing: {
    trace: [
      'def count(rows):\n    return len(rows)\nassert count([]) == 0\n# Does this assertion pass?',
      'Yes',
      'No: an empty list has length one',
      'No: assert cannot compare integers',
    ],
    choose: [
      'A total function fails only for an empty list. Which regression test protects the fix?',
      'Assert the expected total for an empty list',
      'Check only a long happy-path list',
      'Mock the total function itself',
    ],
    complete: [
      'Complete the regression assertion that subtotal(0, 4) returns 0.',
      '___',
      'assert subtotal(0, 4) == 0',
    ],
    reason: [
      'A unit test makes live HTTP calls and fails intermittently. Explain how to isolate the dependency and still verify the contract.',
      [
        ['mock', 'stub', 'fake'],
        ['deterministic', 'repeatable'],
        ['assert', 'expected', 'contract'],
      ],
    ],
    steps: [
      'Reproduce the failure with a small input',
      'Write an assertion that fails before the fix',
      'Apply the smallest behavioral repair',
      'Run boundary cases and the regression suite',
    ],
    misconception:
      'A happy-path check or a live dependency may have substituted for a reproducible test.',
    hint: 'A regression test should fail for the old bug and pass for the intended behavior.',
  },
  http: {
    trace: [
      'status = 429\nretry_after = 2\n# What does 429 indicate?',
      'Rate limited',
      'Successful creation',
      'Resource permanently deleted',
    ],
    choose: [
      'A payment POST times out after the server might have charged. What is the safer recovery?',
      'Reconcile using an idempotency key before retrying',
      'Send the payment again with a new ID immediately',
      'Assume timeout proves the charge never happened',
    ],
    complete: [
      'Fill the keyword argument that bounds requests.get to 5 seconds.',
      'requests.get(url, ___)',
      'timeout=5',
    ],
    reason: [
      'An API returns HTTP 200 with an unexpected JSON shape. Explain the validation needed before saving it.',
      [
        ['schema', 'shape'],
        ['validate', 'validation'],
        ['save', 'persist', 'reject'],
      ],
    ],
    steps: [
      'Define the expected response contract',
      'Apply a finite request timeout',
      'Check HTTP status and validate the response schema',
      'Persist valid data or record an explicit failure',
    ],
    misconception: 'Transport success may have been mistaken for valid business data.',
    hint: 'A successful status does not establish that the response matches your contract.',
  },
};
const items: Item[] = keys.flatMap((key) => {
  const c = content[key],
    base = {
      competency: `py-${key}`,
      version: '1.1.0',
      minutes: 2,
      accessibility: 'Text equivalent provided; all controls support keyboard input.',
      hint: c.hint,
      misconception: c.misconception,
    };
  const choices = (values: string[], offset: number) => [
    ...values.slice(offset),
    ...values.slice(0, offset),
  ];
  const hash = (label: string) => createHash('sha256').update(`${key}-${label}`).digest('hex');
  const stepId = (i: number) => `entry-${hash(`step-${i}`).slice(0, 12)}`;
  const traceOffset = parseInt(hash('trace').slice(0, 2), 16) % 3;
  const decisionOffset = parseInt(hash('decision').slice(0, 2), 16) % 3;
  return [
    {
      ...base,
      id: `adpy2-${key}-1`,
      type: 'prediction' as const,
      difficulty: 1 as const,
      context: 'Inspect a small service trace',
      prompt: 'Predict the result of this Python fragment.',
      code: c.trace[0],
      options: choices(c.trace.slice(1), traceOffset),
      correct: (3 - traceOffset) % 3,
      explanation: `The expected trace result is ${c.trace[1]}.`,
    },
    {
      ...base,
      id: `adpy2-${key}-2`,
      type: 'decision' as const,
      difficulty: 2 as const,
      context: 'Review an import-service change',
      prompt: c.choose[0],
      options: choices(c.choose.slice(1), decisionOffset),
      correct: (3 - decisionOffset) % 3,
      explanation: c.choose[1],
    },
    {
      ...base,
      id: `adpy2-${key}-3`,
      type: 'completion' as const,
      difficulty: 3 as const,
      context: 'Repair a constrained code fragment',
      prompt: c.complete[0],
      code: c.complete[1],
      accepted: [c.complete[2]],
      explanation: `A supported repair is: ${c.complete[2]}`,
    },
    {
      ...base,
      id: `adpy2-${key}-4`,
      type: 'reasoning' as const,
      difficulty: 3 as const,
      context: 'Explain a production review finding',
      prompt: c.reason[0],
      concepts: c.reason[1],
      explanation: c.hint,
    },
    {
      ...base,
      id: `adpy2-${key}-5`,
      type: 'ordering' as const,
      difficulty: 2 as const,
      context: 'Plan a verification workflow',
      prompt: 'Put the workflow in a defensible order.',
      steps: [0, 1, 2, 3]
        .sort((a, b) => hash(`display-${a}`).localeCompare(hash(`display-${b}`)))
        .map((i) => ({ id: stepId(i), text: c.steps[i] })),
      order: [0, 1, 2, 3].map(stepId),
      explanation: c.steps.join(' → '),
    },
  ];
});
export const pythonAdaptiveBank: Bank = {
  id: 'python-adaptive-2',
  roleId: 'python-developer',
  version: '1.1.0',
  min: 18,
  target: 24,
  max: 30,
  competencies: keys.map((key) => ({
    id: `py-${key}`,
    name: pythonTopics.find((t) => t.key === key)!.name,
    prerequisites: prerequisite[key].map((p) => `py-${p}`),
    lessonId: `lesson-py-${key}`,
  })),
  items,
};
export const unmeasuredPythonSkills = pythonTopics
  .filter((t) => !keys.includes(t.key))
  .map((t) => t.name);

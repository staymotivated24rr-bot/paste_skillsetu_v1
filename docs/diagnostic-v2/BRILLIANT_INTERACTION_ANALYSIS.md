# Brilliant screenshot interaction analysis

Source: user-provided Screenshot (27).pdf, 32 pages; all pages rendered and visually reviewed. These are static screenshots, not a recorded interaction trace. Original SkillSetu text, CSS and tasks were authored; no reference assets were copied.

## A. Direct observations, with page ledger
| Pages | Observable states and controls |
| --- | --- |
| 1 | Topic/course cards under Python and programming categories. |
| 2–3 | Course summary beside a vertical path; selected lesson exposes Start; other nodes appear locked. |
| 4 | Lesson introduction with illustration, title and Continue. |
| 5 | Code question with two answer options; Check appears muted before selection. |
| 6 | Selected answer, green feedback border, XP indicator and Continue. |
| 7 | Explanation panel alongside the accepted response; Yes/No comprehension controls. |
| 8 | Editable code region and Check control. |
| 9–10 | Output panel, accepted feedback, Continue; explanatory panel visible on 10. |
| 11–12 | Instructional code walkthrough, highlighted loop line, Continue. |
| 13–14 | New code exercise; output/running state and muted Check during execution. |
| 15 | Accepted code/output, green feedback, positive message and XP. |
| 16 | Yellow not-quite feedback with Get help and Try again. |
| 17–18 | Accepted retry and explanation panel. |
| 19 | Next lesson explanation about decomposition with code. |
| 20 | Skill-check output prediction, selected numeric answer and Correct. |
| 21–22 | Debugging explanation choices, then selected accepted answer. |
| 23 | Incorrect code-output skill-check response and Finish. |
| 24 | Skill-check summary, 2/3, Review with help and Skip review. |
| 25 | Assisted review shows expected behavior and explanation. |
| 26 | Skill-check retry or skip controls. |
| 27 | Lesson completion with XP and skill-check score displayed separately. |
| 28–29 | Streak reactivated, count 1 and Continue. |
| 30 | Streak charge reward and Continue. |
| 31 | Ranked XP view with a next-action control. |
| 32 | Return to course path; next lesson selected with Start. |

## B. UX inferences and original specification
A single focal task, stable action placement, contextual code/output and immediate descriptive feedback likely reduce navigation burden. A visual path suggests progression; it does not reveal the unlocking algorithm. Green/yellow feedback has textual labels. Selected-answer state should enable submission; submitting should disable duplicate actions only until a bounded request resolves. Smooth transitions are desirable but their timing cannot be measured from stills.

SkillSetu: INTRO → QUESTION → ANSWER_SELECTED → SUBMITTING → FEEDBACK → NEXT_QUESTION; completion replaces next with REPORT. QUESTION supports locally persisted drafts. RESUME restores the server-selected task. ERROR retains the draft and offers reload/retry. HINT is response-format guidance during diagnostics; conceptual hints and item retry belong in practice so first-response evidence is not coached. RETRY resends an identical sealed response after connection loss; it never awards a second attempt at the same item. COMPLETED unlocks explanations and observed misconception signals. No XP/streak contributes to diagnostic proficiency.

State behavior: unselected choices cannot submit; ordering always contains every step; text requires nonblank input. SUBMITTING uses visible text and aria-busy. Server saves before FEEDBACK. Continue is an explicit button, and refresh resumes saved progress even when feedback was open. HTTP failure shows an alert and leaves inputs recoverable. Focus moves to the new heading. Native radio groups, buttons, textareas and ordered-step move controls support keyboard operation; mobile stacks actions and cards; reduced-motion disables entrance animation. These are implemented design choices, not claims about Brilliant internals.

## C. Unknown from screenshots
Adaptive policy, skill inference, server evaluation, security model, retry scoring, timing/easing, keyboard support, screen-reader announcements, mobile layouts, streak timezone rules, persistence/auto-save, subscriptions and internal APIs cannot be established. No third-party authenticated session or subscription was accessed.

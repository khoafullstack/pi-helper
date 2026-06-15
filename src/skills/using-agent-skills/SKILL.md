---
name: using-agent-skills
description: Discovers and invokes agent skills. Use when starting a session or when you need to discover which skill applies to the current task. This is the meta-skill that governs how all other skills are discovered and invoked in the pi agent workflow.
---

# Using Agent Skills

## Overview

Agent Skills is a collection of engineering workflow skills organized by development phase. Each skill encodes a specific process that senior engineers follow. This meta-skill helps you discover and apply the right skill for your current task.

In a pi session with the pi-helper extension installed, skill invocation is supported in two ways:

1. **Direct invocation** — the agent applies the skill based on context (e.g., user says "debug this", agent loads `debugging-and-error-recovery`).
2. **Command-based invocation** — the user runs a pi command that triggers an auto-pilot flow: `/spec` → `spec-driven-development`, `/plan` → `planning-and-task-breakdown`, `/build` → `incremental-implementation` + `test-driven-development`.

## Skill Discovery

When a task arrives, identify the development phase and apply the corresponding skill:

```
Task arrives
    │
    ├── Don't know what you want yet? ──────→ interview-me
    ├── Have a rough concept, need variants? → idea-refine (skipped in pi-helper — not copied)
    ├── New project/feature/change? ──→ spec-driven-development  ← /spec command
    │                                       ↓ (after SPEC.md approved)
    ├── Have a spec, need tasks? ──────→ planning-and-task-breakdown  ← /plan command
    │                                       ↓ (after tasks/todo.md created)
    ├── Implementing code? ────────────→ incremental-implementation  ← /build command
    │   ├── Need doc-verified code? ───→ source-driven-development (skipped in pi-helper)
    │   ├── Stakes high / unfamiliar code? ──→ doubt-driven-development (skipped in pi-helper)
    │   └── Need better context? ─────→ context-engineering  ← /init-context command
    ├── Writing/running tests? ────────→ test-driven-development
    │   └── Browser-based? ───────────→ browser-testing-with-devtools (skipped in pi-helper)
    ├── Something broke? ──────────────→ debugging-and-error-recovery
    ├── Reviewing code? ───────────────→ code-review-and-quality
    │   ├── Too complex? ─────────────→ code-simplification
    │   └── Security concerns? ───────→ security-and-hardening (skipped in pi-helper)
    ├── Committing/branching? ─────────→ git-workflow-and-versioning
    │                                       (implemented as the `git-commit` skill in pi-helper)
    └── Adding/removing sub-agents? ───→ pi-sub-agent-creator
                                            (initialize via /init-subagents command)
```

## Skills Bundled with pi-helper

The following skills live in `src/skills/` and are available to the agent in any pi session:

| Skill | Phase | Triggered by |
|---|---|---|
| `interview-me` | Define | Agent detects underspecified ask |
| `spec-driven-development` | Define | `/spec [name]` command |
| `planning-and-task-breakdown` | Plan | `/plan [auto]` command |
| `incremental-implementation` | Build | `/build` command |
| `test-driven-development` | Verify | Inside the `/build` TDD cycle |
| `context-engineering` | Build | `/init-context` command |
| `debugging-and-error-recovery` | Verify | Agent detects test failure, build break, or unexpected error |
| `code-review-and-quality` | Review | Before merge / after feature implementation |
| `code-simplification` | Review | After implementation, before commit |
| `git-commit` | Ship | When committing changes (replaces `git-workflow-and-versioning`) |
| `pi-sub-agent-creator` | Build | When defining a new `.pi/agents/<name>.md` |
| `skill-creator` | Meta | When creating or improving a skill |

## Core Operating Behaviors

These behaviors apply at all times, across all skills. They are non-negotiable.

### 1. Surface Assumptions

Before implementing anything non-trivial, explicitly state your assumptions:

```
ASSUMPTIONS I'M MAKING:
1. [assumption about requirements]
2. [assumption about architecture]
3. [assumption about scope]
→ Correct me now or I'll proceed with these.
```

Don't silently fill in ambiguous requirements. The most common failure mode is making wrong assumptions and running with them unchecked. Surface uncertainty early — it's cheaper than rework.

In a pi session, surface assumptions via the response (text or `notify`) before delegating to a sub-agent. Sub-agents do not inherit the human gate — your assumptions become theirs.

### 2. Manage Confusion Actively

When you encounter inconsistencies, conflicting requirements, or unclear specifications:

1. **STOP.** Do not proceed with a guess.
2. Name the specific confusion.
3. Present the tradeoff or ask the clarifying question.
4. Wait for resolution before continuing.

**Bad:** Silently picking one interpretation and hoping it's right.
**Good:** "I see X in the spec but Y in the existing code. Which takes precedence?"

In autonomous mode (e.g., `/build auto`), confusion is a hard stop — surface it to the human and wait for input rather than guessing.

### 3. Push Back When Warranted

You are not a yes-machine. When an approach has clear problems:

- Point out the issue directly
- Explain the concrete downside (quantify when possible — "this adds ~200ms latency" not "this might be slower")
- Propose an alternative
- Accept the human's decision if they override with full information

Sycophancy is a failure mode. "Of course!" followed by implementing a bad idea helps no one. Honest technical disagreement is more valuable than false agreement.

### 4. Enforce Simplicity

Your natural tendency is to overcomplicate. Actively resist it.

Before finishing any implementation, ask:
- Can this be done in fewer lines?
- Are these abstractions earning their complexity?
- Would a staff engineer look at this and say "why didn't you just..."?

If you build 1000 lines and 100 would suffice, you have failed. Prefer the boring, obvious solution. Cleverness is expensive.

This rule is enforced explicitly by the `code-simplification` skill — invoke it after implementation and before merge.

### 5. Maintain Scope Discipline

Touch only what you're asked to touch.

Do NOT:
- Remove comments you don't understand
- "Clean up" code orthogonal to the task
- Refactor adjacent systems as a side effect
- Delete code that seems unused without explicit approval
- Add features not in the spec because they "seem useful"

Your job is surgical precision, not unsolicited renovation.

This rule is enforced by Rule 0.5 in `incremental-implementation` and by the `code-review-and-quality` skill's readability axis.

### 6. Verify, Don't Assume

Every skill includes a verification step. A task is not complete until verification passes. "Seems right" is never sufficient — there must be evidence (passing tests, build output, runtime data).

Verification commands are the project's real shell invocations — `npm test`, `npm run build`, `npm run check`, `npm run lint` — run via `bash`. They are not agent tool names.

## Failure Modes to Avoid

These are the subtle errors that look like productivity but create problems:

1. Making wrong assumptions without checking
2. Not managing your own confusion — plowing ahead when lost
3. Not surfacing inconsistencies you notice
4. Not presenting tradeoffs on non-obvious decisions
5. Being sycophantic ("Of course!") to approaches with clear problems
6. Overcomplicating code and APIs
7. Modifying code or comments orthogonal to the task
8. Removing things you don't fully understand
9. Building without a spec because "it's obvious"
10. Skipping verification because "it looks right"

## Skill Rules

1. **Check for an applicable skill before starting work.** Skills encode processes that prevent common mistakes.

2. **Skills are workflows, not suggestions.** Follow the steps in order. Don't skip verification steps.

3. **Multiple skills can apply.** A feature implementation might involve `spec-driven-development` → `planning-and-task-breakdown` → `incremental-implementation` → `test-driven-development` → `code-review-and-quality` → `code-simplification` in sequence. Each handoff is explicit.

4. **When in doubt, start with a spec.** If the task is non-trivial and there's no spec, begin with `spec-driven-development` (or run `/spec` to auto-generate a template).

5. **Delegate to sub-agents when the work is parallelizable, isolated, or well-scoped.** The three bundled sub-agents in `.pi/agents/` are:
   - `General-Purpose-Low` — fast, mechanical tasks
   - `General-Purpose-Medium` — standard feature slices
   - `General-Purpose-High` — architecture, refactors, deep debugging
   Sub-agents do not inherit the main conversation's context. The prompt you give them must be self-contained.

6. **Load context from `AGENTS.md` before non-trivial work.** Run `/init-context` once at the start of a project to generate it, and update it whenever commands, dependencies, or boundaries change.

## Lifecycle Sequence

For a complete feature in a pi session, the typical skill sequence is:

```
1.  /init-context (or read AGENTS.md)         → Load project rules once at start
2.  interview-me                              → Extract what the user actually wants (if ask underspecified)
3.  spec-driven-development  ← /spec          → Define what we're building (writes SPEC.md)
4.  planning-and-task-breakdown ← /plan       → Break into verifiable chunks (writes tasks/plan.md, tasks/todo.md)
5.  context-engineering                       → Load the right context (read AGENTS.md, SPEC.md sections as needed)
6.  incremental-implementation  ← /build      → Build slice by slice (one task per increment)
7.  test-driven-development                   → Prove each slice works (RED-GREEN-REFACTOR per task)
8.  debugging-and-error-recovery              → Step in when tests fail, build breaks, behavior diverges
9.  code-review-and-quality                   → Multi-axis review before merge
10. code-simplification                       → Reduce unnecessary complexity while preserving behavior
11. git-commit                                → Atomic commit, conventional message
12. pi-sub-agent-creator                      → Add new sub-agents to .pi/agents/ if the workflow needs them
```

Not every task needs every skill. A bug fix might only need: `debugging-and-error-recovery` → `test-driven-development` → `code-review-and-quality` → `git-commit`.

A typo fix might only need: `git-commit`.

## Quick Reference

| Phase | Skill | One-Line Summary | Trigger |
|-------|-------|------------------|---------|
| Setup | `context-engineering` | Right context at the right time; produces AGENTS.md | `/init-context` |
| Setup | `pi-sub-agent-creator` | Define custom sub-agents in `.pi/agents/` | Manual file write or `/init-subagents` |
| Define | `interview-me` | Surface what the user actually wants before any plan, spec, or code exists | Agent detects underspecified ask |
| Define | `spec-driven-development` | Requirements and acceptance criteria before code | `/spec [name]` |
| Plan | `planning-and-task-breakdown` | Decompose into small, verifiable tasks | `/plan [auto]` |
| Build | `incremental-implementation` | Thin vertical slices, test each before expanding | `/build` |
| Build | `test-driven-development` | Failing test first, then make it pass | Inside the TDD cycle |
| Verify | `debugging-and-error-recovery` | Reproduce → localize → fix → guard | Agent detects failure |
| Review | `code-review-and-quality` | Five-axis review with quality gates | Before merge |
| Review | `code-simplification` | Preserve behavior while reducing unnecessary complexity | After implementation, before commit |
| Ship | `git-commit` | Atomic commits, conventional messages | When committing |
| Meta | `skill-creator` | Create or improve a skill | When the skill library needs a new entry |
| Meta | `using-agent-skills` | This skill — discover and invoke the others | Every task |

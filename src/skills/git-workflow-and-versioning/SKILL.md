---
name: git-workflow-and-versioning
description: Structures git workflow practices. Use when making any code change. Use when committing, branching, resolving conflicts, or when you need to organize work across multiple parallel streams. Replaces the older "git-commit" skill — covers the full git lifecycle, not just the commit message.
---

# Git Workflow and Versioning

## Overview

Git is your safety net. Treat commits as save points, branches as sandboxes, and history as documentation. With AI agents generating code at high speed, disciplined version control is the mechanism that keeps changes manageable, reviewable, and reversible.

In a pi session, the commit is the only durable boundary between an agent's working state and the repository state. Every skill in the workflow (`/build`, `code-simplification`, `code-review-and-quality`) ends with "commit this" — this skill is the rulebook for those commits.

## When to Use

Always. Every code change flows through git.

## Core Principles

### Trunk-Based Development (Recommended)

Keep `main` always deployable. Work in short-lived feature branches that merge back within 1-3 days. Long-lived development branches are hidden costs — they diverge, create merge conflicts, and delay integration. DORA research consistently shows trunk-based development correlates with high-performing engineering teams.

```
main ──●──●──●──●──●──●──●──●──●──  (always deployable)
        ╲      ╱  ╲    ╱
         ●──●─╱    ●──╱    ← short-lived feature branches (1-3 days)
```

For pi-helper, `main` is the default branch (set at `git init -b main`). The first commit (`e3f6454 chore: initial project setup`) and subsequent feature commits all land here directly because the package is small enough to skip feature branches. Adopt feature branches if the project grows multi-contributor.

- **Dev branches are costs.** Every day a branch lives, it accumulates merge risk.
- **Release branches are acceptable.** When you need to stabilize a release while main moves forward.
- **Feature flags > long branches.** Prefer deploying incomplete work behind flags rather than keeping it on a branch for weeks.

### 1. Commit Early, Commit Often

Each successful increment gets its own commit. Don't accumulate large uncommitted changes.

```
Work pattern:
  Implement slice → Test → Verify → Commit → Next slice

Not this:
  Implement everything → Hope it works → Giant commit
```

In a pi session, the work pattern is exactly the `/build` TDD cycle (RED → GREEN → REFACTOR → verify → commit → next slice). One slice, one commit.

Commits are save points. If the next change breaks something, you can revert to the last known-good state instantly.

### 2. Atomic Commits

Each commit does one logical thing:

```
# Good: Each commit is self-contained
git log --oneline
a1b2c3d feat: add task creation endpoint with validation
d4e5f6g feat: add task creation form component
h7i8j9k feat: connect form to API and add loading state
m1n2o3p test: add task creation tests (unit + integration)

# Bad: Everything mixed together
git log --oneline
x1y2z3a feat: add task feature, fix sidebar, update deps, refactor utils
```

This rule aligns with `incremental-implementation`'s Rule 1 (One Thing at a Time) and `code-review-and-quality`'s change sizing (~100 lines = easy to review and revert).

### 3. Descriptive Messages

Commit messages explain the *why*, not just the *what*:

```
# Good: Explains intent
feat: add email validation to registration endpoint

Prevents invalid email formats from reaching the database.
Uses Zod schema validation at the route handler level,
consistent with existing validation patterns in auth.ts.

# Bad: Describes what's obvious from the diff
update auth.ts
```

**Format:**
```
<type>: <short description>

<optional body explaining why, not what>
```

**Types:**
- `feat` — New feature
- `fix` — Bug fix
- `refactor` — Code change that neither fixes a bug nor adds a feature
- `test` — Adding or updating tests
- `docs` — Documentation only
- `chore` — Tooling, dependencies, config

For projects that need richer scope notation (e.g., `feat(api): ...`), the Conventional Commits extension supports `[optional scope]`:

```
feat(api): add rate limiting middleware
fix(auth): handle expired token edge case
```

For pi-helper specifically, the typical scopes are:
- `src/...` files → no scope or `(extension)`
- `src/skills/<name>` → `(skills)`
- `package.json` / `tsconfig.json` → `(build)`
- `.agents/...` or docs → `(docs)`

### 4. Keep Concerns Separate

Don't combine formatting changes with behavior changes. Don't combine refactors with features. Each type of change should be a separate commit — and ideally a separate PR:

```
# Good: Separate concerns
git commit -m "refactor: extract validation logic to shared utility"
git commit -m "feat: add phone number validation to registration"

# Bad: Mixed concerns
git commit -m "refactor validation and add phone number field"
```

**Separate refactoring from feature work.** A refactoring change and a feature change are two different changes — submit them separately. This makes each change easier to review, revert, and understand in history. Small cleanups (renaming a variable) can be included in a feature commit at reviewer discretion.

This rule is also enforced by `code-simplification` (Rule 0.5: Scope Discipline) and `incremental-implementation` (Rule 0.5: Scope Discipline).

### 5. Size Your Changes

Target ~100 lines per commit/PR. Changes over ~1000 lines should be split. See the splitting strategies in `code-review-and-quality` for how to break down large changes.

```
~100 lines  → Easy to review, easy to revert
~300 lines  → Acceptable for a single logical change
~1000 lines → Split into smaller changes
```

## Branching Strategy

### Feature Branches

```
main (always deployable)
  │
  ├── feature/task-creation    ← One feature per branch
  ├── feature/user-settings    ← Parallel work
  └── fix/duplicate-tasks      ← Bug fixes
```

- Branch from `main` (or the team's default branch)
- Keep branches short-lived (merge within 1-3 days) — long-lived branches are hidden costs
- Delete branches after merge
- Prefer feature flags over long-lived branches for incomplete features

### Branch Naming

```
feature/<short-description>   → feature/task-creation
fix/<short-description>       → fix/duplicate-tasks
chore/<short-description>     → chore/update-deps
refactor/<short-description>  → refactor/auth-module
```

## Working with Worktrees

For parallel AI agent work, use git worktrees to run multiple branches simultaneously:

```bash
# Create a worktree for a feature branch
git worktree add ../project-feature-a feature/task-creation
git worktree add ../project-feature-b feature/user-settings

# Each worktree is a separate directory with its own branch
# Agents can work in parallel without interfering
ls ../
  project/              ← main branch
  project-feature-a/    ← task-creation branch
  project-feature-b/    ← user-settings branch

# When done, merge and clean up
git worktree remove ../project-feature-a
```

In a pi session, the `Agent` tool with `isolation: "worktree"` (defined in the bundled `General-Purpose-...` sub-agents) implements this pattern automatically — each sub-agent gets an isolated worktree, and the resulting `pi-agent-*` branch is returned on completion.

Benefits:
- Multiple agents can work on different features simultaneously
- No branch switching needed (each directory has its own branch)
- If one experiment fails, delete the worktree — nothing is lost
- Changes are isolated until explicitly merged

## The Save Point Pattern

```
Agent starts work
    │
    ├── Makes a change
    │   ├── Test passes? → Commit → Continue
    │   └── Test fails? → Revert to last commit → Investigate
    │
    ├── Makes another change
    │   ├── Test passes? → Commit → Continue
    │   └── Test fails? → Revert to last commit → Investigate
    │
    └── Feature complete → All commits form a clean history
```

This pattern means you never lose more than one increment of work. If an agent goes off the rails, `git reset --hard HEAD` takes you back to the last successful state.

In a pi session, this maps to the `/build` TDD cycle ending with `git commit` after every GREEN. If a sub-agent produces broken code, `git bisect` or `git reset --hard HEAD` recovers the last known-good state.

## Change Summaries

After any modification, provide a structured summary. This makes review easier, documents scope discipline, and surfaces unintended changes:

```
CHANGES MADE:
- src/routes/tasks.ts: Added validation middleware to POST endpoint
- src/lib/validation.ts: Added TaskCreateSchema using Zod

THINGS I DIDN'T TOUCH (intentionally):
- src/routes/auth.ts: Has similar validation gap but out of scope
- src/middleware/error.ts: Error format could be improved (separate task)

POTENTIAL CONCERNS:
- The Zod schema is strict — rejects extra fields. Confirm this is desired.
- Added zod as a dependency (72KB gzipped) — already in package.json
```

This pattern catches wrong assumptions early and gives reviewers a clear map of the change. The "DIDN'T TOUCH" section is especially important — it shows you exercised scope discipline and didn't go on an unsolicited renovation.

The same template can be used at the sub-agent level: when a `General-Purpose-Medium` sub-agent returns from implementing a task, it should report the same three sections. The main session can then write the commit message from this report.

## Pre-Commit Hygiene

Before every commit:

```bash
# 1. Check what you're about to commit
git diff --staged

# 2. Ensure no secrets
git diff --staged | grep -i "password\|secret\|api_key\|token"

# 3. Run tests
npm test

# 4. Run linting (if configured)
npm run lint

# 5. Run type checking
npm run check
```

For projects without a test runner, substitute step 3 with the build:

```bash
npm run build    # build (catches compilation errors)
npm run check    # type check (catches type errors)
```

Automate this with git hooks:

```json
// package.json (using lint-staged + husky)
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

For pi-helper, no pre-commit hooks are configured yet. If you add them, update `AGENTS.md` to reflect the new boundary: "Pre-commit hooks are configured — fix issues instead of skipping" (the `context-engineering` skill's heuristic already adds this when `.husky/` is present).

## Commit Message Generation in a Pi Session

When committing in a pi session, the agent should:

1. **Run `git diff --staged`** to see exactly what's changing
2. **Detect the type** from the diff:
   - New files in `src/` → `feat`
   - Modified logic in `src/` → `feat` or `fix` based on whether it changes behavior
   - Renamed / moved files only → `refactor`
   - New tests → `test`
   - Only `*.md` or `docs/` → `docs`
   - `package.json`, `tsconfig.json`, deps, build config → `chore` (or `build` for build system changes)
3. **Detect the scope** (optional):
   - From file path prefix: `src/skills/<name>` → `skills`, `src/commands/...` → `commands`, `package.json` → `build`
   - Or omit scope if it spans multiple unrelated areas
4. **Write a description** that explains intent (the *why*), not the diff (the *what*)
5. **Add a body** if the change is non-obvious or has rationale that isn't in the diff

This replaces the older `git-commit` skill, which was a single-purpose Conventional Commits generator. This skill covers the full git lifecycle; the message generation is one of its many sub-concerns.

## Handling Generated Files

- **Commit generated files** only if the project expects them (e.g., `package-lock.json`, Prisma migrations)
- **Don't commit** build output (`dist/`, `.next/`), environment files (`.env`), or IDE config (`.vscode/settings.json` unless shared)
- **Have a `.gitignore`** that covers: `node_modules/`, `dist/`, `.env`, `.env.local`, `*.pem`

For pi-helper, `.gitignore` already covers:
- `node_modules`
- `dist`
- `.env`
- `*.local`
- `.codegraph/`
- `.pi/`

## Using Git for Debugging

```bash
# Find which commit introduced a bug
git bisect start
git bisect bad HEAD
git bisect good <known-good-commit>
# Git checkouts midpoints; run your test at each to narrow down

# View what changed recently
git log --oneline -20
git diff HEAD~5..HEAD -- src/

# Find who last changed a specific line
git blame src/services/task.ts

# Search commit messages for a keyword
git log --grep="validation" --oneline
```

When a `debugging-and-error-recovery` session needs to identify a regression, `git bisect` is the canonical tool. In a pi session, the sub-agent doing the bisect should be `General-Purpose-Medium` (standard investigative work) or `General-Purpose-High` (if the regression is non-obvious).

## Sub-Agent Patterns for Git Operations

Most git operations (commit, branch, status) should be done by the **main session** to keep the human in the loop. Sub-agents are useful for:

| Operation | Sub-agent | Why |
|---|---|---|
| `git bisect` run | `General-Purpose-Medium` or `-High` | Long-running, isolated from main session |
| Worktree-based parallel feature work | `General-Purpose-Low` (per worktree) | Each worktree is a separate context |
| Conflict resolution | `General-Purpose-High` | Judgment-heavy, may need rebase strategy choice |
| Reflog / blame archaeology | `General-Purpose-Medium` | Read-only investigation, well-scoped |

The `Agent` tool's `isolation: "worktree"` parameter automates the worktree setup. The main session receives the resulting branch name in the sub-agent's response, then reviews and merges manually.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll commit when the feature is done" | One giant commit is impossible to review, debug, or revert. Commit each slice. |
| "The message doesn't matter" | Messages are documentation. Future you (and future agents) will need to understand what changed and why. |
| "I'll squash it all later" | Squashing destroys the development narrative. Prefer clean incremental commits from the start. |
| "Branches add overhead" | Short-lived branches are free and prevent conflicting work from colliding. Long-lived branches are the problem — merge within 1-3 days. |
| "I'll split this change later" | Large changes are harder to review, riskier to deploy, and harder to revert. Split before submitting, not after. |
| "I don't need a .gitignore" | Until `.env` with production secrets gets committed. Set it up immediately. |

## Red Flags

- Large uncommitted changes accumulating
- Commit messages like "fix", "update", "misc"
- Formatting changes mixed with behavior changes
- No `.gitignore` in the project
- Committing `node_modules/`, `.env`, or build artifacts
- Long-lived branches that diverge significantly from main
- Force-pushing to shared branches
- In a pi session: amending commits to "fix" a sub-agent's bad message (create a new commit instead, or `git reset --soft HEAD~1` and recommit cleanly)

## Verification

For every commit:

- [ ] Commit does one logical thing
- [ ] Message explains the why, follows type conventions
- [ ] Tests pass before committing (`npm test` or `npm run check && npm run build`)
- [ ] No secrets in the diff
- [ ] No formatting-only changes mixed with behavior changes
- [ ] `.gitignore` covers standard exclusions
- [ ] The relevant task in `tasks/todo.md` is marked done
- [ ] If the change introduces a new command, dependency, or convention, `AGENTS.md` is updated

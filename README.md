# pi-helper

A [Pi Coding Agent](https://pi.dev) extension that bundles a **spec-driven development workflow** and a **curated skills library** for the pi agent context.

The package ships two things:

1. **Five commands** that drive the spec → plan → build workflow:
   `/init-subagents`, `/init-context`, `/spec`, `/plan`, `/build`.
2. **Thirteen skills** in `src/skills/` that the agent can apply on demand:
   from `interview-me` (clarify intent) to `git-workflow-and-versioning`
   (atomic commits, branching, worktrees).

## Install

```bash
pi install npm:pi-helper
```

Or for local development, point your pi config at the repo:

```json
// ~/.pi/agent/settings.json
{
  "extensions": ["/absolute/path/to/pi-helper/src/index.ts"],
  "skills": ["/absolute/path/to/pi-helper/src/skills"]
}
```

## Requirements

- Node.js >= 20
- Pi Coding Agent >= 0.79
- A project that uses npm/pnpm/yarn (or any shell-based build tooling)

## Build

```bash
npm install
npm run check    # type check
npm run build    # emit dist/
```

## Commands

| Command | Args | Purpose |
|---|---|---|
| `/init-subagents` | — | Create three general-purpose sub-agents (`Low` / `Medium` / `High`) in `.pi/agents/` for task-scoped delegation. |
| `/init-context` | — | Analyze the current project and write an `AGENTS.md` rules file (tech stack, commands, conventions, boundaries). |
| `/spec` | `[feature-name]` | Generate a `SPEC.md` template covering the six core areas (objective, tech stack, commands, structure, code style, testing, boundaries). |
| `/plan` | `[auto]` | Read `SPEC.md` and produce `tasks/plan.md` (architecture + dependency graph) and `tasks/todo.md` (executable checklist). |
| `/build` | `[auto]` | Pick the next pending task from `tasks/todo.md` and suggest a sub-agent + prompt template for implementing it. `auto` runs continuously. |

All commands abort with a warning if the output file already exists, except `/init-context` which overwrites with a visible notice.

## Skills Library

The skills in `src/skills/` are auto-loaded by pi (configured via `package.json` → `pi.skills`). The agent selects the right skill based on context, or you can invoke the meta-skill `using-agent-skills` to discover them.

| Skill | Phase | One-line summary |
|---|---|---|
| `using-agent-skills` | Meta | Discover and invoke the right skill for the current task. |
| `context-engineering` | Setup | Right context at the right time; produces `AGENTS.md`. |
| `pi-sub-agent-creator` | Setup | Define custom sub-agents in `.pi/agents/`. |
| `interview-me` | Define | Surface what the user actually wants before any plan, spec, or code exists. |
| `spec-driven-development` | Define | Requirements and acceptance criteria before code. |
| `planning-and-task-breakdown` | Plan | Decompose into small, verifiable tasks. |
| `incremental-implementation` | Build | Thin vertical slices, test each before expanding. |
| `test-driven-development` | Build | Failing test first, then make it pass. |
| `debugging-and-error-recovery` | Verify | Reproduce → localize → fix → guard. |
| `code-review-and-quality` | Review | Five-axis review with quality gates. |
| `code-simplification` | Review | Preserve behavior while reducing unnecessary complexity. |
| `git-workflow-and-versioning` | Ship | Atomic commits, conventional messages, branching, worktrees. |
| `skill-creator` | Meta | Create or improve a skill in this library. |

The full `using-agent-skills` reference covers which skills to invoke for which task profile, including which sub-agent to delegate to per task type.

## The Workflow

The commands and skills compose into a single end-to-end workflow. The diagram below shows how a typical feature flows from idea to commit, with the commands on the left rail and the skills that run underneath in the main flow.

```
                       ┌─────────────────────────────────────┐
                       │  Giai đoạn 0 — Setup (once)         │
                       │  /init-subagents  → .pi/agents/*     │
                       │  /init-context    → AGENTS.md        │
                       └──────────────┬──────────────────────┘
                                      │
   ┌────────────────────┐             │
   │ Ask underspecified │   yes       ▼
   ├────────────────────┤  ──────→  ┌─────────────────────┐
   │ Begin with a spec  │           │  interview-me       │ ─┐
   │ Ask non-trivial    │           │  (one question      │  │ repeat
   │ Ask risky/unfamil. │           │   at a time)        │  │ until
   └─────────┬──────────┘           └──────────┬──────────┘  │ 95%
             │ no                              │            │ conf.
             │            ┌────────────────────▼──────────┐ │
             │            │  /spec [name]                 │ │
             ▼            │  spec-driven-development      │ │
   ┌────────────────────┐  │  → SPEC.md (6 core areas)    │◀┘
   │ Spec exists?       │  └──────────────────────────────┘
   ├────────────────────┤             │
   │ Yes → /plan        │             ▼
   │ No  → /spec        │  ┌──────────────────────────────┐
   └─────────┬──────────┘  │  /plan [auto]                │
             │             │  planning-and-task-breakdown │
             ▼             │  → tasks/plan.md             │
             ▼             │  → tasks/todo.md             │
   ┌────────────────────┐  └──────────────────────────────┘
   │ Plan exists?       │             │
   ├────────────────────┤             ▼
   │ Yes → /build       │  ┌──────────────────────────────┐
   │ No  → /plan        │  │  /build [auto]               │
   └─────────┬──────────┘  │  incremental-implementation  │
             │             │  + test-driven-development   │
             ▼             │                              │
   ┌────────────────────┐  │  per task:                   │
   │ Tasks pending?     │  │   1. Sub-agent delegate       │
   ├────────────────────┤  │   2. TDD cycle               │
   │ Yes → /build       │  │   3. Verify (npm test/       │
   │ No  → all done     │  │      check/build)            │
   └─────────┬──────────┘  │   4. commit (per slice)      │
             │             └──────────────────────────────┘
             ▼
       ┌─────────────────────────────────────────────┐
       │  Cross-cutting skills (apply at any time)   │
       │                                              │
       │  debugging-and-error-recovery                │
       │    → step in when tests fail, build breaks,  │
       │      behavior diverges                       │
       │                                              │
       │  code-review-and-quality                     │
       │    → 5-axis review before merge              │
       │                                              │
       │  code-simplification                         │
       │    → reduce complexity while preserving      │
       │      behavior (Rule 0 enforcer)              │
       │                                              │
       │  git-workflow-and-versioning                 │
       │    → atomic commits, conventional messages,  │
       │      branching, worktrees                    │
       └─────────────────────────────────────────────┘
```

### Lifecycle Sequence (numbered)

1. `/init-context` (or read `AGENTS.md`) — load project rules once at start
2. `interview-me` — extract what the user actually wants (if ask is underspecified)
3. `/spec` → `spec-driven-development` — define what we're building (writes `SPEC.md`)
4. `/plan` → `planning-and-task-breakdown` — break into verifiable chunks (writes `tasks/plan.md`, `tasks/todo.md`)
5. `context-engineering` — load the right context (read `AGENTS.md`, `SPEC.md` sections as needed)
6. `/build` → `incremental-implementation` — build slice by slice (one task per increment)
7. `test-driven-development` — prove each slice works (RED-GREEN-REFACTOR per task)
8. `debugging-and-error-recovery` — step in when tests fail, build breaks, behavior diverges
9. `code-review-and-quality` — multi-axis review before merge
10. `code-simplification` — reduce unnecessary complexity while preserving behavior
11. `git-workflow-and-versioning` — atomic commit, conventional message
12. `pi-sub-agent-creator` — (optional) add new sub-agents to `.pi/agents/`
13. `skill-creator` — (optional) create or improve a skill in the library

Not every task needs every skill. A bug fix might only need: `debugging-and-error-recovery` → `test-driven-development` → `code-review-and-quality` → `git-workflow-and-versioning`. A typo fix might only need: `git-workflow-and-versioning`.

## Sub-Agent Delegation

The `/init-subagents` command creates three sub-agents in `.pi/agents/` with full tool access and different reasoning levels. The agent in `pi-helper` and the `using-agent-skills` skill recommend the right sub-agent per task profile:

| Profile | Sub-agent | Use for |
|---|---|---|
| Mechanical, well-known pattern, single file | `General-Purpose-Low` | Rename, format, dependency bumps, simple fixes |
| Standard feature slice with moderate complexity | `General-Purpose-Medium` | Default for most `/build` tasks |
| Architectural, refactor with subtle invariants, deep debugging | `General-Purpose-High` | Design decisions, migrations, security |

All three sub-agents carry the same hard rule: **strictly follow the main agent's instructions; do not deviate from the assigned task.**

For background work, sub-agents can be invoked with `run_in_background: true` and the orchestrator polls with `get_subagent_result`. For isolated worktree execution, pass `isolation: "worktree"` and the sub-agent's changes are returned as a new `pi-agent-*` branch on completion.

## Project Layout

```
.
├── src/
│   ├── index.ts                       # Extension entry: 5 commands
│   └── skills/                        # 13 skills, auto-loaded by pi
│       ├── code-review-and-quality/
│       ├── code-simplification/
│       ├── context-engineering/
│       ├── debugging-and-error-recovery/
│       ├── git-workflow-and-versioning/
│       ├── incremental-implementation/
│       ├── interview-me/
│       ├── pi-sub-agent-creator/
│       ├── planning-and-task-breakdown/
│       ├── skill-creator/
│       ├── spec-driven-development/
│       ├── test-driven-development/
│       └── using-agent-skills/
├── package.json
├── tsconfig.json
└── README.md
```

## Adapting the Skills

The skills in this library are adapted from
[addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) for
the pi agent context. Adaptations:

- References to `CLAUDE.md` / `.cursorrules` are normalized to `AGENTS.md` (the
  rules file produced by `context-engineering`).
- Claude-style slash commands (`/spec`, `/build`, `/plan`) are mapped to pi
  command patterns; each command points at the corresponding skill.
- Sub-agent references use the bundled three-tier `General-Purpose-Low` /
  `Medium` / `High` pattern instead of Claude-specific sub-agents.
- npm scripts (`npm test`, `npm run build`, `npm run check`) are kept
  verbatim — they are real shell commands the agent runs via `bash`, not
  agent tool names.
- `WebFetch` references are preserved unchanged (when applicable).
- Each skill includes a "Pi-Specific Adaptations" section, sub-agent
  delegation patterns, and "Projects without a test framework" handling.

## Contributing

When adding or modifying a skill:

1. Place the new file under `src/skills/<skill-name>/SKILL.md`.
2. Run `using-agent-skills` and `skill-creator` mentally to confirm the new
   entry is discoverable in the tree diagram, bundled skills table, lifecycle
   sequence, and quick reference.
3. Update `src/skills/using-agent-skills/SKILL.md` to include the new skill in
   all four locations.
4. `npm run check` and `npm run build` must pass.
5. Commit with a conventional message (see `git-workflow-and-versioning`).

## License

MIT

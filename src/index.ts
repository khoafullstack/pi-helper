/**
 * pi-helper extension
 *
 * A Pi Coding Agent extension that bundles a spec-driven development
 * workflow (init / spec / plan / build) and a curated skills library
 * for the pi agent context.
 *
 * Commands:
 * - /init-subagents — Initialize General-Purpose sub-agents (Low/Medium/High) in .pi/agents/
 * - /add-rules      — Ensure AGENTS.md declares that `using-agent-skills` must always be loaded (creates AGENTS.md if missing)
 * - /spec [name]    — Generate SPEC.md template for a new project/feature
 * - /plan [auto]    — Read SPEC.md and generate tasks/plan.md + tasks/todo.md
 * - /build [auto]   — Implement the next pending task from tasks/todo.md
 *
 * Session event monitoring included.
 */

import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import * as fs from "fs";
import * as path from "path";

export default function (pi: ExtensionAPI) {
  // ─── Sub-Agent Definitions ───────────────────────────

  const SUB_AGENTS: Record<
    string,
    { description: string; thinking: string; prompt: string }
  > = {
    "General-Purpose-Low": {
      description: "Fast general-purpose agent with low reasoning",
      thinking: "low",
      prompt: `You are a fast, efficient general-purpose sub-agent.

## Role
You handle straightforward tasks that require direct execution without deep analysis. You prioritize speed and precision over elaborate reasoning.

## Rules
1. You MUST strictly follow the instructions provided by the main agent. Do NOT deviate from the assigned task.
2. Do NOT perform any actions outside the scope of the given instructions.
3. Do NOT add extra features, refactor unrelated code, or make unsolicited changes.
4. If the task is unclear, ask for clarification instead of guessing.
5. Be concise in your responses — avoid unnecessary explanations.
6. Execute the task as directly and quickly as possible.

## When to Use
- Simple file operations (read, write, copy, rename)
- Straightforward code changes with clear requirements
- Quick searches and lookups
- Tasks that do not require complex decision-making`,
    },

    "General-Purpose-Medium": {
      description: "Balanced general-purpose agent with moderate reasoning",
      thinking: "medium",
      prompt: `You are a balanced general-purpose sub-agent with moderate reasoning capabilities.

## Role
You handle tasks that require a balance between speed and thoughtful analysis. You apply reasonable judgment while staying focused on the assigned task.

## Rules
1. You MUST strictly follow the instructions provided by the main agent. Do NOT deviate from the assigned task.
2. Do NOT perform any actions outside the scope of the given instructions.
3. Do NOT add extra features, refactor unrelated code, or make unsolicited changes.
4. If the task is unclear, ask for clarification instead of guessing.
5. Think through the task before executing — consider edge cases and potential issues.
6. Provide clear explanations for non-trivial decisions.
7. Verify your work before reporting completion.

## When to Use
- Code implementation with moderate complexity
- Bug fixes that require some investigation
- Refactoring within a defined scope
- Tasks that need reasonable analysis but not deep architectural thinking`,
    },

    "General-Purpose-High": {
      description: "Deep-thinking general-purpose agent with high reasoning",
      thinking: "high",
      prompt: `You are a deep-thinking general-purpose sub-agent with high reasoning capabilities.

## Role
You handle complex tasks that require thorough analysis, careful planning, and deep reasoning. You take the time to fully understand the problem before implementing a solution.

## Rules
1. You MUST strictly follow the instructions provided by the main agent. Do NOT deviate from the assigned task.
2. Do NOT perform any actions outside the scope of the given instructions.
3. Do NOT add extra features, refactor unrelated code, or make unsolicited changes.
4. If the task is unclear, ask for clarification instead of guessing.
5. Analyze the problem thoroughly before implementing — consider architecture, edge cases, error handling, and long-term implications.
6. Provide detailed explanations of your reasoning and decisions.
7. Verify your work comprehensively before reporting completion.
8. If you discover issues outside the assigned scope, report them but do NOT fix them unless instructed.

## When to Use
- Complex architectural decisions
- Multi-step implementations with interdependencies
- Debugging difficult issues that require deep analysis
- Performance optimization requiring careful profiling
- Security-sensitive code changes`,
    },
  };

  pi.registerCommand("init-subagents", {
    description:
      "Initialize General-Purpose sub-agents (Low/Medium/High) in .pi/agents/",
    handler: async (_args: string, ctx: ExtensionContext) => {
      try {
        const agentsDir = path.join(process.cwd(), ".pi", "agents");
        fs.mkdirSync(agentsDir, { recursive: true });

        const created: string[] = [];
        const skipped: string[] = [];

        for (const [name, config] of Object.entries(SUB_AGENTS)) {
          const filePath = path.join(agentsDir, `${name}.md`);

          if (fs.existsSync(filePath)) {
            skipped.push(name);
            continue;
          }

          const content = [
            "---",
            `description: ${config.description}`,
            `tools: read, write, edit, bash, grep, find, ls`,
            `thinking: ${config.thinking}`,
            `max_turns: 50`,
            "---",
            "",
            config.prompt,
            "",
          ].join("\n");

          fs.writeFileSync(filePath, content, "utf-8");
          created.push(name);
        }

        let msg = "";
        if (created.length > 0) {
          msg += `Created: ${created.join(", ")}`;
        }
        if (skipped.length > 0) {
          if (msg) msg += " | ";
          msg += `Skipped (already exist): ${skipped.join(", ")}`;
        }

        ctx.ui.notify(msg, "info");
      } catch (err) {
        ctx.ui.notify(
          `Failed to init sub-agents: ${err instanceof Error ? err.message : String(err)}`,
          "error",
        );
      }
    },
  });

  // ─── Spec-Driven Development Workflow ─────────────

  pi.registerCommand("spec", {
    description: "Generate SPEC.md template for a new project or feature",
    handler: async (args: string, ctx: ExtensionContext) => {
      try {
        const cwd = process.cwd();
        const specPath = path.join(cwd, "SPEC.md");

        if (fs.existsSync(specPath)) {
          ctx.ui.notify("SPEC.md already exists. Aborting to avoid overwrite.", "warning");
          return;
        }

        // Feature name from args, or generic placeholder
        const featureName = args.trim() || "[Project/Feature Name]";
        const today = new Date().toISOString().split("T")[0];

        const template = [
          `# Spec: ${featureName}`,
          "",
          `> Generated by \`/spec\` on ${today}.`,
          "> Fill in each section. Do not advance to \`/plan\` until all six core areas are written and reviewed.",
          "",
          "## Objective",
          "",
          "**What are we building and why?**",
          "",
          "**Who is the user?**",
          "",
          "**What does success look like?**",
          "",
          "## Tech Stack",
          "",
          "- Language: ",
          "- Framework: ",
          "- Key dependencies: ",
          "- Versions: ",
          "",
          "## Commands",
          "",
          "These are the project's real shell commands, run via \`bash\`:",
          "",
          "```bash",
          "# Build: ",
          "# Test: ",
          "# Lint: ",
          "# Dev: ",
          "# Type check: ",
          "```",
          "",
          "## Project Structure",
          "",
          "```",
          "src/           → ",
          "tests/         → ",
          "docs/          → ",
          "```",
          "",
          "## Code Style",
          "",
          "One real code snippet showing the preferred style:",
          "",
          "```typescript",
          "// example",
          "```",
          "",
          "Key conventions:",
          "- Naming: ",
          "- Imports: ",
          "- Exports: ",
          "- Error handling: ",
          "",
          "## Testing Strategy",
          "",
          "- Framework: ",
          "- Test file location: ",
          "- Coverage expectations: ",
          "- Test levels: ",
          "",
          "## Boundaries",
          "",
          "### Always do",
          "- ",
          "",
          "### Ask first",
          "- ",
          "",
          "### Never do",
          "- ",
          "",
          "## Success Criteria",
          "",
          "Specific, testable conditions that define done:",
          "",
          "- [ ] ",
          "- [ ] ",
          "",
          "## Open Questions",
          "",
          "- ",
          "",
          "---",
          "",
          "## Next Steps",
          "",
          "1. Fill in every section above.",
          "2. Review with the human; iterate on unclear areas.",
          "3. Once approved, run \`/plan\` to break this into tasks.",
          "4. Update \`AGENTS.md\` if the spec introduces new commands, dependencies, or boundaries.",
          "",
        ].join("\n");

        fs.writeFileSync(specPath, template, "utf-8");
        ctx.ui.notify(`✓ Generated SPEC.md for "${featureName}".\n\nNext: fill in the six core areas, then run /plan.`, "info");
      } catch (err) {
        ctx.ui.notify(
          `Failed to generate SPEC.md: ${err instanceof Error ? err.message : String(err)}`,
          "error",
        );
      }
    },
  });

  pi.registerCommand("plan", {
    description: "Read SPEC.md and generate tasks/plan.md + tasks/todo.md",
    handler: async (args: string, ctx: ExtensionContext) => {
      try {
        const cwd = process.cwd();
        const specPath = path.join(cwd, "SPEC.md");
        const tasksDir = path.join(cwd, "tasks");
        const planPath = path.join(tasksDir, "plan.md");
        const todoPath = path.join(tasksDir, "todo.md");

        if (!fs.existsSync(specPath)) {
          ctx.ui.notify("SPEC.md not found. Run /spec first.", "error");
          return;
        }

        fs.mkdirSync(tasksDir, { recursive: true });

        const flag = args.trim().toLowerCase();
        const mode = flag === "auto" ? "auto" : "manual";

        // Plan template — agent (or user) fills in task list
        const todayPlan = new Date().toISOString().split("T")[0];
        const planTemplate = [
          `# Implementation Plan: [Feature/Project Name]`,
          "",
          `> Generated by \`/plan\` on ${todayPlan}.`,
          `> Source: SPEC.md`,
          `> Mode: ${mode}`,
          "",
          "## Overview",
          "",
          "_One paragraph summary of what we're building._",
          "",
          "## Architecture Decisions",
          "",
          "- _Key decision 1 and rationale_",
          "- _Key decision 2 and rationale_",
          "",
          "## Task List",
          "",
          "### Phase 1: Foundation",
          "",
          "- [ ] **Task 1:** _Title_",
          "  - **Description:** ",
          "  - **Acceptance criteria:**",
          "    - [ ] ",
          "    - [ ] ",
          "  - **Verification:**",
          "    - [ ] `npm test` (or `npm run check && npm run build` if no test runner)",
          "    - [ ] `npm run build`",
          "  - **Dependencies:** None",
          "  - **Files likely touched:** ",
          "  - **Estimated scope:** S (1-2 files)",
          "",
          "- [ ] **Task 2:** _Title_",
          "  - **Description:** ",
          "  - **Acceptance criteria:**",
          "    - [ ] ",
          "  - **Verification:** ",
          "  - **Dependencies:** Task 1",
          "  - **Files likely touched:** ",
          "  - **Estimated scope:** S",
          "",
          "### Checkpoint: Foundation",
          "",
          "- [ ] All tests pass",
          "- [ ] Build is clean",
          "- [ ] Review with human before proceeding",
          "",
          "### Phase 2: Core Features",
          "",
          "_(Add tasks 3+ here)_",
          "",
          "## Risks and Mitigations",
          "",
          "| Risk | Impact | Mitigation |",
          "|------|--------|------------|",
          "| _Risk_ | _High/Med/Low_ | _Strategy_ |",
          "",
          "## Open Questions",
          "",
          "- _Question needing human input_",
          "",
        ].join("\n");

        const todoTemplate = [
          `# Todo`,
          "",
          `> Generated by \`/plan\`. Each task is one \`/build\` invocation.`,
          "",
          "- [ ] Task 1",
          "- [ ] Task 2",
          "- [ ] Task 3",
          "",
        ].join("\n");

        fs.writeFileSync(planPath, planTemplate, "utf-8");
        fs.writeFileSync(todoPath, todoTemplate, "utf-8");

        const summary = [
          `✓ Generated tasks/plan.md and tasks/todo.md`,
          ``,
          `Next steps:`,
          `  1. Read SPEC.md and the plan template`,
          `  2. Fill in task descriptions, acceptance criteria, and verification commands`,
          `  3. Update tasks/todo.md so it matches the task list`,
          `  4. Run \`/build\` to implement the first task`,
          ``,
          mode === "auto"
            ? `AUTO MODE: Consider delegating task breakdown to a General-Purpose-Medium sub-agent.`
            : `MANUAL MODE: Fill in the plan yourself, then /build.`,
        ].join("\n");

        ctx.ui.notify(summary, "info");
      } catch (err) {
        ctx.ui.notify(
          `Failed to generate plan: ${err instanceof Error ? err.message : String(err)}`,
          "error",
        );
      }
    },
  });

  pi.registerCommand("build", {
    description: "Implement the next pending task from tasks/todo.md (use 'auto' for autonomous mode)",
    handler: async (args: string, ctx: ExtensionContext) => {
      try {
        const cwd = process.cwd();
        const todoPath = path.join(cwd, "tasks", "todo.md");
        const planPath = path.join(cwd, "tasks", "plan.md");

        if (!fs.existsSync(todoPath)) {
          ctx.ui.notify("tasks/todo.md not found. Run /spec then /plan first.", "error");
          return;
        }

        const todoContent = fs.readFileSync(todoPath, "utf-8");
        const lines = todoContent.split("\n");
        const nextTaskLine = lines.find((l) => /^\s*-\s*\[\s\]\s*/.test(l));

        if (!nextTaskLine) {
          ctx.ui.notify("✓ All tasks in tasks/todo.md are done. Nothing to build.", "info");
          return;
        }

        const flag = args.trim().toLowerCase();
        const mode = flag === "auto" || flag === "all" ? "auto" : "single";
        const planExists = fs.existsSync(planPath);

        // Determine recommended sub-agent based on task profile (heuristic)
        const taskText = nextTaskLine.toLowerCase();
        let agentType = "General-Purpose-Medium";
        if (
          /(rename|format|typo|bump version|update dependency|chore)/.test(taskText)
        ) {
          agentType = "General-Purpose-Low";
        } else if (
          /(architect|design|refactor|migration|security|performance)/.test(taskText)
        ) {
          agentType = "General-Purpose-High";
        }

        const instructions = [
          `Next pending task found in tasks/todo.md:`,
          ``,
          `  ${nextTaskLine.trim()}`,
          ``,
          `Recommended sub-agent: ${agentType}`,
          ``,
          `Suggested prompt template:`,
          ``,
          `\`\`\``,
          `Agent({`,
          `  subagent_type: "${agentType}",`,
          `  prompt: \`Implement the next pending task from tasks/todo.md. ` +
            `Read tasks/plan.md for full context (acceptance criteria, verification commands, files). ` +
            `Follow TDD: write a failing test first, then minimal code, then refactor. ` +
            `Run \${task.verify} commands after each step. ` +
            `When done, mark the task done in tasks/todo.md and commit.\`,`,
          `  description: "Implement next task"`,
          `})`,
          `\`\`\``,
          ``,
          mode === "auto"
            ? `AUTO MODE: After implementing one task, the build loop continues with the next until all tasks are done or a blocker is hit.`
            : `SINGLE MODE: Stop after one task. Re-run \`/build\` for the next one.`,
          planExists
            ? `✓ tasks/plan.md found — task details will come from there.`
            : `⚠ tasks/plan.md missing — task details must be inferred from the todo line.`,
        ].join("\n");

        ctx.ui.notify(instructions, "info");
      } catch (err) {
        ctx.ui.notify(
          `Failed to read tasks: ${err instanceof Error ? err.message : String(err)}`,
          "error",
        );
      }
    },
  });

  // ─── AGENTS.md Rule Injection ───────────────────────

  const MUST_LOAD_OPEN = "<!--MUST-LOAD-->";
  const MUST_LOAD_CLOSE = "<!--MUST-LOAD-->";
  const MUST_LOAD_SKILL = "using-agent-skills";
  const DEFAULT_AGENTS_CONTENT = `# Project

## Tech Stack

_Detected from package.json._

## Commands

_Detected from package.json._

## Code Conventions

_Detected from project source files._

## Boundaries

_Detected from package.json._
`;

  const MUST_LOAD_BLOCK = [
    "",
    MUST_LOAD_OPEN,
    `Always load skill: ${MUST_LOAD_SKILL}`,
    MUST_LOAD_CLOSE,
    "",
  ].join("\n");

  /** Extract the <--MUST-LOAD-->...<!--MUST-LOAD--> block from content, or null. */
  function extractMustLoadBlock(content: string): string | null {
    const openIdx = content.indexOf(MUST_LOAD_OPEN);
    if (openIdx < 0) return null;
    const closeIdx = content.indexOf(MUST_LOAD_CLOSE, openIdx + MUST_LOAD_OPEN.length);
    if (closeIdx < 0) return null;
    return content.slice(openIdx, closeIdx + MUST_LOAD_CLOSE.length);
  }

  pi.registerCommand("add-rules", {
    description:
      "Ensure AGENTS.md declares that the using-agent-skills skill must always be loaded. Creates AGENTS.md if missing.",
    handler: async (_args: string, ctx: ExtensionContext) => {
      try {
        const cwd = process.cwd();
        const agentsPath = path.join(cwd, "AGENTS.md");

        // If AGENTS.md doesn't exist, create it with the MUST-LOAD block
        if (!fs.existsSync(agentsPath)) {
          const content = DEFAULT_AGENTS_CONTENT.replace(/\s*$/, "") + "\n" + MUST_LOAD_BLOCK + "\n";
          fs.writeFileSync(agentsPath, content, "utf-8");
          ctx.ui.notify(
            `✓ Created AGENTS.md with MUST-LOAD block referencing "${MUST_LOAD_SKILL}".\n  Edit AGENTS.md to add project details (MUST-LOAD block will be preserved on future edits).`,
            "info",
          );
          return;
        }

        const content = fs.readFileSync(agentsPath, "utf-8");

        // Find the MUST-LOAD block (open and close markers).
        const openIdx = content.indexOf(MUST_LOAD_OPEN);
        const closeIdx = openIdx >= 0
          ? content.indexOf(MUST_LOAD_CLOSE, openIdx + MUST_LOAD_OPEN.length)
          : -1;

        // No block at all — append one.
        if (openIdx < 0 || closeIdx < 0) {
          const newContent =
            content.replace(/\s*$/, "") + "\n" + MUST_LOAD_BLOCK;
          fs.writeFileSync(agentsPath, newContent, "utf-8");
          ctx.ui.notify(
            `✓ Added MUST-LOAD block referencing "${MUST_LOAD_SKILL}" to AGENTS.md.`,
            "info",
          );
          return;
        }

        // Block exists. Check whether the skill is already mentioned.
        const blockBody = content.slice(
          openIdx + MUST_LOAD_OPEN.length,
          closeIdx,
        );

        if (new RegExp(`\\b${MUST_LOAD_SKILL}\\b`).test(blockBody)) {
          ctx.ui.notify(
            `✓ AGENTS.md already declares "Always load skill: ${MUST_LOAD_SKILL}". No changes needed.`,
            "info",
          );
          return;
        }

        // Block exists but skill is not mentioned — insert the line
        // right after the opening marker so the rule is the first thing
        // an agent reading the block sees.
        const insertion = `Always load skill: ${MUST_LOAD_SKILL}\n`;
        const newContent =
          content.slice(0, openIdx + MUST_LOAD_OPEN.length) +
          "\n" +
          insertion +
          content.slice(openIdx + MUST_LOAD_OPEN.length);
        fs.writeFileSync(agentsPath, newContent, "utf-8");
        ctx.ui.notify(
          `✓ Inserted "Always load skill: ${MUST_LOAD_SKILL}" into existing MUST-LOAD block in AGENTS.md.`,
          "info",
          );
      } catch (err) {
        ctx.ui.notify(
          `Failed to add rules: ${err instanceof Error ? err.message : String(err)}`,
          "error",
        );
      }
    },
  });

  // ─── Event Handlers ────────────────────────────────

  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.setStatus("pi-helper", "pi-helper loaded ✓");
  });

  pi.on("session_shutdown", async (_event, _ctx) => {
    // Clean up if needed
  });
}

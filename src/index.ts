/**
 * pi-helper extension
 *
 * A Pi Coding Agent extension that bundles a spec-driven development
 * workflow (init / spec / plan / build) and a curated skills library
 * for the pi agent context.
 *
 * Commands:
 * - /init-subagents — Initialize General-Purpose sub-agents (Low/Medium/High) in .pi/agents/
 * - /init-context   — Analyze project and generate AGENTS.md
 * - /add-rules      — Ensure AGENTS.md declares that `using-agent-skills` must always be loaded
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

  // ─── Project Analysis & AGENTS.md Generation ─────────

  interface ProjectAnalysis {
    name: string;
    description: string;
    techStack: string[];
    commands: string[];
    structure: string[];
    conventions: string[];
    testingStrategy: string[];
    boundaries: { always: string[]; askFirst: string[]; never: string[] };
    patterns: string | null;
  }

  function readJsonSafe<T>(filePath: string): T | null {
    try {
      return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
    } catch {
      return null;
    }
  }

  function readFileSafe(filePath: string): string | null {
    try {
      return fs.readFileSync(filePath, "utf-8");
    } catch {
      return null;
    }
  }

  function listDirSafe(dir: string, maxDepth: number = 2): string[] {
    const result: string[] = [];
    const walk = (current: string, depth: number, prefix: string) => {
      if (depth > maxDepth) return;
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(current, { withFileTypes: true });
      } catch {
        return;
      }
      // Sort: dirs first, then files
      entries.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });
      for (const entry of entries) {
        if (
          entry.name === "node_modules" ||
          entry.name === ".git" ||
          entry.name === "dist" ||
          entry.name === "build" ||
          entry.name === ".next" ||
          entry.name === "coverage" ||
          entry.name === ".venv" ||
          entry.name === "__pycache__" ||
          entry.name === ".DS_Store"
        ) {
          continue;
        }
        const name = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          result.push(`${name}/`);
          walk(path.join(current, entry.name), depth + 1, name);
        } else {
          result.push(name);
        }
      }
    };
    walk(dir, 0, "");
    return result;
  }

  function detectTechStack(cwd: string): string[] {
    const stack: string[] = [];
    const pkg = readJsonSafe<{
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    }>(path.join(cwd, "package.json"));
    if (pkg) {
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

      // Languages
      if (deps.typescript || fs.existsSync(path.join(cwd, "tsconfig.json"))) {
        stack.push("TypeScript");
      } else if (fs.existsSync(path.join(cwd, "package.json"))) {
        stack.push("JavaScript (Node.js)");
      }

      // Frameworks
      if (deps["next"]) stack.push("Next.js");
      if (deps["react"]) stack.push("React");
      if (deps["vue"]) stack.push("Vue");
      if (deps["svelte"]) stack.push("Svelte");
      if (deps["express"]) stack.push("Express");
      if (deps["fastify"]) stack.push("Fastify");
      if (deps["hono"]) stack.push("Hono");
      if (deps["@nestjs/core"]) stack.push("NestJS");

      // Tooling
      if (deps["vite"]) stack.push("Vite");
      if (deps["webpack"]) stack.push("Webpack");
      if (deps["tailwindcss"]) stack.push("Tailwind CSS");
      if (deps["eslint"]) stack.push("ESLint");
      if (deps["prettier"]) stack.push("Prettier");
      if (deps["biome"]) stack.push("Biome");
    }

    // Python
    if (
      fs.existsSync(path.join(cwd, "pyproject.toml")) ||
      fs.existsSync(path.join(cwd, "requirements.txt")) ||
      fs.existsSync(path.join(cwd, "setup.py"))
    ) {
      stack.push("Python");
      if (fs.existsSync(path.join(cwd, "pyproject.toml"))) {
        const toml = readFileSafe(path.join(cwd, "pyproject.toml")) || "";
        if (toml.includes("fastapi")) stack.push("FastAPI");
        if (toml.includes("django")) stack.push("Django");
        if (toml.includes("flask")) stack.push("Flask");
      }
    }

    // Go
    if (fs.existsSync(path.join(cwd, "go.mod"))) stack.push("Go");

    // Rust
    if (fs.existsSync(path.join(cwd, "Cargo.toml"))) stack.push("Rust");

    // Node version
    const nvmrc = readFileSafe(path.join(cwd, ".nvmrc"));
    if (nvmrc) {
      const v = nvmrc.trim();
      if (v) stack.push(`Node.js ${v}`);
    } else {
      const pkg = readJsonSafe<{ engines?: { node?: string } }>(
        path.join(cwd, "package.json"),
      );
      if (pkg?.engines?.node) {
        stack.push(`Node.js ${pkg.engines.node}`);
      } else {
        stack.push("Node.js >=20");
      }
    }

    return stack.length > 0 ? stack : ["Unknown"];
  }

  function detectCommands(cwd: string): string[] {
    const commands: string[] = [];
    const pkg = readJsonSafe<{ scripts?: Record<string, string> }>(
      path.join(cwd, "package.json"),
    );
    if (pkg?.scripts) {
      for (const [name, cmd] of Object.entries(pkg.scripts)) {
        commands.push(`\`npm run ${name}\` — ${cmd}`);
      }
    }
    // Makefile
    const makefile = readFileSafe(path.join(cwd, "Makefile"));
    if (makefile) {
      const targets = makefile.match(/^([a-zA-Z_-][a-zA-Z0-9_-]*):/gm) || [];
      for (const t of targets) {
        const name = t.replace(":", "").trim();
        if (name && name !== ".PHONY") {
          commands.push(`\`make ${name}\``);
        }
      }
    }
    return commands;
  }

  function detectStructure(cwd: string): string[] {
    const entries = listDirSafe(cwd, 2);
    return entries.slice(0, 30);
  }

  function detectConventions(cwd: string): string[] {
    const conventions: string[] = [];
    if (fs.existsSync(path.join(cwd, ".eslintrc")) || fs.existsSync(path.join(cwd, ".eslintrc.json")) || fs.existsSync(path.join(cwd, "eslint.config.js")) || fs.existsSync(path.join(cwd, "eslint.config.mjs"))) {
      conventions.push("ESLint configured for linting");
    }
    if (fs.existsSync(path.join(cwd, ".prettierrc")) || fs.existsSync(path.join(cwd, "prettier.config.js"))) {
      conventions.push("Prettier for code formatting");
    }
    if (fs.existsSync(path.join(cwd, "biome.json"))) {
      conventions.push("Biome for linting + formatting");
    }
    // Read tsconfig for strict mode
    const tsconfig = readJsonSafe<{ compilerOptions?: { strict?: boolean } }>(
      path.join(cwd, "tsconfig.json"),
    );
    if (tsconfig?.compilerOptions?.strict) {
      conventions.push("TypeScript strict mode enabled");
    }
    // Detect import style from a sample source file
    const srcDir = path.join(cwd, "src");
    if (fs.existsSync(srcDir)) {
      try {
        const files = fs.readdirSync(srcDir).filter((f) => f.endsWith(".ts") || f.endsWith(".tsx") || f.endsWith(".js"));
        for (const f of files) {
          const content = readFileSafe(path.join(srcDir, f));
          if (content) {
            if (content.includes("import type")) {
              conventions.push("Uses `import type` for type-only imports");
            }
            if (/export default/.test(content)) {
              conventions.push("Uses default exports");
            } else if (/^export\s+(const|function|class)/m.test(content)) {
              conventions.push("Uses named exports");
            }
            break;
          }
        }
      } catch {
        // ignore
      }
    }
    return conventions;
  }

  function detectTestingStrategy(cwd: string): string[] {
    const strategy: string[] = [];
    const pkg = readJsonSafe<{ devDependencies?: Record<string, string> }>(
      path.join(cwd, "package.json"),
    );
    if (pkg?.devDependencies) {
      const dev = pkg.devDependencies;
      if (dev["vitest"]) strategy.push("Vitest for unit tests");
      if (dev["jest"]) strategy.push("Jest for unit tests");
      if (dev["mocha"]) strategy.push("Mocha for unit tests");
      if (dev["@playwright/test"] || dev["playwright"]) strategy.push("Playwright for E2E tests");
      if (dev["cypress"]) strategy.push("Cypress for E2E tests");
      if (dev["@testing-library/react"]) strategy.push("Testing Library for React components");
    }
    // Check for test files
    try {
      const testPatterns = ["*.test.*", "*.spec.*", "__tests__/**"];
      for (const pattern of testPatterns) {
        try {
          // Simple glob check using find
          const { execSync } = require("child_process");
          const result = execSync(
            `find . -name "${pattern}" -not -path "./node_modules/*" -not -path "./dist/*" 2>/dev/null | head -5`,
            { cwd, encoding: "utf-8" },
          );
          if (result.trim()) {
            strategy.push(`Test files follow pattern: \`${pattern}\``);
            break;
          }
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
    return strategy;
  }

  function detectBoundaries(cwd: string): { always: string[]; askFirst: string[]; never: string[] } {
    const boundaries = { always: [] as string[], askFirst: [] as string[], never: [] as string[] };
    const gitignore = readFileSafe(path.join(cwd, ".gitignore")) || "";
    // Never
    if (gitignore.includes(".env") || fs.existsSync(path.join(cwd, ".env.example"))) {
      boundaries.never.push("Never commit `.env` files or secrets");
    }
    if (gitignore.includes("node_modules")) {
      boundaries.never.push("Never edit files inside `node_modules`");
    }
    // Always
    if (fs.existsSync(path.join(cwd, ".husky")) || fs.existsSync(path.join(cwd, ".git/hooks"))) {
      boundaries.always.push("Pre-commit hooks are configured — fix issues instead of skipping");
    }
    if (fs.existsSync(path.join(cwd, "tsconfig.json"))) {
      boundaries.always.push("Run `npm run check` (type check) before committing");
    }
    // Ask first
    if (fs.existsSync(path.join(cwd, "package.json"))) {
      boundaries.askFirst.push("Ask before adding new dependencies");
    }
    if (fs.existsSync(path.join(cwd, "Dockerfile")) || fs.existsSync(path.join(cwd, "docker-compose.yml"))) {
      boundaries.askFirst.push("Ask before modifying Dockerfile or container config");
    }
    return boundaries;
  }

  function detectPatterns(cwd: string): string | null {
    const candidates = [
      path.join(cwd, "src", "index.ts"),
      path.join(cwd, "src", "index.js"),
      path.join(cwd, "src", "main.ts"),
      path.join(cwd, "src", "main.js"),
    ];
    for (const file of candidates) {
      const content = readFileSafe(file);
      if (content) {
        // Extract first 20 lines as a code style example
        const lines = content.split("\n").slice(0, 25).join("\n");
        return "```\n" + lines + "\n```";
      }
    }
    return null;
  }

  function analyzeProject(cwd: string): ProjectAnalysis {
    const pkg = readJsonSafe<{ name?: string; description?: string }>(
      path.join(cwd, "package.json"),
    );
    return {
      name: pkg?.name || path.basename(cwd),
      description: pkg?.description || "",
      techStack: detectTechStack(cwd),
      commands: detectCommands(cwd),
      structure: detectStructure(cwd),
      conventions: detectConventions(cwd),
      testingStrategy: detectTestingStrategy(cwd),
      boundaries: detectBoundaries(cwd),
      patterns: detectPatterns(cwd),
    };
  }

  function generateAgentsMd(analysis: ProjectAnalysis): string {
    const sections: string[] = [];

    // Header
    sections.push(`# Project: ${analysis.name}`);
    sections.push("");

    // Description
    if (analysis.description) {
      sections.push(`> ${analysis.description}`);
      sections.push("");
    }

    // Tech Stack
    sections.push("## Tech Stack");
    for (const tech of analysis.techStack) {
      sections.push(`- ${tech}`);
    }
    sections.push("");

    // Commands
    sections.push("## Commands");
    if (analysis.commands.length > 0) {
      for (const cmd of analysis.commands) {
        sections.push(`- ${cmd}`);
      }
    } else {
      sections.push("- _No commands detected_");
    }
    sections.push("");

    // Project Structure
    sections.push("## Project Structure");
    if (analysis.structure.length > 0) {
      sections.push("```");
      for (const entry of analysis.structure) {
        sections.push(entry);
      }
      sections.push("```");
    } else {
      sections.push("_No structure detected_");
    }
    sections.push("");

    // Code Conventions
    sections.push("## Code Conventions");
    if (analysis.conventions.length > 0) {
      for (const conv of analysis.conventions) {
        sections.push(`- ${conv}`);
      }
    } else {
      sections.push("- _No conventions detected — add your own_");
    }
    sections.push("");

    // Testing Strategy
    sections.push("## Testing Strategy");
    if (analysis.testingStrategy.length > 0) {
      for (const t of analysis.testingStrategy) {
        sections.push(`- ${t}`);
      }
    } else {
      sections.push("- _No testing framework detected_");
    }
    sections.push("");

    // Boundaries
    sections.push("## Boundaries");
    sections.push("");
    sections.push("### Always");
    if (analysis.boundaries.always.length > 0) {
      for (const b of analysis.boundaries.always) {
        sections.push(`- ${b}`);
      }
    } else {
      sections.push("- _None detected_");
    }
    sections.push("");
    sections.push("### Ask first");
    if (analysis.boundaries.askFirst.length > 0) {
      for (const b of analysis.boundaries.askFirst) {
        sections.push(`- ${b}`);
      }
    } else {
      sections.push("- _None detected_");
    }
    sections.push("");
    sections.push("### Never");
    if (analysis.boundaries.never.length > 0) {
      for (const b of analysis.boundaries.never) {
        sections.push(`- ${b}`);
      }
    } else {
      sections.push("- _None detected_");
    }
    sections.push("");

    // Patterns
    sections.push("## Patterns");
    if (analysis.patterns) {
      sections.push("Example from the project entry point:");
      sections.push("");
      sections.push(analysis.patterns);
    } else {
      sections.push("_No code patterns detected — add a representative example here_");
    }
    sections.push("");

    return sections.join("\n");
  }

  pi.registerCommand("init-context", {
    description: "Analyze current project and generate AGENTS.md",
    handler: async (_args: string, ctx: ExtensionContext) => {
      try {
        const cwd = process.cwd();
        const outputPath = path.join(cwd, "AGENTS.md");

        if (fs.existsSync(outputPath)) {
          ctx.ui.notify("AGENTS.md already exists. Overwriting...", "warning");
        }

        const analysis = analyzeProject(cwd);
        const content = generateAgentsMd(analysis);

        fs.writeFileSync(outputPath, content, "utf-8");

        const summary = [
          `✓ Generated AGENTS.md`,
          `  - Tech stack: ${analysis.techStack.length} items`,
          `  - Commands: ${analysis.commands.length}`,
          `  - Structure entries: ${analysis.structure.length}`,
          `  - Conventions: ${analysis.conventions.length}`,
          `  - Testing: ${analysis.testingStrategy.length} items`,
        ].join("\n");

        ctx.ui.notify(summary, "info");
      } catch (err) {
        ctx.ui.notify(
          `Failed to init context: ${err instanceof Error ? err.message : String(err)}`,
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

  pi.registerCommand("add-rules", {
    description:
      "Ensure AGENTS.md declares that the using-agent-skills skill must always be loaded",
    handler: async (_args: string, ctx: ExtensionContext) => {
      try {
        const cwd = process.cwd();
        const agentsPath = path.join(cwd, "AGENTS.md");

        if (!fs.existsSync(agentsPath)) {
          ctx.ui.notify(
            "AGENTS.md not found. Run /init-context first.",
            "error",
          );
          return;
        }

        const content = fs.readFileSync(agentsPath, "utf-8");

        // Find the MUST-LOAD block (open and close markers).
        // The block is everything between the first <!--MUST-LOAD--> and
        // the next <!--MUST-LOAD--> after it.
        const openIdx = content.indexOf(MUST_LOAD_OPEN);
        const closeIdx = openIdx >= 0
          ? content.indexOf(MUST_LOAD_CLOSE, openIdx + MUST_LOAD_OPEN.length)
          : -1;

        // No block at all — append one.
        if (openIdx < 0 || closeIdx < 0) {
          const block = [
            "",
            MUST_LOAD_OPEN,
            `Always load skill: ${MUST_LOAD_SKILL}`,
            MUST_LOAD_CLOSE,
            "",
          ].join("\n");
          const newContent =
            content.replace(/\s*$/, "") + "\n" + block;
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

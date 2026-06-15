---
name: pi-sub-agent-creator
description: 'Create, configure, and manage custom pi sub-agents (.pi/agents/<name>.md). Use when user wants to create a new sub-agent, edit an existing agent, define agent types with custom system prompts/tools/models, or list/inspect available agents. Supports YAML frontmatter configuration for tools, model, thinking level, memory, and tool restrictions.'
license: MIT
allowed-tools: Bash, Read, Write, Edit
---

# Pi Sub-Agent Creator

## Overview

Create and manage custom sub-agent definitions for [pi-subagents](https://pi.dev/packages/@tintinweb/pi-subagents). Custom agents are defined as Markdown files with YAML frontmatter in `.pi/agents/` directory.

## Agent Definition Format

Each agent is a `.md` file at `.pi/agents/<name>.md`:

```markdown
---
description: Short description of the agent's role
tools: read, grep, find, bash, write, edit
disallowed_tools: write, edit
model: provider/modelId
thinking: high
max_turns: 30
memory: project
enabled: true
---

System prompt content goes here. This defines the agent's behavior,
expertise, and instructions for how it should approach tasks.
```

## Frontmatter Fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `description` | string | yes | Short role description shown in UI |
| `tools` | string | no | Comma-separated allowed tool names |
| `disallowed_tools` | string | no | Comma-separated blocked tools (even if extensions provide them) |
| `model` | string | no | Model in `provider/modelId` format or fuzzy name (`"haiku"`, `"sonnet"`) |
| `thinking` | string | no | Thinking level: `off`, `minimal`, `low`, `medium`, `high`, `xhigh` |
| `max_turns` | number | no | Max agentic turns before graceful wrap-up |
| `memory` | string | no | Persistent memory scope: `project`, `local`, or `user` |
| `enabled` | boolean | no | Set `false` to disable agent (default: `true`) |

## Available Tools

| Tool | Description |
| --- | --- |
| `read` | Read file contents |
| `write` | Create or overwrite files |
| `edit` | Precise file edits with exact text replacement |
| `bash` | Execute shell commands |
| `grep` | Search file contents for patterns |
| `find` | Find files by glob pattern |
| `ls` | List directory contents |

## Memory Scopes

| Scope | Location | Use case |
| --- | --- | --- |
| `project` | `.pi/agent-memory/<name>/` | Shared across team (committed to repo) |
| `local` | `.pi/agent-memory-local/<name>/` | Machine-specific (gitignored) |
| `user` | `~/.pi/agent-memory/<name>/` | Global personal memory |

Read-only agents (no `write`/`edit` tools) automatically get read-only memory access.

## Default Agent Types (Reference)

| Type | Tools | Model | Description |
| --- | --- | --- | --- |
| `general-purpose` | all | inherit | Full system prompt twin of parent |
| `Explore` | read, bash, grep, find, ls | haiku | Fast read-only codebase exploration |
| `Plan` | read, bash, grep, find, ls | inherit | Software architect for planning |

Custom agents can override defaults by using the same name (e.g., `.pi/agents/Explore.md`).

## Workflow

### 1. Understand Requirements

Ask the user:
- **Name**: Short identifier (e.g., `auditor`, `tester`, `docwriter`)
- **Role**: What the agent does
- **Tools needed**: Read-only? Full access? Specific tools?
- **Model**: Default (inherit) or specific model?
- **Thinking level**: How much reasoning effort?
- **Memory**: Does it need persistent memory across sessions?

### 2. Create Directory

```bash
mkdir -p .pi/agents
```

### 3. Write Agent Definition

Create `.pi/agents/<name>.md` with:
- YAML frontmatter with configuration
- System prompt that clearly defines the agent's expertise and behavior

### 4. System Prompt Best Practices

- **Be specific** about the agent's role and expertise
- **Define output format** — how should findings/results be reported?
- **Set boundaries** — what should the agent NOT do?
- **Include examples** if the task has a specific format
- **Keep it focused** — one clear responsibility per agent

## Spawning Custom Agents

Once defined, spawn like any built-in type:

```
Agent({
  subagent_type: "auditor",
  prompt: "Review the authentication module",
  description: "Security audit"
})
```

### Common Agent Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `prompt` | string | The task description |
| `description` | string | Short 3-5 word UI summary |
| `subagent_type` | string | Agent type name |
| `model` | string | Override model |
| `thinking` | string | Override thinking level |
| `run_in_background` | boolean | Run without blocking |
| `isolation` | `"worktree"` | Run in isolated git worktree |
| `inherit_context` | boolean | Fork parent conversation |

## Example Agents

### Security Auditor

```markdown
---
description: Security Code Reviewer
tools: read, grep, find, bash
model: anthropic/claude-opus-4-6
thinking: high
max_turns: 30
---

You are a security auditor. Review code for vulnerabilities including:
- Injection flaws (SQL, command, XSS)
- Authentication and authorization issues
- Sensitive data exposure
- Insecure configurations

Report findings with file paths, line numbers, severity, and remediation advice.
```

### Test Writer

```markdown
---
description: Test suite generator
tools: read, write, edit, bash, grep, find
thinking: medium
max_turns: 25
---

You are a test engineer. Write comprehensive unit and integration tests.
Follow the project's existing test patterns. Aim for high coverage of
edge cases and error paths. Use the project's test framework.
```

### Documentation Writer

```markdown
---
description: Technical documentation writer
tools: read, grep, find, bash
disallowed_tools: write, edit
thinking: medium
memory: project
---

You are a technical writer. Analyze code and produce clear documentation.
Output documentation as markdown that the user can review and save.
Do NOT modify any files directly.
```

## Safety Notes

- **Never commit secrets** in agent definitions (API keys, tokens)
- **Use `disallowed_tools`** to restrict write access for read-only agents
- **Set `max_turns`** to prevent runaway agents
- **Test agents** with simple tasks before complex deployments

## pi-helper Integration

The `pi-helper` package provides a `/init-subagents` command that auto-creates 3 general-purpose sub-agents:

```
/init-subagents
```

This creates the following agents in `.pi/agents/`:

| Agent | Thinking | Use Case |
| --- | --- | --- |
| `General-Purpose-Low` | low | Fast, direct tasks — simple file ops, quick searches |
| `General-Purpose-Medium` | medium | Balanced tasks — moderate complexity, bug fixes |
| `General-Purpose-High` | high | Complex tasks — architecture, deep debugging, security |

All agents have full tool access (`read, write, edit, bash, grep, find, ls`) and strictly follow the main agent's instructions.

### Spawning After Init

```bash
# Quick task — use Low
Agent({ subagent_type: "General-Purpose-Low", prompt: "...", description: "Quick task" })

# Balanced task — use Medium
Agent({ subagent_type: "General-Purpose-Medium", prompt: "...", description: "Balanced task" })

# Complex task — use High
Agent({ subagent_type: "General-Purpose-High", prompt: "...", description: "Complex task" })
```

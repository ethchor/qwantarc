---
title: "Use with AI"
section: resources
order: 3
summary: "Give your coding agent the guidelines: Markdown for every page, llms.txt, and an MCP server it can search while it builds."
---

QIG is written for people and for agents. Everything on this site is available as plain Markdown, and the QIG MCP server lets tools such as Claude Code, Codex, Cursor and Antigravity search the guidelines and read pages while they work.

## Connect the MCP server

The server lives at `https://mcp.qwantarc.com/mcp` (Streamable HTTP, no sign-in). It offers three tools:

| Tool                | What it does                                                         |
| ------------------- | -------------------------------------------------------------------- |
| `search_guidelines` | Finds the pages that answer a question, with a short excerpt of each |
| `get_page`          | Returns a page as Markdown, such as `buttons` or `rules`             |
| `list_pages`        | Lists every page, optionally for one section                         |

### Claude Code

```bash
claude mcp add --transport http qig https://mcp.qwantarc.com/mcp
```

### Codex

Add to `~/.codex/config.toml`, or `.codex/config.toml` in a project:

```toml
[mcp_servers.qig]
url = "https://mcp.qwantarc.com/mcp"
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "qig": { "url": "https://mcp.qwantarc.com/mcp" }
  }
}
```

### VS Code

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "qig": { "type": "http", "url": "https://mcp.qwantarc.com/mcp" }
  }
}
```

### Antigravity

Add to `mcp_config.json`. Antigravity reads `serverUrl` for remote servers:

```json
{
  "mcpServers": {
    "qig": { "serverUrl": "https://mcp.qwantarc.com/mcp" }
  }
}
```

### Gemini CLI

Add to `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "qig": { "httpUrl": "https://mcp.qwantarc.com/mcp" }
  }
}
```

## Read it as Markdown

- **The map:** [llms.txt](https://developer.qwantarc.com/llms.txt) lists every page with a one-line summary and a link to its Markdown.
- **Everything at once:** [llms-full.txt](https://developer.qwantarc.com/llms-full.txt) holds the whole of the guidelines in one file.
- **One page:** add `.md` to any page address, such as [buttons.md](https://developer.qwantarc.com/design/qig/buttons.md). Every page also has Copy Page and View as Markdown at the top.

## Tell your agent to follow QIG

Add a line like this to your project’s `AGENTS.md`, `CLAUDE.md` or rules file:

```markdown
## Interface guidelines
Every UI change follows Qwantarc Interface Guidelines (QIG).
Use the `qig` MCP server when it is connected; otherwise read https://developer.qwantarc.com/llms.txt.
Start with Principles and Rules, then the pattern and components for the screen. Cite rules by number (R1 to R18) in reviews.
```

## Best practices

- **Ask for the pattern first.** Agents do better when they pick the screen’s pattern before writing components.
- **Check against the rules.** Ask the agent to review its own change with the [review checklist](/design/qig/review-checklist).
- **Keep values in one place.** Map the [design values](/design/qig/design-values) to your platform’s tokens once, then let the agent use the tokens.

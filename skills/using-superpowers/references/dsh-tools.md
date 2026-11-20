# DeepSeek Harness Tool Reference

This is the DSH platform adaptation for the superpowers skills. Read this file
when a skill mentions a tool, hook, or mechanism that does not exist on this
harness — the equivalent lives here.

## How skills are invoked here

The DeepSeek Harness exposes a `skill` tool. When a skill applies, call it
BEFORE acting:

- `skill(name: "brainstorming")` loads the skill body into context with the
  same `<skill_content>` framing the catalog advertises.
- The catalog lists every available skill with its `whenToUse` guidance.
  Superpowers skills are discoverable under their bare names (`brainstorming`,
  `writing-plans`, `systematic-debugging`, ...).

There is no `CLAUDE.md` auto-loading on DSH. Put durable project instructions
in `AGENTS.md` (or the session's system prompt), and load skills explicitly.
`~/.dsh/AGENTS.md` is the user-level file; `<project>/AGENTS.md` is the
project-level one.

## Core tool mapping (Claude Code → DSH)

| Claude Code | DSH equivalent | Notes |
| --- | --- | --- |
| `Bash` | `pwsh` (Windows) / `bash` (POSIX) | PowerShell on Windows hosts; bash on POSIX hosts. |
| `Read` / `Write` / `Edit` | `read` / `write` / `edit` | Same semantics; DSH adds `sandbox_permissions` escalation on write/edit. |
| `Glob` / `Grep` | `glob` / `grep` | `glob` returns files only (never directories); `grep` is ripgrep syntax. |
| `TodoWrite` | `todo_write` | Whole-list replacement each call. |
| `Task` (subagents) | `subagent` / `subagent_fork` | Background by default; `subagent_fork` inherits this conversation. `send_message` continues a run by its agent name (see below). |
| Subagent discovery / interruption | `list_agents` / `interrupt_agent` | Agents below you in the subagent tree. See *Subagent lifecycle* below. |
| `SendMessage` | `send_message` | Continues an idle child with a new turn, or steers a running one at its next step. |
| `AskUserQuestion` | `ask_user_question` | Questions return stable ids echoed in answers. |
| `WebSearch` / `WebFetch` | `web_search` / `web_fetch` | Search returns a summary plus source URLs. |
| `LS` (file list) | `glob` + `read` | There is no dedicated `ls` tool. |
| Hooks (PreToolUse etc.) | None | DSH has no hook system. Enforce workflows through skills themselves. |
| `/commands` slash commands | `dsh` CLI + `command-*` plugins | Slash-command UI lives in the web surface. |
| Plan mode | `exit_plan_mode` | Present the plan; on approval leave plan mode and execute. |
| `ReadImage` | `read_image` | PNG/JPEG/WebP/GIF only. |
| Background jobs | `run_in_background: true` on tools | `job_output` / `job_kill` / `job_list` manage them. |

Named agents (`Task (superpowers:code-reviewer)`) do not exist on DSH. Follow
the skills' own dispatch form instead: `subagent` with the prompt template the
skill names (`code-reviewer.md`, `implementer-prompt.md`, ...).

## DSH-specific tools superpowers should know about

- `goal` tools (`create_goal`, `get_goal`, `update_goal`): persisted
  same-session completion objectives with automatic continuation rounds.
- `workflow`: fan work out across many subagents with phases and structured
  results — the DSH-native way to run `dispatching-parallel-agents` at scale.
- `schedule_*`: durable reminders that re-deliver a prompt into this session.
- `skill`: loads a skill's full instructions (see above).

## Subagent lifecycle: discovery, messaging, interruption, waiting

`subagent` returns the child's name right away and the child keeps working in
the background. The four control tools below are what
`subagent-driven-development` needs to check on a dispatch and rescue one that
derailed; without them an agent tends to invent a delegation-control tool that
does not exist.

| Tool | Arguments | What it does |
| --- | --- | --- |
| `list_agents` | none | Your whole subagent tree: names, descriptions, and status. A descendant's name is its path from the root, such as `reviewer/checker`. |
| `send_message` | `agent`, `message` | Delivers to a working agent at its next step, or starts a new turn for an idle one. Returns delivery confirmation. |
| `interrupt_agent` | `agent` | Asks an agent below you to stop. Returns before it stops; it may run a few more steps. |
| `wait_agent` | `timeout_ms` (10000–3600000, default 30000) | Waits for your next-step inbox: agent messages, completion notices, user steering. `timedOut: false` means input is already pending. |

`running` means a turn is executing; `inactive` means no turn is executing,
which is **not** task completion or success. A direct child already notifies
you when it finishes, so do not poll `list_agents` in a loop. Use
`send_message` to continue its conversation.

`interrupt_agent` reaches only owned descendants (your children and deeper).
It cannot be undone for external executions, which stop permanently; local
subagents can be resumed with `send_message`. Subagents the interrupted agent
started keep running.

Argument naming moved across the 0.2 line: `agent` takes a name or a Session id
on 0.2.2-alpha.3 and newer, the same calls took `agent_id` from 0.2.1-rc.2
through 0.2.2-alpha.2, and the Team-scoped variants before 0.2.1-rc.2 took
`target`. The schema in front of you wins over any version note here.

On 0.2.2-rc.1 and newer the base bundle and the Web `standard`, `cordis`, and
`ptc` presets ship `interrupt: false` for `tool-subagent-control`, so
`interrupt_agent` may not be offered at all while messaging, discovery, and
waiting still are. When it is missing, say so and ask the user how to proceed
rather than substituting another tool or claiming the stop happened.

## Agent Teams (opt-in)

Turning on Team mode for a root Session adds a shared task board —
`team_task_create`, `team_task_get`, `team_task_list`, `team_task_update` — and
task-board guidance. It is **not** a second delegation family: `subagent`,
`send_message`, `list_agents`, `interrupt_agent`, and `wait_agent` stay the way
they are. Builds before 0.2.1-rc.2 exposed `spawn_teammate` and Team-scoped
`send_message({ target })` variants; those are gone, so never emit them.

- Create with `subject` and `description`; `blocked_by` lists task ids that must
  finish first, and `write_scopes` is advisory only (workspace-relative file or
  directory prefixes, not a lock).
- Read before you write: `team_task_update` is a compare-and-set on
  `expected_revision`, taken from the latest `team_task_get` or
  `team_task_list`. `action` is one of `claim`, `release`, `edit`,
  `set_dependencies`, `complete`, `reopen`, `reassign`, `delete`.
- Readiness comes from `ready` / `blocked_by`, not from an agent's status.
- A task change is not a message. From 0.2.1-rc.3 on, task updates do not end a
  `wait_agent` call or wake an idle agent, so `send_message` whoever must act.

## Programmatic tool calling, MCP resources, and deliverables

- `run_code(code, description)`: PTC presets expose this instead of the
  individual tools. `code` is the body of an async TypeScript function (top-level
  `await` and `return` work; no enums or namespaces), tools are called as
  `await tools.name(args)`, and `inspect(...)` shows output — not `console`.
  `timeoutMs` defaults to 120000 and caps at 600000. When the preset does not
  offer it, keep calling tools one at a time.
- `list_mcp_resources(server, cursor)` and
  `list_mcp_resource_templates(server, cursor)` enumerate an MCP server's
  resources; `read_mcp_resource(server, uri)` reads one by URI. These are not
  the server's tools: resources are content the server publishes, so read one
  when a skill needs the server's own data rather than an action on it.
- `present(files)`: declares existing files as final deliverables; hosts show
  them after the turn ends. Usually 1–2 files, at most 4 per
  call, each `{ path, description }`; contents are not copied, so the paths must
  exist. Use it for separate files — Office documents, spreadsheets, decks — and
  keep the answer in the reply when a file is not needed.

## Bundled scripts: invoke them through their interpreter

The skills ship bash and Node helpers (`scripts/sdd-workspace`,
`scripts/sdd-repo`, `scripts/task-brief`, `scripts/review-package`,
`scripts/task-start`, `scripts/task-done`, `scripts/render-graphs.js`,
`scripts/server.cjs`). Always invoke them through an interpreter —
`bash scripts/task-brief PLAN N`, `node scripts/render-graphs.js` — never as a
bare path. Package extractors (and Windows itself) do not preserve Unix
executable bits, so a bare `scripts/task-brief` fails with `Permission denied`.

**Call them by absolute path, from the repository you are working in.** The
skill texts say this, and it matters more on DSH than elsewhere: a plugin's
skills live inside the plugin installation, not in your project. The five
execution helpers resolve the repository from the *current directory* (via
`git rev-parse --show-toplevel`, like `git` itself), so:

- Resolve the helper from the skill's own directory (the `resourceBase` the
  `skill` tool returns) and pass that absolute path to `bash`.
- Run it with the project as the working directory, or pass `-C DIR`.
- `cd`-ing into the plugin directory first is the failure mode these helpers now
  guard against: they would act on the plugin's own files, and outside a
  repository they stop with exit 2 rather than writing a workspace into a cache
  directory.
- A brand-new project with no commits yet needs `git init` plus a first commit
  before `task-start`/`task-brief` can work.

On Windows, `bash` means Git for Windows (Git Bash). If `bash` is not on
`PATH`, the bash-only helpers are unavailable; say so instead of inventing an
equivalent, and use the Node helper (`node scripts/server.cjs`) where one
exists. These helpers print paths PowerShell can open (they convert through
`cygpath -m` where it exists, so you get `C:/Users/...` rather than `/c/Users/...`).

Set `$DSH_HOME` (default `~/.dsh`) for user-level paths; skills that mention
`~/.claude/...` on Claude Code mean `$DSH_HOME/skills/...` here.

## Session transcripts on disk

`diagnosing-superpowers` reads session transcripts. On DSH they live at:

```
$DSH_HOME/sessions/<slugified-cwd>/session-<uuid>/session.v4.jsonl.zstd
```

Each file is a concatenation of independent zstd frames (one per record), so a
streaming zstd reader stops at the first frame. There is usually no `zstd` CLI;
decompress frame by frame with Node:

```bash
node -e "
const fs = require('fs'), z = require('zlib');
const b = fs.readFileSync(process.argv[1]);
const m = [0x28, 0xb5, 0x2f, 0xfd], offs = [];
for (let i = 0; i <= b.length - 4; i++)
  if (b[i] === m[0] && b[i+1] === m[1] && b[i+2] === m[2] && b[i+3] === m[3]) offs.push(i);
offs.push(b.length);
let out = '';
for (let i = 0; i < offs.length - 1; i++) out += z.zstdDecompressSync(b.slice(offs[i], offs[i+1])).toString('utf8');
process.stdout.write(out);
" <file>
```

Records are JSON lines: `{ type, seq, time, data }`, with types such as
`session`, `user/message`, `assistant/message`, `tool/call`, `tool/result`,
`step/start`, `step/end`, `turn/start`. Subagent sessions are separate
directories under the same workspace slug whose header has
`delegationDepth: 1` (older files are `session.v3.jsonl.zstd`,
`session.jsonl.zstd`). **Verify every field meaning against the records you
actually read** — never infer a format from another harness.

## Windows notes

- `pwsh` runs in ConstrainedLanguage under the read-only sandbox; commands
  that need .NET APIs may require `workspace-write` or `danger-full-access`.
- `bash`-only scripts (the `start-server.sh` helpers in brainstorming, and the
  SDD/inline-execution helpers) need Git Bash; the Node servers run anywhere
  Node runs.
- Paths use `C:\...` form; read env vars with `$env:NAME` in pwsh.

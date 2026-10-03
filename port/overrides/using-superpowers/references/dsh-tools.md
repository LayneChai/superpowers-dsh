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
| `Task` (subagents) | `subagent` / `subagent_fork` | Background by default; `subagent_fork` inherits this conversation. `send_message` continues a run by its agent id. |
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

## Bundled scripts: invoke them through their interpreter

The skills ship bash and Node helpers (`scripts/sdd-workspace`,
`scripts/task-brief`, `scripts/review-package`, `scripts/task-start`,
`scripts/task-done`, `scripts/render-graphs.js`, `scripts/server.cjs`).
Always invoke them through an interpreter — `bash scripts/task-brief PLAN N`,
`node scripts/render-graphs.js` — never as a bare path. Package extractors
(and Windows itself) do not preserve Unix executable bits, so a bare
`scripts/task-brief` fails with `Permission denied`.

- On Windows, `bash` means Git for Windows (Git Bash). If `bash` is not on
  `PATH`, the bash-only helpers are unavailable; say so instead of inventing
  an equivalent, and use the Node helper (`node scripts/server.cjs`) where one
  exists.
- Set `$DSH_HOME` (default `~/.dsh`) for user-level paths; skills that mention
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

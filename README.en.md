<div align="center">

**English** | [简体中文](README.md)

</div>

<div align="center">

![superpowers-dsh](static/home.png)

</div>

# superpowers-dsh

Superpowers for the **DeepSeek Harness**: a plugin bundle that ports the core
skills of [obra/superpowers](https://github.com/obra/superpowers) (the
Claude-Code skills library: TDD, debugging, planning, collaboration patterns)
to DSH's Cordis plugin architecture.

The plugin registers a skill provider into the **host layer** of the
`ctx.skills` registry, so every agent preset's scope chain merges these
skills. Skill bodies ship inside the package (`skills/<name>/SKILL.md`) and
are located from `import.meta.url` — an assembly fact of the package, never
user configuration.

## Install & use in your DeepSeek Harness

A **plugin bundle** for DeepSeek Harness (DSH). Installing it registers the
15 skills below into the host skill registry, so every agent session in your
profile sees them in its skill catalog and can load them with the `skill`
tool. Skill content is synced from upstream **obra/superpowers v6.4.2**.

### Prerequisites

- DeepSeek Harness, plus **pnpm** — the `dsh plugin` command forwards to pnpm
  (`pnpm --version` to check; install from https://pnpm.io if missing)
- The `dsh` CLI. It ships with the Harness and is normally started as
  `npx @deepseek-ai/dsh web`, so it is only on `PATH` inside that process
  tree. Either make it permanent, or use the `npx` form of every command
  below:

  ```sh
  # make `dsh` permanently available (recommended):
  npm install -g @deepseek-ai/dsh
  dsh --version

  # or skip the install and run everything through npx:
  npx @deepseek-ai/dsh --version
  ```

  Every `dsh ...` example below works identically as
  `npx @deepseek-ai/dsh ...`.

### Simplest: one command

No global `dsh` install required. Run this from any directory:

```sh
npx @deepseek-ai/dsh plugin --profile web add github:LayneChai/superpowers-dsh
```

Then restart `npx @deepseek-ai/dsh web` (or `dsh web`) and refresh the browser.

### Easiest: let the DeepSeek Harness agent install it

Open the DeepSeek Harness web UI, start a new conversation, and send this
message:

```
Please install the plugin from this link: https://github.com/LayneChai/superpowers-dsh
```

The agent will run the install for you (`dsh plugin --profile web add` →
restart the profile → verify the skills registered), so you never have to
type a command. Afterwards you can ask it to run
`dsh --profile web --dump-config` and confirm a `superpowers-dsh` row is
present.

### Install from npm (recommended — one command)

The package is published on npm as `superpowers-dsh` (synced to the
npmmirror mirror for mainland China):

```sh
dsh plugin --profile web add superpowers-dsh
```

> Use the `dsh plugin` form — a plain `npm install superpowers-dsh` installs
> the package as a library in the current directory but does **not** register
> it into any DeepSeek Harness profile, so the skills would never load.

### Install from GitHub

```sh
# from anywhere
dsh plugin --profile web add https://github.com/LayneChai/superpowers-dsh.git
```

### Install from a tarball or a local folder

```sh
# tarball (e.g. the release asset superpowers-dsh-0.1.0.tgz)
dsh plugin --profile web add C:\path\to\superpowers-dsh-0.1.0.tgz

# or the unpacked package folder (pnpm links it, so edits take effect on restart)
dsh plugin --profile web add C:\path\to\superpowers-dsh
```

### Restart and verify

The bundle layer mounts at profile startup, so **restart the profile** (stop
and re-run `dsh web` / `npx @deepseek-ai/dsh web`, then refresh the browser).
To confirm the layer is composed:

```sh
dsh --profile web --dump-config     # a `superpowers-dsh` row must be present
```

The skills then appear in the agent skill catalog (`using-superpowers` is the
entry-point skill) and are loadable with the `skill` tool.

A successful install looks like this:

![Installation success screenshot](static/install-success.png)

### Using another profile (headless / tui / custom)

Point `--profile` at whichever profile you run:

```sh
dsh plugin --profile headless add superpowers-dsh
dsh --profile headless --dump-config
```

### Uninstall

```sh
dsh plugin --profile web remove superpowers-dsh
# then restart the profile again
```

### Notes

- Installers in mainland China can set the npm mirror first — it makes `dsh
  plugin add superpowers-dsh` fast:
  `npm config set registry https://registry.npmmirror.com`
- A plugin installed from a folder or `file:` spec is linked, not copied:
  changes to that folder take effect after the next profile restart.
- Consumers need **no npm account and no 2FA** — installing is a plain
  package download.

## Skills

| Skill | Purpose |
| --- | --- |
| `using-superpowers` | How to find and use skills; the entry-point skill |
| `brainstorming` | Turn ideas into designs through collaborative dialogue |
| `writing-plans` | Write comprehensive implementation plans from specs |
| `executing-plans` | Execute a plan inline (Native) in this session, one whole-branch review at the end |
| `subagent-driven-development` | Dispatch fresh subagents per task with reviews |
| `dispatching-parallel-agents` | Fan independent work out across parallel agents |
| `systematic-debugging` | Root-cause-first debugging discipline |
| `test-driven-development` | RED-GREEN-REFACTOR implementation loop |
| `verification-before-completion` | Evidence before success claims |
| `requesting-code-review` | Get rigorous review before merging |
| `receiving-code-review` | Verify feedback instead of blindly implementing it |
| `finishing-a-development-branch` | Integrate completed work safely |
| `using-git-worktrees` | Isolated workspaces for feature work |
| `writing-skills` | Author and validate new skills TDD-style |
| `diagnosing-superpowers` | Read a session's transcripts on disk and report what went wrong, with `path:line` evidence |

## How it works

- **Bundle layer** — `cordis.patch.yml` inserts one row
  (`- id: superpowers-dsh, name: superpowers-dsh`) over the dsh-base layer.
  Later layers (the profile's `cordis.patch.yml`, `--patch` overlays) can
  still address that row by id.
- **Provider** — `lib/index.js` calls `ctx.skills.registerProvider(...)`
  with a provider that:
  - `list()` scans the package's `skills/` directory for
    `<name>/SKILL.md` bundles and returns candidates parsed from YAML
    frontmatter (`name`, `description`, `whenToUse`).
  - `get()` reads the winning candidate's body on demand and returns a
    full skill definition with `resourceBase` pointing at the skill's
    directory, so relative references (scripts, prompt templates) resolve.
- **Zero runtime dependencies** — the plugin imports only Node built-ins and
  consumes the injected `ctx.skills` service interface.

## Upstream sync (currently obra/superpowers v6.4.2)

`skills/` is **generated output** — do not hand-edit it. The sync lives in two
places; change those and re-run:

- `scripts/sync-from-upstream.mjs` — copies the upstream skill tree and replays
  every DSH adaptation. Each adaptation is an asserted string rewrite, so if
  upstream rewords the anchor the run **fails loudly** instead of silently
  dropping an adaptation.
- `port/overrides/` — DSH-only files
  (`using-superpowers/references/dsh-tools.md`) copied over the synced tree.

```sh
# 1. Fetch the upstream release (git-over-https is blocked on some networks;
#    codeload works)
mkdir -p .upstream/superpowers
curl -L https://codeload.github.com/obra/superpowers/tar.gz/refs/tags/v6.4.2 \
  | tar -xz -C .upstream/superpowers --strip-components=1

# 2. Replay the sync
node scripts/sync-from-upstream.mjs .upstream/superpowers

# 3. Verify (provider lists every skill, frontmatter is valid, no dangling refs)
node scripts/verify-skills.mjs
```

What this sync brought in from upstream:

- **New skill `diagnosing-superpowers`** (v6.4.1): when a session goes wrong,
  locate the transcripts on disk and report what happened with `path:line`
  evidence; build a scrubbed bundle or a GitHub issue draft on request. The DSH
  transcript location and decompression recipe are recorded in
  `skills/diagnosing-superpowers/references/session-discovery.md` and
  `skills/using-superpowers/references/dsh-tools.md`.
- **`executing-plans` rebuilt as Native (inline) execution** (v6.4.1): no
  check-in every few tasks; the session implements every task itself, then one
  whole-branch review at the end. Shares SDD's workspace and ledger, and adds
  `scripts/task-start` / `scripts/task-done`.
- **`writing-plans`** (v6.4.1 + v6.4.2): the saved plan is reviewed before
  anything runs; a new `Review Focus` section names the inputs or failure modes
  the spec implies but no task's tests exercise; `No Placeholders` became
  `What a Step Contains` (test steps give assertions, code steps give the
  signature and file, verification steps give the command and its passing
  output), self-review gained a proportion check, and
  `plan-document-reviewer-prompt.md` is gone.
- **`brainstorming`** (v6.4.1): establish why your partner wants the thing
  before proposing features, reflect the intent back for correction, and tie
  approval to the actual design and planning stages.
- **Code review** (v6.4.1): reviewers judge behavior the spec is silent on by
  what a reasonable person would expect, plus a "Declined to judge" list the
  executor rules on; the `BASE_SHA` alternative is now
  `git merge-base origin/main HEAD`.
- **`test-driven-development`** (v6.4.1): the project's suite defines green, not
  just your test file; run the project's test command and report every failure
  by name.
- **`subagent-driven-development`** (v6.4.1): a workspace records its owning
  plan so same-basename plans stop colliding; `review-package` rejects empty or
  non-descendant ranges (exit 3).
- **Executable-bit fix** (v6.4.1): skill prose invokes bundled scripts through
  their interpreter (`bash scripts/foo.sh`, `node render-graphs.js`); this port
  extends that to the helpers `task-start` / `task-done` call each other with
  (Windows has no Unix exec bit at all).

## Porting notes (vs. upstream obra/superpowers)

- Namespace prefixes removed: `superpowers:brainstorming` → `brainstorming`
  (DSH skills are addressed by bare name).
- `using-superpowers` now documents the DSH `skill` tool and points at
  `skills/using-superpowers/references/dsh-tools.md`, a full Claude-Code →
  DSH tool mapping (`pwsh`, `subagent`, `workflow`, `goal`, ...). Upstream's
  per-harness reference list (Claude Code / Codex / Gemini / Copilot / Pi /
  Antigravity / Hermes / Muse) collapses to the DSH file; the other
  `references/*-tools.md` files are not shipped.
- Subagent references map to DSH's `subagent` / `subagent_fork`. Upstream's
  named agent (`superpowers:code-reviewer`) does not exist here; dispatch the
  skill's own prompt template instead.
- Upstream's `<SUBAGENT-STOP>` gate is not kept: DSH subagents must follow the
  skills too (an implementer subagent has to run TDD).
- Cross-harness paths become DSH paths: `~/.claude/skills/` →
  `$DSH_HOME/skills/`, `~/.superpowers/...` → `$DSH_HOME/...`
  (default `~/.dsh`).
- `diagnosing-superpowers` gains DSH session-storage facts
  (`$DSH_HOME/sessions/<cwd-slug>/session-<uuid>/session.*.jsonl.zstd`,
  concatenated zstd frames that need frame-by-frame decompression).
- `brainstorming`'s visual companion adds a Windows note: the Node server
  (`scripts/server.cjs`) runs everywhere; the `.sh` helpers are bash-only.
- `writing-skills/examples/CLAUDE_MD_TESTING.md` ships verbatim (an upstream
  example document that still uses Claude Code paths), so the reference from
  `testing-skills-with-subagents.md` does not dangle.

## Adding your own skills

`list()` discovers any `skills/<kebab-name>/SKILL.md` in the package — it must
start with a YAML frontmatter block (`name` + `description`, optionally
`whenToUse`). No code change needed.

Note that `skills/` is generated by the upstream sync: **re-running
`scripts/sync-from-upstream.mjs` rebuilds it wholesale**, so a skill dropped
there directly is deleted. Two safe places:

- `$DSH_HOME/skills/` (user level) or the project's `.dsh/skills/` — unrelated
  to this package and the least effort;
- or `port/overrides/<kebab-name>/SKILL.md` — copied into `skills/` on every
  sync, so it survives.

## License

MIT. Skill content adapted from
[obra/superpowers](https://github.com/obra/superpowers) (MIT), © Jesse Vincent
and contributors.

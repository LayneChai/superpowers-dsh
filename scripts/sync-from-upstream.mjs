#!/usr/bin/env node
/**
 * Sync `skills/` from an obra/superpowers checkout, re-applying this port's
 * DSH adaptations.
 *
 * The upstream skills are the source of truth for what a skill says. This
 * package is a port, so it ships a small, explicit, asserted set of deltas:
 *
 *   1. `port/overrides/**` are DSH-only files copied over the synced tree
 *      (currently `using-superpowers/references/dsh-tools.md`, which replaces
 *      the per-harness reference files upstream ships for Claude Code, Codex,
 *      Gemini, Copilot, Pi, Antigravity, Hermes and Muse).
 *   2. The transforms below rewrite upstream text that names another harness,
 *      another harness's home directory, or a bare script path.
 *   3. Every remaining `superpowers:` namespace prefix is stripped: the DSH
 *      skill registry addresses skills by bare name.
 *
 * Usage:
 *   node scripts/sync-from-upstream.mjs <path-to-superpowers-checkout>
 *   node scripts/sync-from-upstream.mjs .upstream/superpowers
 *
 * Get a checkout with:
 *   curl -L https://codeload.github.com/obra/superpowers/tar.gz/refs/tags/v7.0.0 \
 *     | tar -xz -C .upstream --transform 's,^[^/]*,superpowers,'
 *
 * A missing anchor fails the run loudly: upstream rewrote text this port
 * depends on, so a human must decide what the DSH wording becomes.
 *
 * @module scripts/sync-from-upstream
 */
import { rmSync } from 'node:fs'
import { cp, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const destSkills = join(pkgRoot, 'skills')
/** Staging tree: the destination is only replaced once every assertion passed. */
const stagingSkills = join(pkgRoot, '.skills-sync-tmp')
const overridesRoot = join(pkgRoot, 'port', 'overrides')

const UPSTREAM_SKILLS = [
  'brainstorming',
  'diagnosing-superpowers',
  'dispatching-parallel-agents',
  'executing-plans',
  'finishing-a-development-branch',
  'receiving-code-review',
  'requesting-code-review',
  'subagent-driven-development',
  'systematic-debugging',
  'test-driven-development',
  'using-git-worktrees',
  'using-superpowers',
  'verification-before-completion',
  'writing-plans',
  'writing-skills'
]

/** Per-harness reference files upstream ships that this port replaces with dsh-tools.md. */
const SKIP = [
  'using-superpowers/references/antigravity-tools.md',
  'using-superpowers/references/claude-code-tools.md',
  'using-superpowers/references/codex-tools.md',
  'using-superpowers/references/gemini-tools.md',
  'using-superpowers/references/hermes-tools.md',
  'using-superpowers/references/muse-tools.md',
  'using-superpowers/references/pi-tools.md'
]

const DSH_HOME = '$DSH_HOME'

/**
 * Explicit rewrites applied before the namespace strip. Each entry must match
 * exactly `expect` times, or the sync aborts.
 */
const TRANSFORMS = [
  {
    name: 'using-superpowers: drop the upstream subagent stop gate',
    file: 'using-superpowers/SKILL.md',
    find: '<SUBAGENT-STOP>\nIf you were dispatched as a subagent to execute a specific task, ignore this skill.\n</SUBAGENT-STOP>\n\n',
    replace: ''
  },
  {
    name: 'using-superpowers: DSH platform reference replaces the harness list',
    file: 'using-superpowers/SKILL.md',
    find: [
      'If your harness appears here, read its reference file for special instructions:',
      '',
      '- Claude Code: `references/claude-code-tools.md`',
      '- Codex: `references/codex-tools.md`',
      '- Pi: `references/pi-tools.md`',
      '- Antigravity: `references/antigravity-tools.md`',
      '- Hermes Agent: `references/hermes-tools.md`',
      '- Muse: `references/muse-tools.md`'
    ].join('\n'),
    replace: [
      'This package is the DeepSeek Harness port. Its platform reference is',
      '`references/dsh-tools.md`: the Claude-Code → DSH tool mapping plus the',
      'DSH-specific mechanisms these skills rely on (`skill`, `subagent` /',
      '`subagent_fork`, `workflow`, `goal`, and the Windows `pwsh` notes).',
      '',
      '## Invoking skills on DSH',
      '',
      'Call the `skill` tool with the exact skill name from the catalog before',
      'acting on a task that names or clearly matches that skill:',
      '',
      '- Load applicable skills FIRST, then follow their full instructions.',
      '- Skills are addressable by bare name: `brainstorming`, `writing-plans`,',
      '  `systematic-debugging`, `test-driven-development`, `using-git-worktrees`,',
      '  `subagent-driven-development`, `dispatching-parallel-agents`, and the rest.',
      '- `using-superpowers` itself is discoverable the same way.'
    ].join('\n')
  },
  // NOTE: upstream v7.0.0 rewrote brainstorming and now names its companion as
  // a bare `visual-companion.md` itself, so the old transform that rewrote
  // `skills/brainstorming/visual-companion.md` has been removed. Re-add one if
  // a future release regresses to the `skills/...` form.
  {
    name: 'brainstorming: DSH platform note for the visual companion',
    file: 'brainstorming/visual-companion.md',
    find: 'Browser-based visual brainstorming companion for showing mockups, diagrams, and options.\n',
    replace: [
      'Browser-based visual brainstorming companion for showing mockups, diagrams, and options.',
      '',
      '## Platform notes (DeepSeek Harness port)',
      '',
      'The companion server is `scripts/server.cjs` (plain Node.js, runs anywhere',
      'Node runs, including Windows). The `start-server.sh` / `stop-server.sh`',
      'helpers are bash-only: on Windows, start the server directly with',
      '`node scripts/server.cjs --project-dir <path> --open` and stop it by killing',
      'the process. All other guidance below is platform-neutral.',
      ''
    ].join('\n')
  },
  {
    name: 'executing-plans: DSH availability of subagents',
    file: 'executing-plans/SKILL.md',
    find: [
      '- You have a plan from superpowers:writing-plans and your human partner',
      '  chose inline execution at the handoff.',
      '- Your harness has no subagent tool (see the per-platform references in',
      '  `../using-superpowers/references/`). Never fabricate a dispatch; run',
      '  the plan here.'
    ].join('\n'),
    replace: [
      '- You have a plan from writing-plans and your human partner chose inline',
      '  (Native) execution at the handoff.',
      '- No subagent tool is available in this session, or your human partner',
      '  chose Native. On the DeepSeek Harness `subagent` / `subagent_fork`',
      '  normally ARE available (see `../using-superpowers/references/dsh-tools.md`),',
      '  so prefer subagent-driven-development; run the plan here when the work',
      '  must stay in one context. Never fabricate a dispatch.'
    ].join('\n')
  },
  {
    name: 'executing-plans: invoke sdd-workspace through bash',
    file: 'executing-plans/SKILL.md',
    find: '`../subagent-driven-development/scripts/sdd-workspace PLAN_FILE`',
    replace: '`bash ../subagent-driven-development/scripts/sdd-workspace PLAN_FILE`'
  },
  {
    name: 'executing-plans: invoke task-start through bash',
    file: 'executing-plans/SKILL.md',
    find: "Run this skill's `scripts/task-start PLAN_FILE N`.",
    replace: "Run this skill's `bash scripts/task-start PLAN_FILE N`."
  },
  {
    name: 'executing-plans: invoke task-done through bash',
    file: 'executing-plans/SKILL.md',
    find: 'Run this skill\'s `scripts/task-done PLAN_FILE N BASE -- <test command>`',
    replace: 'Run this skill\'s `bash scripts/task-done PLAN_FILE N BASE -- <test command>`'
  },
  {
    name: 'executing-plans: invoke review-package through bash',
    file: 'executing-plans/SKILL.md',
    find: 'Run `../subagent-driven-development/scripts/review-package PLAN_FILE MERGE_BASE HEAD`',
    replace: 'Run `bash ../subagent-driven-development/scripts/review-package PLAN_FILE MERGE_BASE HEAD`'
  },
  {
    name: 'executing-plans: task-start calls task-brief through bash',
    file: 'executing-plans/scripts/task-start',
    find: 'out=$("$sdd/task-brief" "$plan" "$n")',
    replace: 'out=$("${BASH:-bash}" "$sdd/task-brief" "$plan" "$n")'
  },
  {
    name: 'executing-plans: task-done calls sdd-workspace through bash',
    file: 'executing-plans/scripts/task-done',
    find: 'dir=$("$sdd/sdd-workspace" "$plan")',
    replace: 'dir=$("${BASH:-bash}" "$sdd/sdd-workspace" "$plan")'
  },
  {
    name: 'writing-skills: DSH skills directory replaces the cross-harness paths',
    file: 'writing-skills/SKILL.md',
    find: "**Personal skills live in your runtime's skills directory** (`~/.claude/skills/` on Claude Code) — see [codex-tools.md](../using-superpowers/references/codex-tools.md) or [gemini-tools.md](../using-superpowers/references/gemini-tools.md) for the path on those runtimes. Codex, Copilot CLI, and Gemini CLI all also recognize `~/.agents/skills/` as a cross-runtime alias.",
    replace: "**Personal skills live in your runtime's skills directory**: on the DeepSeek Harness, that is `" +
      DSH_HOME + "/skills/` (user level, discovered automatically by `skill-filesystem`), the project `.dsh/skills/` / " +
      '`.agents/skills/` roots, or — for packaged skills — the `skills/` directory inside a plugin bundle like this ' +
      'one. See [dsh-tools.md](../using-superpowers/references/dsh-tools.md) for the full mechanism.'
  },
  {
    name: 'subagent-driven-development: hook example uses the DSH home',
    file: 'subagent-driven-development/SKILL.md',
    find: 'You: "User level (~/.config/superpowers/hooks/)"',
    replace: 'You: "Install the hook at the user level (' + DSH_HOME + ')"'
  },
  {
    name: 'diagnosing-superpowers: case workspace lives under the DSH home',
    file: 'diagnosing-superpowers/SKILL.md',
    find: '`~/.superpowers/diagnosing-superpowers/<session-id>/`',
    replace: '`' + DSH_HOME + '/diagnosing-superpowers/<session-id>/`'
  },
  {
    name: 'diagnosing-superpowers: case template uses the DSH home',
    file: 'diagnosing-superpowers/templates/case.md',
    find: 'Workspace: ~/.superpowers/diagnosing-superpowers/<session-id>/',
    replace: 'Workspace: ' + DSH_HOME + '/diagnosing-superpowers/<session-id>/'
  },
  {
    name: 'diagnosing-superpowers: report template uses the DSH home',
    file: 'diagnosing-superpowers/templates/report.md',
    find: 'Report path: ~/.superpowers/diagnosing-superpowers/<session-id>/report.md',
    replace: 'Report path: ' + DSH_HOME + '/diagnosing-superpowers/<session-id>/report.md'
  },
  {
    name: 'diagnosing-superpowers: DSH session discovery facts',
    file: 'diagnosing-superpowers/references/session-discovery.md',
    find: 'limitation and ask for the missing path, export, or identifying detail.',
    replace: [
      'limitation and ask for the missing path, export, or identifying detail.',
      '',
      '## DeepSeek Harness',
      '',
      'Verified in this environment; confirm it against the records you actually read.',
      '',
      '- Transcripts: `' + DSH_HOME + '/sessions/<slugified-cwd>/session-<uuid>/session*.jsonl.zstd`',
      '  (`' + DSH_HOME + '` defaults to `~/.dsh`). The slug is the working directory with',
      '  separators and non-alphanumeric characters folded to `-`, wrapped in `--`.',
      '- Child sessions — work dispatched through `subagent` / `subagent_fork` — are',
      '  peer directories under the same slug whose header record carries',
      '  `delegationDepth: 1`.',
      '- The schema version is in the filename (`session.v4.jsonl.zstd`; older files',
      '  are `session.v3.jsonl.zstd` or `session.jsonl.zstd`). Read the header',
      "  record's `version` instead of guessing from the name.",
      '- Each file is a concatenation of independent zstd frames, and the `zstd` CLI',
      '  is usually absent. See `../using-superpowers/references/dsh-tools.md` for the',
      '  frame-by-frame Node decompression command.',
      '- Records are JSON lines carrying `type`, `seq`, `time`, and `data`. Establish',
      '  what each type means from the records themselves — never import a meaning',
      '  from another harness.'
    ].join('\n')
  }
]

const TEXT_EXTENSIONS = new Set(['.md', '.markdown', '.txt', '.js', '.cjs', '.mjs', '.ts', '.sh', '.dot', '.html'])

/** @returns {Promise<string[]>} repo-relative file paths under `root`. */
async function walk(root, current = root) {
  const out = []
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const full = join(current, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(root, full)))
    else out.push(relative(root, full).split(sep).join('/'))
  }
  return out
}

function isTextFile(rel) {
  const dot = rel.lastIndexOf('.')
  const slash = rel.lastIndexOf('/')
  if (dot <= slash) return true
  return TEXT_EXTENSIONS.has(rel.slice(dot))
}

function fail(message) {
  rmSync(stagingSkills, { recursive: true, force: true })
  console.error(`\n[FAIL] ${message}\n`)
  process.exit(1)
}

/** Apply every transform whose `file` matches, asserting the anchor exists. */
function applyTransforms(rel, text, applied) {
  for (const t of TRANSFORMS) {
    if (t.file !== rel) continue
    if (t.find === t.replace) continue
    const count = text.split(t.find).length - 1
    if (count === 0) fail(`anchor missing in ${rel} for "${t.name}"\n  find: ${JSON.stringify(t.find.slice(0, 120))}`)
    if (count > 1) fail(`anchor matched ${count} times in ${rel} for "${t.name}"`)
    text = text.replace(t.find, t.replace)
    applied.add(t.name)
  }
  return text
}

const upstreamArg = process.argv[2]
if (!upstreamArg) {
  console.error('usage: node scripts/sync-from-upstream.mjs <path-to-superpowers-checkout>')
  process.exit(2)
}
const upstreamRoot = resolve(upstreamArg)
const upstreamSkills = join(upstreamRoot, 'skills')

const upstreamStats = await stat(upstreamSkills).catch(() => null)
if (!upstreamStats?.isDirectory()) {
  fail(`no skills/ directory in ${upstreamRoot}`)
}

// A new (or removed) upstream skill must be a deliberate decision: it changes
// the skill catalog, the README tables, and possibly the DSH adaptations.
const upstreamSkillDirs = (await readdir(upstreamSkills, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()
if (upstreamSkillDirs.join('\n') !== [...UPSTREAM_SKILLS].sort().join('\n')) {
  const added = upstreamSkillDirs.filter((name) => !UPSTREAM_SKILLS.includes(name))
  const removed = UPSTREAM_SKILLS.filter((name) => !upstreamSkillDirs.includes(name))
  fail(
    'the upstream skill set changed — decide before syncing:\n' +
      (added.length > 0 ? `  added upstream:   ${added.join(', ')}\n` : '') +
      (removed.length > 0 ? `  removed upstream: ${removed.join(', ')}\n` : '') +
      '  Update UPSTREAM_SKILLS in this script and the README skill tables.'
  )
}

// Report the upstream version so the port can record it.
let upstreamVersion = 'unknown'
try {
  const manifest = JSON.parse(await readFile(join(upstreamRoot, '.claude-plugin', 'plugin.json'), 'utf8'))
  upstreamVersion = manifest.version ?? 'unknown'
} catch {
  /* version is informational only */
}

await rm(stagingSkills, { recursive: true, force: true })
await mkdir(stagingSkills, { recursive: true })

const upstreamFiles = await walk(upstreamSkills)
const applied = new Set()
let copied = 0
let stripped = 0

for (const rel of upstreamFiles) {
  if (SKIP.includes(rel)) continue
  const source = join(upstreamSkills, rel)
  const target = join(stagingSkills, rel)
  await mkdir(dirname(target), { recursive: true })

  if (!isTextFile(rel)) {
    await cp(source, target)
    copied++
    continue
  }

  let text = await readFile(source, 'utf8')
  text = applyTransforms(rel, text, applied)

  const namespaced = text.split('superpowers:').length - 1
  if (namespaced > 0) {
    text = text.replaceAll('superpowers:', '')
    stripped += namespaced
  }

  await writeFile(target, text, 'utf8')
  copied++
}

// DSH-only files replace upstream text wholesale.
for (const rel of await walk(overridesRoot)) {
  const target = join(stagingSkills, rel)
  await mkdir(dirname(target), { recursive: true })
  await cp(join(overridesRoot, rel), target)
  copied++
}

// Every transform that names a file must have fired; one that silently stopped
// matching would drop a DSH adaptation from the next release's sync.
const unfired = TRANSFORMS.filter((t) => t.find !== t.replace && !applied.has(t.name))
if (unfired.length > 0) {
  fail(`transform(s) never matched a copied file: ${unfired.map((t) => `${t.name} (${t.file})`).join('; ')}`)
}

// Everything applied: swap the staging tree in.
await rm(destSkills, { recursive: true, force: true })
await rename(stagingSkills, destSkills)

// Guard the recorded upstream version.
const pkg = JSON.parse(await readFile(join(pkgRoot, 'package.json'), 'utf8'))
const recorded = pkg.dsh?.superpowersUpstream
if (recorded !== `v${upstreamVersion}`) {
  console.warn(
    `[warn] package.json records dsh.superpowersUpstream="${recorded}" but the checkout is "v${upstreamVersion}".\n` +
      '       Update package.json and the READMEs after reviewing the diff.'
  )
}

console.log(`synced ${copied} files from obra/superpowers v${upstreamVersion} into skills/`)
console.log(`  namespace prefixes stripped: ${stripped}`)
console.log(`  transforms applied: ${applied.size}`)
console.log(`  dsh-only overrides copied from port/overrides/`)

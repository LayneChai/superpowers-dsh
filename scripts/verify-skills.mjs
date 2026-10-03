#!/usr/bin/env node
/**
 * Verify the bundled skills the way the DSH registry consumes them.
 *
 *   node scripts/verify-skills.mjs
 *
 * Checks:
 *   1. `lib/index.js` registers a provider that `list()`s every
 *      `<name>/SKILL.md` and `get()`s a full definition for each candidate.
 *   2. Frontmatter parses, `name` matches its directory, `description` is set.
 *   3. No upstream `superpowers:` namespace prefix survived the port.
 *   4. Every relative markdown link and every referenced `scripts/...` or
 *      `references/...` path points at a file that ships in this package.
 *
 * Exits non-zero listing every offender.
 *
 * @module scripts/verify-skills
 */
import { readFile, readdir, stat } from 'node:fs/promises'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const skillsRoot = join(pkgRoot, 'skills')

/** Names that appear only as illustrative examples in prose, never as real files. */
const ILLUSTRATIVE = new Set(['scripts/tool.sh', 'scripts/tool.js', 'scripts/helper.py', 'scripts/helper.sh'])

const problems = []
const fail = (message) => problems.push(message)

// ---- 1 & 2: drive the real provider -----------------------------------------
const mod = await import(new URL('../lib/index.js', import.meta.url))
let provider
const ctx = {
  skills: {
    registerProvider(factory) {
      provider = factory({})
    }
  }
}
mod.apply(ctx)
if (!provider) throw new Error('apply() did not register a provider')

const candidates = await provider.list({})
if (candidates.length === 0) fail('provider.list() returned no skills')

const seen = new Set()
for (const candidate of candidates) {
  if (seen.has(candidate.name)) fail(`duplicate skill name: ${candidate.name}`)
  seen.add(candidate.name)

  const dir = candidate.path.slice(0, -'/SKILL.md'.length)
  const dirName = dir.split(sep).pop()
  if (candidate.name !== dirName) fail(`${dirName}: frontmatter name "${candidate.name}" != directory name`)
  if (!candidate.description) fail(`${candidate.name}: empty description`)

  const definition = await provider.get(candidate, {})
  if (!definition) fail(`${candidate.name}: provider.get() returned nothing`)
  else {
    if (!definition.content?.trim()) fail(`${candidate.name}: empty body`)
    if (definition.resourceBase?.kind !== 'directory') fail(`${candidate.name}: no directory resourceBase`)
  }
}

// ---- 3 & 4: lint the files on disk -------------------------------------------
async function walk(current) {
  const out = []
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const full = join(current, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(full)))
    else out.push(full)
  }
  return out
}

const files = await walk(skillsRoot)
const allPaths = files.map((f) => relative(skillsRoot, f).split(sep).join('/'))
const exists = async (p) => Boolean(await stat(p).catch(() => null))

/** Map every line inside a ``` fence to an empty line so examples are not linted. */
function blankFences(text) {
  let fenced = false
  return text
    .split('\n')
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        fenced = !fenced
        return ''
      }
      return fenced ? '' : line
    })
    .join('\n')
}

/**
 * Resolve a path a skill body mentions. Prose addresses files relative to the
 * file that mentions them, relative to the skill root, or by an unambiguous
 * name elsewhere in the tree (a skill explaining another skill's helper).
 */
async function resolveRef(file, target) {
  const skillRoot = resolve(dirname(file), '..')
  const direct = [resolve(dirname(file), target), resolve(skillRoot, target)]
  for (const candidate of direct) {
    if (await exists(candidate)) return candidate
  }
  if (/^(scripts|references)\//.test(target)) {
    const name = basename(target)
    const hits = allPaths.filter((p) => p.split('/').pop() === name)
    if (hits.length > 0) return hits[0]
  }
  return null
}

for (const file of files) {
  const rel = relative(skillsRoot, file).split(sep).join('/')
  if (!/\.(md|markdown)$/i.test(rel)) continue
  const text = blankFences(await readFile(file, 'utf8'))

  // The mapping tables in references/ quote the upstream namespace on purpose.
  const checkNamespace = !rel.startsWith('using-superpowers/references/')
  for (const [index, line] of text.split('\n').entries()) {
    if (checkNamespace && line.includes('superpowers:')) {
      fail(`${rel}:${index + 1}: upstream namespace prefix survived: ${line.trim().slice(0, 80)}`)
    }

    for (const match of line.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
      const target = match[1]
      if (/^[a-z]+:|^#|^mailto:/.test(target)) continue
      if (!(await resolveRef(file, target))) fail(`${rel}:${index + 1}: link target does not ship: ${target}`)
    }

    for (const match of line.matchAll(/`((?:\.\.\/)*(?:scripts|references)\/[A-Za-z0-9._-]+)/g)) {
      const target = match[1]
      if (ILLUSTRATIVE.has(target)) continue
      if (!(await resolveRef(file, target))) fail(`${rel}:${index + 1}: referenced path does not ship: ${target}`)
    }
  }
}

// ---- report ------------------------------------------------------------------
if (problems.length > 0) {
  console.error(`verify-skills: ${problems.length} problem(s)\n`)
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}

console.log(`verify-skills: OK — ${candidates.length} skills registered, ${files.length} files checked`)
for (const candidate of candidates.sort((a, b) => a.name.localeCompare(b.name))) {
  console.log(`  ${candidate.name}`)
}

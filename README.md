<div align="center">

[English](README.en.md) | **简体中文**

</div>

<div align="center">

![superpowers-dsh](static/home.png)

</div>

# superpowers-dsh

为 **DeepSeek Harness (DSH)** 打造的 Superpowers 插件包：把
[obra/superpowers](https://github.com/obra/superpowers) 的核心技能
（Claude-Code 技能库：TDD、调试、规划、协作模式）移植到 DSH 的 Cordis
插件架构上。

插件会向 `ctx.skills` 注册表的 **host 层** 注册一个技能提供者，因此每个
agent preset 的作用域链都会合并这些技能。技能正文随包分发
（`skills/<name>/SKILL.md`），通过 `import.meta.url` 定位——这是包的
组装事实，不需要任何用户配置。

## 目录

- [在 DeepSeek Harness 中安装与使用](#在-deepseek-harness-中安装与使用)
- [DSH 版本兼容性](#dsh-版本兼容性)
- [技能列表](#技能列表)
- [工作原理](#工作原理)
- [上游同步](#上游同步)
- [移植说明](#移植说明)
- [添加自己的技能](#添加自己的技能)
- [许可证](#许可证)

## 在 DeepSeek Harness 中安装与使用

这是 DeepSeek Harness 的**插件包**。安装后会把下面的 15 个技能注册进
host 技能注册表，你 profile 里的每个 agent 会话都能在技能目录中看到它们，
并可用 `skill` 工具加载。技能内容同步自上游 **obra/superpowers v7.0.1**。

### 最简单：一条命令

不需要先全局安装 `dsh`，在任意目录执行：

```sh
npx @deepseek-ai/dsh plugin --profile web add github:LayneChai/superpowers-dsh
```

装完后重启 `npx @deepseek-ai/dsh web`（或 `dsh web`），刷新浏览器即可。

### 最推荐：直接让 DeepSeek Harness 帮你安装

打开 DeepSeek Harness（Web 界面），新建对话，把下面这句话发给它：

```
帮我安装这个链接里边的插件：https://github.com/LayneChai/superpowers-dsh
```

Agent 会自动完成安装（`dsh plugin --profile web add` → 重启 profile →
验证技能注册），无需你手动敲任何命令。装完后你可以在对话里让它运行
`dsh --profile web --dump-config`，确认输出里有 `superpowers-dsh` 行。

### 从 npm 安装（推荐，一条命令）

包已发布到 npm，名为 `superpowers-dsh`（国内会自动同步到 npmmirror 镜像）：

```sh
dsh plugin --profile web add superpowers-dsh
```

> 必须用 `dsh plugin` 形式——直接 `npm install superpowers-dsh` 只会把包当
> 普通库装到当前目录，**不会**注册进任何 DeepSeek Harness profile，技能
> 永远不会被加载。

### 从 GitHub 安装

```sh
# 任意目录下执行
dsh plugin --profile web add https://github.com/LayneChai/superpowers-dsh.git
```

### 从 tarball 或本地文件夹安装

```sh
# tarball（例如 Release 里的 superpowers-dsh-0.1.0.tgz）
dsh plugin --profile web add C:\路径\to\superpowers-dsh-0.1.0.tgz

# 或解压后的插件文件夹（pnpm 以链接方式安装，改完重启即生效）
dsh plugin --profile web add C:\路径\to\superpowers-dsh
```

### 重启并验证

bundle 层在 profile 启动时挂载，所以需要**重启 profile**（停掉后重新运行
`dsh web` / `npx @deepseek-ai/dsh web`，再刷新浏览器）。确认层已组合：

```sh
dsh --profile web --dump-config     # 必须出现 `superpowers-dsh` 行
```

之后技能会出现在 agent 技能目录中（`using-superpowers` 是入口技能），
可以用 `skill` 工具加载。

安装成功后的界面如下：

![安装成功截图](static/install-success.png)

### 在其他 profile（headless / tui / 自定义）中使用

把 `--profile` 指向你实际运行的 profile：

```sh
dsh plugin --profile headless add superpowers-dsh
dsh --profile headless --dump-config
```

### 卸载

```sh
dsh plugin --profile web remove superpowers-dsh
# 卸载后同样需要重启 profile
```

### 注意事项

- 国内用户可以先把 npm 镜像设为 npmmirror，让 `dsh plugin add
  superpowers-dsh` 更快：`npm config set registry https://registry.npmmirror.com`
- 从文件夹或 `file:` 规格安装的插件是链接安装（不是复制）：修改该文件夹后，
  下次重启 profile 生效
- 使用者**不需要 npm 账号，也不需要 2FA**——安装只是普通的包下载

## DSH 版本兼容性

**结论：与 npm 上已发布的全部 DSH 版本兼容；已在 DSH `0.2.0-rc.2`（当前 `latest`）上端到端实跑验证。无已知不兼容问题。**

核对日期 2026-10-03，npm 发布通道：`latest` = `next` = `0.2.0-rc.2`，`alpha` = `0.2.1-alpha.1`。

### 支持矩阵

| 检查项 | 结果 |
| --- | --- |
| 插件依赖的 DSH 接口 | ① `ctx.skills.registerProvider(...)`（技能提供者注册）② `dsh.bundle.patch`（bundle 挂载自己的 `cordis.patch.yml`） |
| 已发布版本数 | 承载接口的两个包 `@deepseek-ai/dsh-skill` 与 `@deepseek-ai/dsh-app-boot` 各 **31 个已发布版本** |
| 逐版本核对结果 | **31 / 31 全部一致**，从最早的 `0.0.1-rc.1` 到最新的 `0.2.1-alpha.1`，接口签名与语义均未变 |
| 端到端实跑 | 把 `lib/index.js` 挂进本机 DSH `0.2.0-rc.2` 的**真实 `SkillRegistry`**：`list()` 返回 15 个技能，逐个 `get()` 都能取到正文与 `resourceBase` |
| 插件自身版本 | `0.4.0`（技能内容同步自 obra/superpowers `v7.0.1`） |
| 运行时依赖 | 无。只用 Node 内置模块，不引入任何第三方依赖，因此不受 DSH 依赖树变化影响 |
| Node.js | 本机验证 `v22.22.2`；DSH 自身未声明 `engines`，本插件也未限制 |

### 已知兼容性说明

- **无已知不兼容问题。** 上游 DSH 从 `0.1.7-rc.2` 起加入插件兼容性闸门
  `evaluatePluginCompatibility`：它**只检查插件自己声明的 `@deepseek-ai/dsh*`
  peerDependencies**，范围不满足就把整个 bundle 跳过并报错。本插件不声明任何
  peerDependencies，因此这道闸门**不会拦截它**（同时它也意味着 DSH 不会替你校验版本，
  所以升级 DSH 后建议跑一次下面的复核命令）。
- **同名技能的优先级是有意选择**：插件以 `PACKAGED_SKILL_RANK = 550` 注册，DSH 内置
  bundled 根为 `BUNDLED_SKILL_RANK = 600`（数值越小越优先），所以**同名时你自己的技能
  会覆盖本插件的同名技能**。DSH 内置技能里没有与本插件重名的技能。
- **Windows 提示**：技能正文里的 bash 辅助脚本需要 Git for Windows（Git Bash）；Node
  脚本（`server.cjs`、`render-graphs.js`）全平台可用。技能正文已按"经解释器调用"
  （`bash scripts/...`）编写，不依赖 Unix 可执行位。
- 安装方式不影响兼容性：npm 包、GitHub 源、本地目录链接三种安装方式加载的是同一份
  bundle 声明。

### 兼容性怎么复核

一条命令，对着**你本机安装的** DSH 复跑上面全部检查（包括真实注册表挂载）：

```sh
node scripts/check-dsh-compat.mjs
# 也可指定别的 node_modules，或用 $DSH_NODE_MODULES
node scripts/check-dsh-compat.mjs D:\path\to\profile\node_modules
```

本机实测输出：

```
dsh SDK      : @deepseek-ai/dsh-skill 0.2.0-rc.2
mounted      : 15 skills listed and read through the real SkillRegistry
rank         : PACKAGED_SKILL_RANK=550 is below BUNDLED_SKILL_RANK=600

check-dsh-compat: OK — this plugin matches the installed DSH SDK
```

它依次检查：SDK 是否存在及版本 → 已安装 SDK 的类型声明里是否仍声明本插件实现的接口
（`registerProvider`、`SkillProvider.list/get`、`SkillCandidate`、`SkillResourceBase`、
`'custom'` 来源桶）→ 把 `lib/index.js` 真的挂进 `SkillRegistry` 并逐个读回 →
比较 rank 关系。任一项不成立就 `exit 1`，并指出具体是哪条契约变了。

在**没有安装 DSH 的机器**上（例如 CI、干净容器）没有可比对的对象，它会打印
`SKIPPED` 并 `exit 0`——这是"没检查"，不是"检查失败"（发布流程因此不会被误拦）。
显式传目录或以 `--require` 运行时，找不到 SDK 仍按错误处理。想强制要求先装 SDK：
`DSH_COMPAT_REQUIRE=1 node scripts/check-dsh-compat.mjs`。

> 结论以**验证时的 DSH 版本**为准。如果你跑的是更新的 DSH，先跑一遍上面的命令；
> 上游一旦改动技能接口，它会立刻报出具体变化，而不是等到技能悄悄消失。

## 技能列表

| 技能 | 用途 |
| --- | --- |
| `using-superpowers` | 如何查找和使用技能；入口技能 |
| `brainstorming` | 动手前先问清「你到底想要什么、为什么」，理解后再定规模和做法 |
| `writing-plans` | 根据规格编写全面的实施计划 |
| `executing-plans` | 本会话内（Native/内联）执行计划，末尾一次整分支评审 |
| `subagent-driven-development` | 每个任务派发全新子代理并评审 |
| `dispatching-parallel-agents` | 把独立工作扇出到并行代理 |
| `systematic-debugging` | 先找根因的调试纪律 |
| `test-driven-development` | RED-GREEN-REFACTOR 实施循环 |
| `verification-before-completion` | 声称成功前先拿出证据 |
| `requesting-code-review` | 合并前获得严格评审 |
| `receiving-code-review` | 核实反馈，而不是盲目照做 |
| `finishing-a-development-branch` | 安全地整合已完成的工作 |
| `using-git-worktrees` | 功能开发的隔离工作区 |
| `writing-skills` | 以 TDD 方式编写并验证新技能 |
| `diagnosing-superpowers` | 会话出问题时读磁盘上的 transcript，带 `path:line` 取证复盘 |

## 工作原理

- **Bundle 层** —— `cordis.patch.yml` 在 dsh-base 层之上插入一行
  （`- id: superpowers-dsh, name: superpowers-dsh`）。后面的层（profile 的
  `cordis.patch.yml`、`--patch` 叠加）仍可按 id 定位这一行。
- **提供者** —— `lib/index.js` 调用 `ctx.skills.registerProvider(...)`，
  注册一个提供者：
  - `list()` 扫描包内 `skills/` 目录，把每个 `<name>/SKILL.md` 作为候选，
    从 YAML frontmatter 解析出 `name`、`description`、`whenToUse`。
  - `get()` 按需读取候选技能正文，返回完整技能定义，`resourceBase` 指向
    技能所在目录，使相对引用（脚本、提示模板）可以正确解析。
- **零运行时依赖** —— 插件只使用 Node 内置模块，消费注入的 `ctx.skills`
  服务接口。

## 上游同步

当前同步的上游版本：**obra/superpowers v7.0.1**（见 `package.json` 的
`dsh.superpowersUpstream`）。

`skills/` 是**生成产物**，不要手改。同步逻辑写在两个地方，改它们再重跑即可：

- `scripts/sync-from-upstream.mjs` —— 拉上游技能树 + 重放所有 DSH 适配
  （每条适配都是一个带断言的字符串改写，上游一旦改了原文就**直接报错**，
  不会静默丢适配）。
- `port/overrides/` —— 只属于 DSH 的文件（`using-superpowers/references/dsh-tools.md`），
  覆盖到同步结果上。

```sh
# 1. 取上游对应版本的源码（git 协议在部分网络不可用，走 codeload）
mkdir -p .upstream/superpowers
curl -L https://codeload.github.com/obra/superpowers/tar.gz/refs/tags/v7.0.1 \
  | tar -xz -C .upstream/superpowers --strip-components=1

# 2. 重放同步
node scripts/sync-from-upstream.mjs .upstream/superpowers

# 3. 校验（provider 能列出全部技能、frontmatter 合法、没有悬空引用）
node scripts/verify-skills.mjs

# 4. 兼容性（对着本机安装的 DSH 真实 SDK 复跑契约与挂载检查）
node scripts/check-dsh-compat.mjs
```

本次同步带来的上游变更（**v7.0.1**，2026-10-21；技能数仍为 15 个，文件 68 → 78）：

- **`brainstorming` 按反馈重新调音**（#2560 / #2571）：v7.0.0 那套「开场先问
  要不要跳过提问，再问一个泛泛的『你什么时候最想要它』」被用户吐槽像模板，
  v7.0.1 改掉了两件事 —— ①**先摸上下文再开口**：有项目、有 spec/plan/文件时，
  第一句话之前先读它们，已经写在里面的不再问；②**问题接着你的答案走**：你说清
  需求后，它先把你说的话连同项目里查到的东西**复述**一遍，只问那一个还没定的
  点，后面的问题建立在你的回答和它的发现之上，并说明「这个答案会改变什么」。
  「要不要跳过提问」现在**只在你没点名要 brainstorming 时才提供**；显式点名或
  `/brainstorming` 调用时不再多问一遍。
- **设计文档不再被跳过**：明确要求「先说两三种做法＋推荐一种让你挑，然后写设计
  文档，你批准之前不动手」。上游实测：改之前 24/24 次跳过文档直接开工，改之后
  3/24。
- **三个长技能为「压缩后仍可存活」而拆分**（#2563 / #2564 / #2565，起因 #2481）：
  Claude Code 在压缩后会把每个技能在 **20,000 字符处截断**，超出的部分整个会话
  都不再存在 —— 有会话里 `subagent-driven-development` 因此丢了「最多 5 轮修复」
  的限制，在一个任务上跑了 18 轮。
  - `subagent-driven-development`：把修复循环、最终评审、报告处理、续跑、
    preflight、分批、无法验证等内容移到 **`references/`**（7 个新文件），用到哪
    一步再读哪个文件。**SKILL.md 32,510 → 19,470 字节。**
  - `writing-skills`：把支撑文档、SKILL.md 模板与发现机制、bulletproofing、
    flowchart 约定移到 `references/`（新增 `discovery.md`、`bulletproofing.md`、
    `flowcharts.md`，其余是原文件重命名进 `references/`）。
    **26,615 → 16,754 字节。**
  - `executing-plans`：删掉与上文规则重复的 Example Workflow。
    **20,454 → 18,164 字节。**
  - 上游同时加了 `tests/skill-size/test-skill-size.sh`，任何 `SKILL.md` 达到
    20,000 字节即失败。本 port 现在 15 个 SKILL.md **全部低于 20,000 字节**
    （最大的是 `subagent-driven-development` 19,470）。
- **与 DSH 无关的部分**：issue / PR 模板改为要求「谁提的、你的人类伙伴原本要什么、
  200 字以内由人写的摘要」（#2569），`diagnosing-superpowers` 跟着加这两节并改用
  Bug Report 模板，`docs/superpowers/plans/` 下 18 份历史计划文档被删除。这些都在
  `skills/` 之外，不进本 port 的产物。

> **给 DSH 的适配**：v7.0.1 把 `writing-skills/references/CLAUDE_MD_TESTING.md`
> 重命名进了 `references/`，这个文件也随之进入发布产物。它整篇是拿来测「技能文档
> 怎么写才容易被发现」的场景稿，里面 14 处让 agent 去 `~/.claude/skills/` 找技能 ——
> 在 DSH 上那个目录不存在，场景就测不出东西。同步脚本因此新增一条 `sweep` 改写，
> 把它统一换成 `$DSH_HOME/skills/`。

上一版（**v7.0.0**，2026-10-10）的上游变更，保留备查：

- **`brainstorming` 完全重写**（#2463 / #2482 / #2483）：先在第一条消息里说明
  「可以跳过提问直接开工」，然后问一个开放式问题让你描述真实场景；边聊边把
  理解**分块复述**回来（约 200–300 字）让你纠正；理解清楚后再用大白话
  **定规模**（直接做 / 聊两句就动手 / 写设计文档），你可以否决；会主动确认
  哪些「怎么做」的选择你想自己拿主意（平台、语言、库、媒介），你交出去它就
  选合理默认值并说明。
- **设计文档的评审换成 builder check**：**新增**
  `skills/brainstorming/builder-check-prompt.md`，派一个全新子代理以「要动手
  建它的人」的视角读设计、列出还需要问什么；**删除**
  `skills/brainstorming/spec-document-reviewer-prompt.md`（旧 spec reviewer 被
  取代）。问出来的问题只回一轮。
- **`subagent-driven-development` 的 `scripts/sdd-workspace`**：不再每次覆盖
  仓库自己的 `.superpowers/sdd/.gitignore`（只在文件不存在时写默认值）；
  Windows/Git Bash 下计划标记保持**仓库相对路径**（原先会记成机器绝对路径）。
- **`executing-plans` 的 `scripts/task-done`**：测试命令**静默通过**（无输出）
  时现在也写 ledger，记为 `→ (no output)`；以前 `grep|tail` 返回非零会 exit 1，
  让已完成的任务看起来没完成。
- **`requesting-code-review`**：示例里的 base-SHA 命令改用 `cut -d' ' -f1`，
  因为 Claude Code 会把技能正文里的 `$1` 替换成调用参数。
- **`systematic-debugging`**：多层诊断示例不再把要检查的密钥**值**打进日志。
- **视觉伴侣 `scripts/server.cjs`**：修掉 `String.replace` 把 `$'`、`$&` 当
  替换模式的问题，现在按字面量插入内容。
- 其余为 Antigravity / Hermes / Claude Code hooks 相关修复，DSH 没有 hook
  系统，不适用本 port。

## 移植说明

- 去掉了命名空间前缀：`superpowers:brainstorming` → `brainstorming`
  （DSH 技能用裸名称寻址）。
- `using-superpowers` 现在介绍 DSH 的 `skill` 工具，并指向
  `skills/using-superpowers/references/dsh-tools.md`——完整的
  Claude-Code → DSH 工具映射（`pwsh`、`subagent`、`workflow`、`goal` ...）。
  上游那份“按 harness 选参考文件”的清单（Claude Code / Codex / Gemini /
  Copilot / Pi / Antigravity / Hermes / Muse）只保留 DSH 一份，其余上游
  `references/*-tools.md` 不随包分发。
- 子代理引用映射到 DSH 的 `subagent` / `subagent_fork`；上游的命名 agent
  （`superpowers:code-reviewer`）在 DSH 不存在，按技能自带的 prompt 模板派发。
- `using-superpowers` 里的 `<SUBAGENT-STOP>` 不再保留：DSH 的子代理同样需要
  遵守技能（实现者子代理必须走 TDD）。
- 跨 harness 的路径改成 DSH 路径：`~/.claude/skills/` → `$DSH_HOME/skills/`，
  `~/.superpowers/...` → `$DSH_HOME/...`（默认 `~/.dsh`）。
- `diagnosing-superpowers` 补了 DSH 的会话存储事实
  （`$DSH_HOME/sessions/<cwd-slug>/session-<uuid>/session.*.jsonl.zstd`，
  多 zstd frame 拼接，需按 frame 解压）。
- `brainstorming` 的视觉伴侣补充了 Windows 说明：Node 服务
  （`scripts/server.cjs`）全平台可跑；`.sh` 辅助脚本仅限 bash。
- `brainstorming` 在 v7.0.0 重写后，上游正文已直接写 `visual-companion.md`
  这个裸相对名，所以本 port 原先那条「把 `skills/brainstorming/...` 改写成
  裸相对名」的适配已删除（同步脚本里留有 NOTE，若上游将来回退再加回）。
- `writing-skills/references/CLAUDE_MD_TESTING.md` 随 v7.0.1 的重命名进入发布
  产物（原先在 `examples/` 下，上游一直没把它当正文看）。它整篇是「技能文档
  怎么写才容易被 agent 发现」的测试场景稿，所以保留；但里面 14 处让 agent 去
  `~/.claude/skills/` 找技能，在 DSH 上那个目录不存在、场景就测不出东西，
  因此同步脚本用一条 `sweep` 改写统一换成 `$DSH_HOME/skills/`。同一文件里
  `~/.claude/CLAUDE.md` 这类**历史出处**描述不改（那是事实记录，不是指令）。

## 添加自己的技能

`list()` 会自动发现包里任何 `skills/<kebab-name>/SKILL.md`——只要它以 YAML
frontmatter 开头（`name` + `description`，可选 `whenToUse`），无需改代码。

注意：`skills/` 是上游同步的生成目录，**重跑 `scripts/sync-from-upstream.mjs`
会整体重建它**，直接放进去的自建技能会被删掉。两个安全位置：

- 放到 `$DSH_HOME/skills/`（用户级）或项目的 `.dsh/skills/` —— 与插件无关，
  最省事；
- 或者放进 `port/overrides/<kebab-name>/SKILL.md` —— 同步时会被复制进
  `skills/`，因此不会被清掉。

## 许可证

MIT。技能内容改编自
[obra/superpowers](https://github.com/obra/superpowers)（MIT），© Jesse Vincent
及贡献者。

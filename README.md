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

## 在 DeepSeek Harness 中安装与使用

这是 DeepSeek Harness 的**插件包**。安装后会把下面的 15 个技能注册进
host 技能注册表，你 profile 里的每个 agent 会话都能在技能目录中看到它们，
并可用 `skill` 工具加载。技能内容同步自上游 **obra/superpowers v6.4.2**。

### 前置条件

- 已安装 DeepSeek Harness，并且有 **pnpm** —— `dsh plugin` 命令内部调用
  pnpm（用 `pnpm --version` 检查；没有的话到 https://pnpm.io 安装）
- `dsh` 命令行。它随 Harness 一起提供，通常以 `npx @deepseek-ai/dsh web`
  方式启动，所以只在该命令的进程内可用。要么把它装成全局命令，要么在下面
  所有命令前加 `npx`：

  ```sh
  # 方式一：全局安装 dsh，永久可用（推荐）
  npm install -g @deepseek-ai/dsh
  dsh --version

  # 方式二：不安装，所有命令用 npx 形式
  npx @deepseek-ai/dsh --version
  ```

  下文所有 `dsh ...` 示例都可以等价写成 `npx @deepseek-ai/dsh ...`。

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

## 技能列表

| 技能 | 用途 |
| --- | --- |
| `using-superpowers` | 如何查找和使用技能；入口技能 |
| `brainstorming` | 通过协作对话把想法变成设计 |
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

## 上游同步（当前：obra/superpowers v6.4.2）

`skills/` 是**生成产物**，不要手改。同步逻辑写在两个地方，改它们再重跑即可：

- `scripts/sync-from-upstream.mjs` —— 拉上游技能树 + 重放所有 DSH 适配
  （每条适配都是一个带断言的字符串改写，上游一旦改了原文就**直接报错**，
  不会静默丢适配）。
- `port/overrides/` —— 只属于 DSH 的文件（`using-superpowers/references/dsh-tools.md`），
  覆盖到同步结果上。

```sh
# 1. 取上游对应版本的源码（git 协议在部分网络不可用，走 codeload）
mkdir -p .upstream/superpowers
curl -L https://codeload.github.com/obra/superpowers/tar.gz/refs/tags/v6.4.2 \
  | tar -xz -C .upstream/superpowers --strip-components=1

# 2. 重放同步
node scripts/sync-from-upstream.mjs .upstream/superpowers

# 3. 校验（provider 能列出全部技能、frontmatter 合法、没有悬空引用）
node scripts/verify-skills.mjs
```

本次同步带来的上游变更：

- **新增技能 `diagnosing-superpowers`**（v6.4.1）：会话跑歪之后，定位并读取
  磁盘上的 transcript，逐条给出 `path:line` 证据复盘；按需生成脱敏 bundle 或
  GitHub issue 草稿。DSH 侧的 transcript 位置与解压方式已写进
  `skills/diagnosing-superpowers/references/session-discovery.md` 和
  `skills/using-superpowers/references/dsh-tools.md`。
- **`executing-plans` 重写为 Native（内联）执行**（v6.4.1）：不再每三个任务
  停一次让你确认；整个计划自己执行完，末尾只做**一次**整分支评审。共享
  SDD 的 workspace 与 ledger，新增 `scripts/task-start` / `scripts/task-done`
  两个辅助脚本。
- **`writing-plans`**（v6.4.1 + v6.4.2）：计划存盘后必须先给你看过再执行；
  新增 `Review Focus` 段（规格暗示但任务测试没覆盖的 5 类输入/失效模式）；
  `No Placeholders` 换成 `What a Step Contains`（测试步给断言、代码步给签名
  与文件、验证步给命令与通过输出），自审增加“篇幅比例”检查；删除
  `plan-document-reviewer-prompt.md`。
- **`brainstorming`**（v6.4.1）：先弄清“你为什么想要这个”，把你的意图复述
  回去待纠正，并把审批绑定到实际的设计/计划阶段。
- **代码评审**（v6.4.1）：规格没写的输入按“合理使用者会预期什么”判定，新增
  “Declined to judge”清单由执行方逐条裁定；`BASE_SHA` 备用写法改为
  `git merge-base origin/main HEAD`。
- **`test-driven-development`**（v6.4.1）：绿的标准是**项目整套测试**，不只是
  你写的那一个文件；跑项目测试命令并按名字上报每一个失败。
- **`subagent-driven-development`**（v6.4.1）：workspace 记录归属计划，同名
  计划不再互相覆盖；`review-package` 拒绝空区间或非后代区间（exit 3）。
- **可执行位修复**（v6.4.1）：技能正文里的脚本改为经解释器调用
  （`bash scripts/foo.sh`、`node render-graphs.js`），本 port 把
  `task-start` / `task-done` 内部的脚本互相调用也一并补齐（Windows 没有
  Unix 可执行位）。

## 移植说明（对比上游 obra/superpowers）

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
- `writing-skills/examples/CLAUDE_MD_TESTING.md` 原样保留（上游示例文档，
  里面仍是 Claude Code 路径），只为让 `testing-skills-with-subagents.md`
  的引用不断链。

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

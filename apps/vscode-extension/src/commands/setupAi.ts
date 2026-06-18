import { applyEdits, modify, parse, type ParseError } from "jsonc-parser";
import * as vscode from "vscode";

/**
 * 「Set up AI」コマンド。
 *
 * ワークスペースの AI エージェントが `.jis.json` を正しく生成・編集できるよう、
 * ガイド／スキーマと各エージェント用のアダプタ（Skill / rules / instructions）、
 * および MCP サーバー設定を配置する。
 *
 * 設計方針（docs/03_ai-integration/setup_ai_design.md, mcp_design.md）:
 * - 正本は `.jiscribe/`（ai-guide.md ＋ jiscribe.schema.json）に 1 部だけ置く。
 * - 各エージェントの own-file アダプタは `.jiscribe/` を参照する薄いポインタにする。
 * - MCP 設定（.mcp.json 等）は jsonc-parser で `jiscribe` キーのみを外科的にマージする
 *   （コメント・整形・他サーバー定義を温存）。
 * - 我々が生成するファイルのみ上書きし、ユーザー管理ファイル（CLAUDE.md / .gitignore 等）には一切触れない。
 */

// MCP サーバーの起動コマンド。
// NOTE: `@jiscribe/mcp` は未公開。npm 公開後にこの設定がそのまま動く（mcp_design.md §8）。
const MCP_SERVER_NAME = "jiscribe";
const MCP_COMMAND = "npx";
const MCP_ARGS = ["-y", "@jiscribe/mcp"];

// 生成ファイルであることを示すヘッダ（手編集を促さない）。
const GENERATED_NOTICE =
	"<!-- Generated and managed by the Jiscribe extension's “Set up AI” command. Manual edits are overwritten on re-run. -->";

// 各アダプタ共通の本文（frontmatter を除く）。実体は `.jiscribe/` に委ねる。
const ADAPTER_INSTRUCTION = `When generating or editing Jiscribe diagram data (\`.jis.json\` / \`.jiscribe.json\`), always follow this:

- Notation and rules: read \`.jiscribe/ai-guide.md\` at the workspace root.
- For the full field-level specification, refer to \`.jiscribe/jiscribe.schema.json\`.
`;

/** Claude Code Skill: .claude/skills/jiscribe/SKILL.md */
const CLAUDE_SKILL = `---
name: jiscribe
description: Use when creating or editing Jiscribe .jis.json canvas diagrams (flowcharts, architecture diagrams, sticky notes, etc.).
---

${GENERATED_NOTICE}

${ADAPTER_INSTRUCTION}`;

/** Cursor rule: .cursor/rules/jiscribe.mdc（globs で .jis.json 編集時に自動添付） */
const CURSOR_RULE = `---
description: Jiscribe .jis.json canvas diagrams
globs: *.jis.json,*.jiscribe.json
alwaysApply: false
---

${GENERATED_NOTICE}

${ADAPTER_INSTRUCTION}`;

/** GitHub Copilot: .github/instructions/jiscribe.instructions.md（applyTo でスコープ発火） */
const COPILOT_INSTRUCTIONS = `---
applyTo: "**/*.jis.json,**/*.jiscribe.json"
---

${GENERATED_NOTICE}

${ADAPTER_INSTRUCTION}`;

type AgentId = "claude" | "cursor" | "copilot";

/** MCP 設定ファイルの場所と、サーバー定義を入れるキー。 */
interface McpConfig {
	/** 設定ファイルのパス要素（ワークスペース直下から）。 */
	file: string[];
	/** サーバー定義を格納するトップレベルキー（"mcpServers" or "servers"）。 */
	serversKey: string;
	/** VS Code 形式は各サーバーに `type: "stdio"` を持たせる。 */
	includeType: boolean;
}

interface AgentTarget {
	id: AgentId;
	label: string;
	detail: string;
	/** 既存利用の検出に使うマーカーディレクトリ（ワークスペース直下）。 */
	markerDir: string;
	/** アダプタの配置先（ワークスペース直下からの相対パス要素）。 */
	adapterPath: string[];
	/** アダプタの内容。 */
	content: string;
	/** MCP サーバー設定の配置先。 */
	mcp: McpConfig;
}

const TARGETS: AgentTarget[] = [
	{
		id: "claude",
		label: "Claude Code",
		detail: ".claude/skills/jiscribe/SKILL.md",
		markerDir: ".claude",
		adapterPath: [".claude", "skills", "jiscribe", "SKILL.md"],
		content: CLAUDE_SKILL,
		mcp: { file: [".mcp.json"], serversKey: "mcpServers", includeType: false },
	},
	{
		id: "cursor",
		label: "Cursor",
		detail: ".cursor/rules/jiscribe.mdc",
		markerDir: ".cursor",
		adapterPath: [".cursor", "rules", "jiscribe.mdc"],
		content: CURSOR_RULE,
		mcp: {
			file: [".cursor", "mcp.json"],
			serversKey: "mcpServers",
			includeType: false,
		},
	},
	{
		id: "copilot",
		label: "GitHub Copilot",
		detail: ".github/instructions/jiscribe.instructions.md",
		markerDir: ".github",
		adapterPath: [".github", "instructions", "jiscribe.instructions.md"],
		content: COPILOT_INSTRUCTIONS,
		mcp: {
			file: [".vscode", "mcp.json"],
			serversKey: "servers",
			includeType: true,
		},
	},
];

/** dist に同梱したアセットを読み込む。 */
async function readDistAsset(
	context: vscode.ExtensionContext,
	fileName: string,
): Promise<Uint8Array> {
	const uri = vscode.Uri.joinPath(context.extensionUri, "dist", fileName);
	return vscode.workspace.fs.readFile(uri);
}

/** ワークスペースの対象フォルダを解決する（複数ある場合は選択させる）。 */
async function resolveTargetFolder(): Promise<vscode.Uri | undefined> {
	const folders = vscode.workspace.workspaceFolders;
	if (!folders || folders.length === 0) {
		vscode.window.showErrorMessage(
			"Set up AI: Open a workspace folder before running this command.",
		);
		return undefined;
	}
	if (folders.length === 1) {
		return folders[0].uri;
	}
	const picked = await vscode.window.showWorkspaceFolderPick({
		placeHolder: "Select the workspace folder to set up AI in",
	});
	return picked?.uri;
}

/** マーカーディレクトリの有無で「既に使っていそうな」エージェントを推定する。 */
async function detectAgent(
	root: vscode.Uri,
	markerDir: string,
): Promise<boolean> {
	try {
		await vscode.workspace.fs.stat(vscode.Uri.joinPath(root, markerDir));
		return true;
	} catch {
		return false;
	}
}

/** 複数選択 UI で設定対象のエージェントを選ばせる。 */
async function pickTargets(
	root: vscode.Uri,
): Promise<AgentTarget[] | undefined> {
	const detected = await Promise.all(
		TARGETS.map((t) => detectAgent(root, t.markerDir)),
	);
	// 既存マーカーがあるものを既定 ON。何も検出されなければ全部 ON（初回想定）。
	const anyDetected = detected.some(Boolean);
	const items = TARGETS.map((target, i) => ({
		label: target.label,
		detail: target.detail,
		target,
		picked: anyDetected ? detected[i] : true,
	}));

	const picked = await vscode.window.showQuickPick(items, {
		canPickMany: true,
		placeHolder: "Select the AI agents to set up for this workspace",
	});
	return picked?.map((item) => item.target);
}

async function writeFile(uri: vscode.Uri, content: Uint8Array): Promise<void> {
	await vscode.workspace.fs.writeFile(uri, content);
}

/**
 * MCP 設定ファイルへ `jiscribe` サーバー定義を外科的にマージする。
 *
 * jsonc-parser の modify/applyEdits を使い、コメント・整形・他サーバー定義を温存したまま
 * `<serversKey>.jiscribe` だけを add/update する（冪等）。
 *
 * @returns マージできたら true。既存ファイルが壊れていて温存のためスキップした場合は false。
 */
async function mergeMcpConfig(
	root: vscode.Uri,
	mcp: McpConfig,
): Promise<boolean> {
	const fileUri = vscode.Uri.joinPath(root, ...mcp.file);

	let text = "{}";
	try {
		const buf = await vscode.workspace.fs.readFile(fileUri);
		const existing = new TextDecoder().decode(buf);
		if (existing.trim() !== "") {
			// 壊れた既存ファイルはユーザーの内容を守るため触らない。
			const errors: ParseError[] = [];
			parse(existing, errors, { allowTrailingComma: true });
			if (errors.length > 0) {
				return false;
			}
			text = existing;
		}
	} catch {
		// ファイルが無い場合は空オブジェクトから作る。
	}

	const serverValue = mcp.includeType
		? { type: "stdio", command: MCP_COMMAND, args: MCP_ARGS }
		: { command: MCP_COMMAND, args: MCP_ARGS };

	const edits = modify(text, [mcp.serversKey, MCP_SERVER_NAME], serverValue, {
		formattingOptions: { insertSpaces: false, tabSize: 1 },
	});
	const updated = applyEdits(text, edits);

	const dir = mcp.file.slice(0, -1);
	if (dir.length > 0) {
		await vscode.workspace.fs.createDirectory(
			vscode.Uri.joinPath(root, ...dir),
		);
	}
	await writeFile(fileUri, new TextEncoder().encode(updated));
	return true;
}

async function runSetupAi(context: vscode.ExtensionContext): Promise<void> {
	const root = await resolveTargetFolder();
	if (!root) {
		return;
	}

	const targets = await pickTargets(root);
	if (!targets || targets.length === 0) {
		return;
	}

	try {
		const [guide, schema] = await Promise.all([
			readDistAsset(context, "ai-guide.md"),
			readDistAsset(context, "jiscribe.schema.json"),
		]);

		// 正本: .jiscribe/（全アダプタが参照する）
		const jiscribeDir = vscode.Uri.joinPath(root, ".jiscribe");
		await vscode.workspace.fs.createDirectory(jiscribeDir);
		const guideUri = vscode.Uri.joinPath(jiscribeDir, "ai-guide.md");
		const schemaUri = vscode.Uri.joinPath(jiscribeDir, "jiscribe.schema.json");
		// ガイドにも生成物ヘッダを付ける（schema は JSON のため付けない）。
		const guideWithNotice = new TextEncoder().encode(
			`${GENERATED_NOTICE}\n\n${new TextDecoder().decode(guide)}`,
		);
		await writeFile(guideUri, guideWithNotice);
		await writeFile(schemaUri, schema);

		// 選択された各エージェントのアダプタ＋MCP 設定を配置。
		const skippedMcp: string[] = [];
		for (const target of targets) {
			const dir = vscode.Uri.joinPath(root, ...target.adapterPath.slice(0, -1));
			await vscode.workspace.fs.createDirectory(dir);
			const fileUri = vscode.Uri.joinPath(root, ...target.adapterPath);
			await writeFile(fileUri, new TextEncoder().encode(target.content));

			const merged = await mergeMcpConfig(root, target.mcp);
			if (!merged) {
				skippedMcp.push(target.mcp.file.join("/"));
			}
		}

		const names = targets.map((t) => t.label).join(", ");
		let message = `Set up AI: Configured ${names} (.jiscribe/, agent rules, and MCP server).`;
		if (skippedMcp.length > 0) {
			message += ` Skipped malformed MCP config: ${skippedMcp.join(", ")} (add the "jiscribe" server manually).`;
		}
		const action = await vscode.window.showInformationMessage(
			message,
			"Open Guide",
		);
		if (action === "Open Guide") {
			await vscode.window.showTextDocument(guideUri);
		}
	} catch (err) {
		vscode.window.showErrorMessage(
			`Set up AI failed: ${err instanceof Error ? err.message : String(err)}`,
		);
	}
}

export function registerSetupAiCommand(context: vscode.ExtensionContext): void {
	context.subscriptions.push(
		vscode.commands.registerCommand("jiscribe.setupAi", () =>
			runSetupAi(context),
		),
	);
}

import * as vscode from "vscode";

/**
 * 「Set up AI」コマンド。
 *
 * ワークスペースの AI エージェントが `.jis.json` を正しく生成・編集できるよう、
 * ガイド／スキーマと各エージェント用のアダプタ（Skill / rules / instructions）を配置する。
 *
 * 設計方針（docs/03_ai-integration/setup_ai_design.md）:
 * - 正本は `.jiscribe/`（ai-guide.md ＋ reference.md ＋ jiscribe.schema.json）に 1 部だけ置く。
 * - 各エージェントの own-file アダプタは `.jiscribe/ai-guide.md` を入口として指す薄いポインタにする
 *   （詳細リファレンス・スキーマへの誘導は ai-guide が一手に担い、案内元を 1 つに保つ）。
 * - 我々が生成するファイルのみ上書きし、ユーザー管理ファイル（CLAUDE.md / .gitignore 等）には一切触れない。
 *
 * NOTE: MCP サーバー設定の自動生成は優先度を下げて一旦外している（設計は docs/03_ai-integration/mcp_design.md）。
 */

// 生成ファイルであることを示すヘッダ（手編集を促さない）。
const GENERATED_NOTICE =
	"<!-- Generated and managed by the Jiscribe extension's “Set up AI” command. Manual edits are overwritten on re-run. -->";

// 各アダプタ共通の本文（frontmatter を除く）。`.jiscribe/ai-guide.md` を唯一の入口にする
// （ai-guide が詳細リファレンス・スキーマへ案内するので、ここでは多重案内しない）。
const ADAPTER_INSTRUCTION = `When generating or editing Jiscribe diagram data (\`.jis.json\` / \`.jiscribe.json\`), read \`.jiscribe/ai-guide.md\` at the workspace root and follow it. It links to the full reference and schema.
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
}

const TARGETS: AgentTarget[] = [
	{
		id: "claude",
		label: "Claude Code",
		detail: ".claude/skills/jiscribe/SKILL.md",
		markerDir: ".claude",
		adapterPath: [".claude", "skills", "jiscribe", "SKILL.md"],
		content: CLAUDE_SKILL,
	},
	{
		id: "cursor",
		label: "Cursor",
		detail: ".cursor/rules/jiscribe.mdc",
		markerDir: ".cursor",
		adapterPath: [".cursor", "rules", "jiscribe.mdc"],
		content: CURSOR_RULE,
	},
	{
		id: "copilot",
		label: "GitHub Copilot",
		detail: ".github/instructions/jiscribe.instructions.md",
		markerDir: ".github",
		adapterPath: [".github", "instructions", "jiscribe.instructions.md"],
		content: COPILOT_INSTRUCTIONS,
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
		const [guide, reference, schema] = await Promise.all([
			readDistAsset(context, "ai-guide.md"),
			readDistAsset(context, "reference.md"),
			readDistAsset(context, "jiscribe.schema.json"),
		]);

		// 正本: .jiscribe/（全アダプタが参照する）
		const jiscribeDir = vscode.Uri.joinPath(root, ".jiscribe");
		await vscode.workspace.fs.createDirectory(jiscribeDir);
		const guideUri = vscode.Uri.joinPath(jiscribeDir, "ai-guide.md");
		const referenceUri = vscode.Uri.joinPath(jiscribeDir, "reference.md");
		const schemaUri = vscode.Uri.joinPath(jiscribeDir, "jiscribe.schema.json");
		// Markdown には生成物ヘッダを付ける（schema は JSON のため付けない）。
		const withNotice = (asset: Uint8Array): Uint8Array =>
			new TextEncoder().encode(
				`${GENERATED_NOTICE}\n\n${new TextDecoder().decode(asset)}`,
			);
		await writeFile(guideUri, withNotice(guide));
		await writeFile(referenceUri, withNotice(reference));
		await writeFile(schemaUri, schema);

		// 選択された各エージェントのアダプタを配置。
		for (const target of targets) {
			const dir = vscode.Uri.joinPath(root, ...target.adapterPath.slice(0, -1));
			await vscode.workspace.fs.createDirectory(dir);
			const fileUri = vscode.Uri.joinPath(root, ...target.adapterPath);
			await writeFile(fileUri, new TextEncoder().encode(target.content));
		}

		const names = targets.map((t) => t.label).join(", ");
		const action = await vscode.window.showInformationMessage(
			`Set up AI: Created .jiscribe/ and config for ${names}. Ask your AI assistant to draw a Jiscribe diagram.`,
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

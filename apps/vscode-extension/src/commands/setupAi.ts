import * as vscode from "vscode";

/**
 * 「Set up AI」コマンド。
 *
 * ワークスペースの AI エージェントが `.jis.json` を正しく生成・編集できるよう、
 * ガイド／スキーマと Claude Code 用の Skill を配置する。
 *
 * 設計方針（docs/03_ai-integration/setup_ai_design.md）:
 * - 正本は `.jiscribe/`（ai-guide.md ＋ jiscribe.schema.json）に 1 部だけ置く。
 * - Claude Code は `.claude/skills/jiscribe/SKILL.md`（薄いアダプタ）から `.jiscribe/` を参照する。
 * - 我々が生成するファイルのみ上書きし、ユーザー管理ファイル（CLAUDE.md / .gitignore 等）には一切触れない。
 */

// 生成ファイルであることを示すヘッダ（手編集を促さない）。
const GENERATED_NOTICE =
	"<!-- Generated and managed by the Jiscribe extension's “Set up AI” command. Manual edits are overwritten on re-run. -->\n\n";

const SKILL_BODY = `---
name: jiscribe
description: Use when creating or editing Jiscribe .jis.json canvas diagrams (flowcharts, architecture diagrams, sticky notes, etc.).
---

${GENERATED_NOTICE}When generating or editing Jiscribe diagram data (\`.jis.json\` / \`.jiscribe.json\`), always follow this:

- Notation and rules: read \`.jiscribe/ai-guide.md\` at the workspace root.
- For the full field-level specification, refer to \`.jiscribe/jiscribe.schema.json\`.
`;

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

async function writeFile(uri: vscode.Uri, content: Uint8Array): Promise<void> {
	await vscode.workspace.fs.writeFile(uri, content);
}

async function runSetupAi(context: vscode.ExtensionContext): Promise<void> {
	const root = await resolveTargetFolder();
	if (!root) {
		return;
	}

	try {
		const [guide, schema] = await Promise.all([
			readDistAsset(context, "ai-guide.md"),
			readDistAsset(context, "jiscribe.schema.json"),
		]);

		// 正本: .jiscribe/
		const jiscribeDir = vscode.Uri.joinPath(root, ".jiscribe");
		await vscode.workspace.fs.createDirectory(jiscribeDir);
		const guideUri = vscode.Uri.joinPath(jiscribeDir, "ai-guide.md");
		const schemaUri = vscode.Uri.joinPath(jiscribeDir, "jiscribe.schema.json");
		// ガイドにも生成物ヘッダを付ける（schema は JSON のため付けない）。
		const guideWithNotice = new TextEncoder().encode(
			GENERATED_NOTICE + new TextDecoder().decode(guide),
		);
		await writeFile(guideUri, guideWithNotice);
		await writeFile(schemaUri, schema);

		// Claude Code 用アダプタ: .claude/skills/jiscribe/SKILL.md
		const skillDir = vscode.Uri.joinPath(root, ".claude", "skills", "jiscribe");
		await vscode.workspace.fs.createDirectory(skillDir);
		const skillUri = vscode.Uri.joinPath(skillDir, "SKILL.md");
		await writeFile(skillUri, new TextEncoder().encode(SKILL_BODY));

		const action = await vscode.window.showInformationMessage(
			"Set up AI: Created .jiscribe/ and the Claude Code skill. Ask Claude to “draw a Jiscribe diagram.”",
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

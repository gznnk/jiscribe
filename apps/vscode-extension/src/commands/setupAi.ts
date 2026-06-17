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
	"<!-- このファイルは Jiscribe 拡張の「Set up AI」コマンドが生成・管理しています。手で編集しても再実行で上書きされます。 -->\n\n";

const SKILL_BODY = `---
name: jiscribe
description: Jiscribe の .jis.json キャンバス図（フローチャート・構成図・付箋など）を作成・編集するとき。
---

${GENERATED_NOTICE}Jiscribe の図データ（\`.jis.json\` / \`.jiscribe.json\`）を生成・編集するときは、必ず次に従うこと:

- 記法とルール: ワークスペース直下の \`.jiscribe/ai-guide.md\` を読む。
- 全フィールド仕様が必要なときは \`.jiscribe/jiscribe.schema.json\` を参照する。
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
			"Set up AI: ワークスペースフォルダを開いてから実行してください。",
		);
		return undefined;
	}
	if (folders.length === 1) {
		return folders[0].uri;
	}
	const picked = await vscode.window.showWorkspaceFolderPick({
		placeHolder: "AI 設定を配置するワークスペースフォルダを選択",
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
			"Set up AI: .jiscribe/ と Claude Code Skill を配置しました。Claude に「Jiscribe で図を描いて」と話しかけてください。",
			"Open Guide",
		);
		if (action === "Open Guide") {
			await vscode.window.showTextDocument(guideUri);
		}
	} catch (err) {
		vscode.window.showErrorMessage(
			`Set up AI に失敗しました: ${err instanceof Error ? err.message : String(err)}`,
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

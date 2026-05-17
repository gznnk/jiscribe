import * as vscode from "vscode";

import { registerExportSchemaCommand } from "./commands/exportSchema";
import { registerNewCanvasCommands } from "./commands/newCanvas";
import { DiagnosticProvider } from "./diagnostics/DiagnosticProvider";
import { JiscribeEditorProvider } from "./editor/JiscribeEditorProvider";

/**
 * 拡張機能が有効になったときに VSCode から呼び出されるエントリーポイント。
 * package.json の activationEvents に基づいてトリガーされる
 * （現在は activationEvents: [] のため、最初の .jis.json を開いたときに起動）。
 *
 * @param context  拡張機能のライフサイクルを管理するオブジェクト。
 *                 context.subscriptions に Disposable を追加すると、
 *                 拡張機能の無効化時に自動的に破棄される。
 */
export function activate(context: vscode.ExtensionContext) {
	// .jis.json ファイルのバリデーションエラーを Problems パネルに表示する
	new DiagnosticProvider(context);

	// .jis.json ファイルを開いたときに Canvas UI（Webview）を表示するカスタムエディタを登録する
	const provider = new JiscribeEditorProvider(context);
	const registration = vscode.window.registerCustomEditorProvider(
		"jiscribe.editor", // package.json の contributes.customEditors[].viewType と一致させる
		provider,
		{
			webviewOptions: {
				// true にすると、タブを切り替えてもWebviewの状態（Reactのstate等）が保持される。
				// false にするとタブを非表示にするたびに Webview が破棄・再生成される。
				retainContextWhenHidden: true,
			},
			supportsMultipleEditorsPerDocument: false,
		},
	);

	context.subscriptions.push(registration);

	registerNewCanvasCommands(context);
	registerExportSchemaCommand(context);
}

/**
 * 拡張機能が無効になったときに VSCode から呼び出される。
 * context.subscriptions に登録した Disposable は VSCode が自動的に破棄するため、
 * ここで追加のクリーンアップは通常不要。
 */
export function deactivate() {}

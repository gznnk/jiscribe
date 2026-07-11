import * as vscode from "vscode";

import { registerNewCanvasCommands } from "./commands/newCanvas";
import { registerSetupAiCommand } from "./commands/setupAi";
import { DiagnosticProvider } from "./diagnostics/DiagnosticProvider";
import { JiscribeEditorProvider } from "./editor/JiscribeEditorProvider";
import { JiscribeImageEditorProvider } from "./editor/JiscribeImageEditorProvider";

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
				// false: 非表示タブの Webview コンテキスト（約1MB の JS 評価済み＋React/SVG
				// ツリー）をメモリに常駐させず、再表示時に破棄・再生成する（#138）。
				// VSCode 公式も retainContextWhenHidden は高オーバーヘッドとして非推奨。
				//
				// 破棄しても状態は失われない:
				//   - ドキュメント内容: 再生成後の Webview が "ready" を再送 → この Provider が
				//     doc を再送信する既存フローで復元される（パネルと messageListener は
				//     タブ非表示では dispose されない）。
				//   - ビューポート（パン/ズーム）: Webview 側が getState/setState に camera を
				//     退避し、再マウント時に Canvas の controlled viewport へ復元する
				//     （src/webview/index.tsx）。
				// トレードオフ: 再表示時に一瞬のリロード（"Loading canvas..."）が挟まる。
				retainContextWhenHidden: false,
			},
			supportsMultipleEditorsPerDocument: false,
		},
	);

	context.subscriptions.push(registration);

	// ソース埋め込み済みの画像（.jis.png / .jis.svg、draw.io の .drawio.png /
	// .drawio.svg 相当）を Canvas UI で開くカスタムエディタを登録する
	const imageProvider = new JiscribeImageEditorProvider(context);
	const imageRegistration = vscode.window.registerCustomEditorProvider(
		"jiscribe.imageEditor", // package.json の contributes.customEditors[].viewType と一致させる
		imageProvider,
		{
			webviewOptions: {
				// テキスト側と同じ理由（#138）で非表示タブの Webview は破棄する
				retainContextWhenHidden: false,
			},
			supportsMultipleEditorsPerDocument: false,
		},
	);
	context.subscriptions.push(imageRegistration);

	registerNewCanvasCommands(context);
	registerSetupAiCommand(context);
}

/**
 * 拡張機能が無効になったときに VSCode から呼び出される。
 * context.subscriptions に登録した Disposable は VSCode が自動的に破棄するため、
 * ここで追加のクリーンアップは通常不要。
 */
export function deactivate() {}

import * as jsoncParser from "jsonc-parser";
import * as vscode from "vscode";

import type {
	ExtensionToWebviewMessage,
	WebviewToExtensionMessage,
} from "../types/messages";

/**
 * .jis.json ファイルを開いたときに Canvas UI を表示するカスタムエディタプロバイダ。
 *
 * VSCode の Custom Editor API では、CustomTextEditorProvider を実装して
 * registerCustomEditorProvider() に登録することで、特定のファイル拡張子に
 * 独自の UI（Webview）を紐付けられる。
 *
 * データフロー:
 *   ファイル変更 → Extension → Webview（postMessage）
 *   Canvas 編集  → Webview  → Extension（postMessage）→ WorkspaceEdit でファイルに書き戻す
 */
export class JiscribeEditorProvider implements vscode.CustomTextEditorProvider {
	constructor(private readonly context: vscode.ExtensionContext) {}

	/**
	 * ユーザーが .jis.json ファイルを開くたびに VSCode から呼び出されるメソッド。
	 * ここで Webview の初期化・イベントリスナーの登録を行う。
	 *
	 * @param document  開かれたファイルを表すオブジェクト
	 * @param webviewPanel  UIを表示する Webview パネル
	 * @param _token  キャンセルトークン（未使用だが API の仕様上必要）
	 */
	public async resolveCustomTextEditor(
		document: vscode.TextDocument,
		webviewPanel: vscode.WebviewPanel,
		_token: vscode.CancellationToken,
	): Promise<void> {
		// Webview でスクリプト実行を有効にする（デフォルトは無効）
		webviewPanel.webview.options = { enableScripts: true };
		webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

		// ---- 競合状態の管理 (#5 修正) ----
		//
		// Webview からの編集による applyEdit() が完了するまでの間、
		// 外部からのファイル変更イベント（onDidChangeTextDocument）を無視する必要がある。
		// （無視しないと: Webview → Extension → ファイル更新 → ファイル変更イベント発火
		//   → Webview へ同じ内容を再送信 という無限ループが発生する）
		//
		// 以前は boolean を使っていたが、非同期処理が重なると問題が生じる:
		//   1回目の update() が完了して false に戻った後も、
		//   2回目の update() がまだ進行中の場合に外部変更を誤って Webview へ送ってしまう。
		//
		// number（カウンター）にすることで、進行中の update() 件数を正確に追跡できる。
		let pendingWebviewUpdates = 0;

		// ---- ファイル変更監視 ----
		//
		// onDidChangeTextDocument は Disposable を返す。
		// 変数に代入して後で明示的に dispose() するためここで保持する。
		const changeDocumentSubscription =
			vscode.workspace.onDidChangeTextDocument((e) => {
				if (e.document.uri.toString() !== document.uri.toString()) return;

				// Webview からの書き込みによるイベントは無視する（無限ループ防止）
				if (pendingWebviewUpdates === 0) {
					this.updateWebview(webviewPanel, document);
				}
			});

		// ---- Webview からのメッセージ受信 (#1 修正) ----
		//
		// 以前は onDidReceiveMessage() の返り値（Disposable）を捨てていたため、
		// エディタを開くたびにリスナーが増殖し、閉じても解放されないリークが発生していた。
		// 変数に代入して onDidDispose で dispose() することで解決する。
		const messageListener = webviewPanel.webview.onDidReceiveMessage(
			(message: WebviewToExtensionMessage) => {
				switch (message.type) {
					case "ready":
						// Webview の初期化が完了した合図。ファイルの初期内容を送信する。
						this.updateWebview(webviewPanel, document);
						break;

					case "update":
						// Canvas が編集されたときにファイルへ書き戻す。
						//
						// カウンターをインクリメントして「現在 Webview 由来の書き込みが進行中」
						// とマークする。applyEdit() は非同期なので、完了前に
						// onDidChangeTextDocument が発火する可能性があるためカウンターで管理する。
						pendingWebviewUpdates++;
						// .then(onFulfilled, onRejected) の2引数形式を使う。
						// .then().catch() と違い、onFulfilled 内の例外も onRejected に流れない
						// ため意図が明確になる。
						this.updateTextDocument(document, message.data).then(
							() => {
								pendingWebviewUpdates--;
							},
							(err: unknown) => {
								// (#2 修正) 失敗しても必ずカウンターを戻す。
								// 戻さないと pendingWebviewUpdates が 0 に戻らず、
								// 以降の外部ファイル変更がすべて Webview へ反映されなくなる。
								pendingWebviewUpdates--;
								console.error("[Jiscribe] ファイルへの書き込みに失敗しました:", err);
							},
						);
						break;
				}
			},
		);

		// ---- パネルが閉じられたときのクリーンアップ ----
		//
		// Webview パネルが閉じられると onDidDispose が発火する。
		// ここで両方の Disposable を破棄しないと、イベントリスナーがメモリ上に残り続ける。
		webviewPanel.onDidDispose(() => {
			changeDocumentSubscription.dispose();
			messageListener.dispose(); // (#1 修正) 追加
		});
	}

	/**
	 * ファイルの現在の内容を Webview へ送信する。
	 * ファイルが外部で変更されたとき、または Webview が初期化完了を通知したときに呼ばれる。
	 */
	private updateWebview(
		panel: vscode.WebviewPanel,
		document: vscode.TextDocument,
	) {
		const text = document.getText();
		const errors: jsoncParser.ParseError[] = [];
		const parsed = jsoncParser.parse(text, errors);
		// JSONC parse に失敗した場合はそのまま送り、Webview 側のエラー画面に任せる
		const data =
			errors.length === 0 ? JSON.stringify(parsed, null, 2) : text;
		const message: ExtensionToWebviewMessage = { type: "update", data };
		panel.webview.postMessage(message);
	}

	/**
	 * Webview からの編集内容をファイルへ書き戻す。
	 * WorkspaceEdit を使うことで Undo/Redo の履歴に乗る。
	 *
	 * async にする理由: vscode.workspace.applyEdit() は Thenable<boolean> を返すが、
	 * Thenable は .catch() を持たない。async 関数にすることで Promise<boolean> として
	 * 扱えるようになり、呼び出し側で .then(..., onRejected) が使える。
	 */
	private async updateTextDocument(
		document: vscode.TextDocument,
		json: string,
	): Promise<boolean> {
		const edit = new vscode.WorkspaceEdit();

		// (#3 修正) ドキュメント全体を置き換える Range を正しく計算する。
		//
		// document.lineCount はドキュメントの総行数（1始まり）。
		// Range の終端行インデックスは 0始まりなので lineCount - 1 が正しい。
		// 以前は `new vscode.Range(0, 0, document.lineCount, 0)` としており、
		// 存在しない行番号を指定していた（最終行の次の行を指していた）。
		const lastLine = document.lineAt(document.lineCount - 1);
		edit.replace(
			document.uri,
			new vscode.Range(0, 0, document.lineCount - 1, lastLine.text.length),
			json,
		);

		return vscode.workspace.applyEdit(edit);
	}

	/**
	 * Webview に表示する HTML を生成する。
	 *
	 * セキュリティのため Content-Security-Policy（CSP）を設定し、
	 * 許可されたスクリプト以外の実行をブロックする。
	 * nonce（使い捨てランダム文字列）を使って正規のスクリプトのみを識別する。
	 */
	private getHtmlForWebview(webview: vscode.Webview): string {
		// dist/webview.js の VSCode Webview 内でアクセス可能な URI を取得する。
		// Webview 内では通常のファイルパスではなくこの URI 形式を使う必要がある。
		const scriptUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this.context.extensionUri, "dist", "webview.js"),
		);

		const nonce = getNonce();

		return /* html */ `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<!--
					Content-Security-Policy の説明:
					  default-src 'none'        → 何も許可しない（ホワイトリスト方式）
					  img-src ...               → 画像の読み込み元を許可
					  style-src ... 'unsafe-inline' → インラインスタイルを許可
					  font-src ...              → フォントの読み込み元を許可
					  script-src 'nonce-...'   → nonce が一致するスクリプトのみ実行を許可
					この設定により XSS 攻撃のリスクを低減する。
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data:; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
				<title>Jiscribe Canvas Editor</title>
				<style>
					body, html {
						margin: 0;
						padding: 0;
						width: 100%;
						height: 100vh;
						overflow: hidden;
					}
					#root {
						width: 100%;
						height: 100%;
					}
				</style>
			</head>
			<body>
				<div id="root"></div>
				<!--
					script タグを body 末尾に置く理由:
					DOM 構築後にスクリプトが実行されることを保証するため。
					これにより document.getElementById("root") が必ず要素を見つけられる。
				-->
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>
		`;
	}
}

/**
 * Content-Security-Policy 用の nonce（使い捨てランダム文字列）を生成する。
 * 32文字の英数字ランダム文字列を返す。
 */
function getNonce(): string {
	const chars =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	return Array.from(
		{ length: 32 },
		() => chars[Math.floor(Math.random() * chars.length)],
	).join("");
}

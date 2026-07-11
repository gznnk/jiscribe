import * as vscode from "vscode";

import { saveExportedImage } from "./saveExportedImage";
import { getCanvasWebviewHtml } from "./webviewHtml";
import type {
	ExtensionToWebviewMessage,
	WebviewToExtensionMessage,
} from "../types/messages";

/**
 * .jis.json ファイルを開いたときに Canvas UI を表示する
 * カスタムエディタプロバイダ。
 *
 * VSCode の Custom Editor API では、CustomTextEditorProvider を実装して
 * registerCustomEditorProvider() に登録することで、特定のファイル拡張子に
 * 独自の UI（Webview）を紐付けられる。
 *
 * データフロー:
 *   ファイル変更 → Extension → Webview（postMessage）
 *   Canvas 編集  → Webview  → Extension（postMessage）→ WorkspaceEdit でファイルに書き戻す
 *
 * 画像ドキュメント（.jis.svg / .jis.png）はテキストの全文置換では扱えないため、
 * JiscribeImageEditorProvider（保存時に画像を再生成する方式）が担当する。
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
		webviewPanel.webview.html = getCanvasWebviewHtml(
			webviewPanel.webview,
			this.context.extensionUri,
		);

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

		// ---- 折り返し検出用 nonce ----
		//
		// Webview からの "update" メッセージに含まれる saveNonce をここに保持する。
		// onDidChangeTextDocument が発火したとき:
		//   - pendingWebviewUpdates > 0 の場合（同期的な折り返し）: nonce を消費して無視。
		//   - pendingWebviewUpdates === 0 の場合（非同期的な折り返し or 外部変更）:
		//     nonce を添えて Webview へ送信する。Canvas 側でこの nonce を比較し、
		//     自己保存の折り返しかどうかを判定する。
		let lastSaveNonce: string | undefined;

		// ---- ファイル変更監視 ----
		//
		// onDidChangeTextDocument は Disposable を返す。
		// 変数に代入して後で明示的に dispose() するためここで保持する。
		const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(
			(e) => {
				if (e.document.uri.toString() !== document.uri.toString()) {
					return;
				}

				// Webview からの書き込みによるイベントは無視する（無限ループ防止）。
				// pendingWebviewUpdates > 0 の間に来たイベントは自分の applyEdit() が
				// 原因であるため、Webview へ再送してはならない。
				if (pendingWebviewUpdates > 0) {
					// 自分の書き込みが進行中 → 無視。nonce も消費して後続イベントに引き継がない。
					lastSaveNonce = undefined;
				} else {
					// 外部変更 or 非同期折り返し → nonce を添えて送信し消費する。
					this.updateWebview(webviewPanel, document, lastSaveNonce);
					lastSaveNonce = undefined;
				}
			},
		);

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

					case "undo":
						vscode.commands.executeCommand("undo");
						break;

					case "redo":
						vscode.commands.executeCommand("redo");
						break;

					case "update": {
						// Canvas が編集されたときにファイルへ書き戻す。
						//
						// カウンターをインクリメントして「現在 Webview 由来の書き込みが進行中」
						// とマークする。applyEdit() は非同期なので、完了前に
						// onDidChangeTextDocument が発火する可能性があるためカウンターで管理する。
						lastSaveNonce = message.saveNonce;
						pendingWebviewUpdates++;
						// .then(onFulfilled, onRejected) の2引数形式を使う。
						// .then().catch() と違い、onFulfilled 内の例外も onRejected に流れない
						// ため意図が明確になる。
						this.updateTextDocument(document, message.data).then(
							(applied) => {
								pendingWebviewUpdates--;
								// applyEdit() は失敗時に reject ではなく false で resolve する
								// こともある（例: ドキュメントが既に閉じられている）。
								// どちらの経路でも、保存されていないことをユーザーへ通知する。
								if (!applied) {
									this.notifySaveFailure(document, undefined);
								}
							},
							(err: unknown) => {
								// (#2 修正) 失敗しても必ずカウンターを戻す。
								// 戻さないと pendingWebviewUpdates が 0 に戻らず、
								// 以降の外部ファイル変更がすべて Webview へ反映されなくなる。
								pendingWebviewUpdates--;
								this.notifySaveFailure(document, err);
							},
						);
						break;
					}

					case "exportImage":
						// エクスポート画像のワークスペース保存（保存ダイアログ→書き込み→通知）
						void saveExportedImage(
							document.uri,
							message.format,
							message.base64,
							message.includesSource,
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
	 * Canvas の編集内容をファイルへ書き戻せなかったことをユーザーへ通知する。
	 * console.error だけでは気づかれず、保存されたつもりで編集を続けてしまうため、
	 * 必ずエラーメッセージを画面に表示する。
	 */
	private notifySaveFailure(document: vscode.TextDocument, err: unknown) {
		console.error("[Jiscribe] ファイルへの書き込みに失敗しました:", err);
		const detail = err instanceof Error ? `: ${err.message}` : "";
		const baseName = document.uri.path.split("/").pop() ?? document.uri.path;
		vscode.window.showErrorMessage(
			`Jiscribe: Failed to write canvas changes to "${baseName}"${detail}. Your latest edits are NOT saved.`,
		);
	}

	/**
	 * ファイルの現在の内容を Webview へ送信する。
	 * ファイルが外部で変更されたとき、または Webview が初期化完了を通知したときに呼ばれる。
	 */
	private updateWebview(
		panel: vscode.WebviewPanel,
		document: vscode.TextDocument,
		saveNonce?: string,
	) {
		const text = document.getText();
		let data: string;
		try {
			data = JSON.stringify(JSON.parse(text), null, 2);
		} catch {
			// JSON parse に失敗した場合はそのまま送り、Webview 側のエラー画面に任せる
			data = text;
		}
		const message: ExtensionToWebviewMessage = {
			type: "update",
			data,
			saveNonce,
			docType: "json",
		};
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
}

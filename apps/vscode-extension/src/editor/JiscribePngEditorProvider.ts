import {
	insertPngTextChunk,
	PNG_SOURCE_KEYWORD,
	readPngTextChunk,
} from "@workspace/canvas/png-source";
import * as vscode from "vscode";

import { saveExportedImage } from "./saveExportedImage";
import { getCanvasWebviewHtml } from "./webviewHtml";
import type {
	ExtensionToWebviewMessage,
	WebviewToExtensionMessage,
} from "../types/messages";

/**
 * Webview からの PNG 生成応答を待つ最大時間。通常は数百 ms オーダーで返るため、
 * これを超えたら Webview が応答不能とみなしフォールバックする。
 */
const PNG_EXPORT_TIMEOUT_MS = 10_000;

/**
 * `.jis.png` の CustomDocument。
 *
 * バイナリのカスタムエディタでは TextDocument が使えないため、
 * ドキュメントの状態（ソース JSON と最後に保存した画像バイト列）を自前で持つ。
 */
class JiscribePngDocument implements vscode.CustomDocument {
	/**
	 * @param uri - ドキュメントの URI
	 * @param savedBytes - 最後にファイルへ書いた（または読み込んだ）PNG バイト列。
	 *   Webview が応答できないときの保存フォールバック（この画像に最新ソースを
	 *   埋め込み直す）の土台になる
	 * @param sourceText - 現在の `.jis.json` ソーステキスト。
	 *   null = iTXt にソース埋め込みが無い（編集不可のエラー表示になる）
	 */
	constructor(
		public readonly uri: vscode.Uri,
		public savedBytes: Uint8Array,
		public sourceText: string | null,
	) {}

	dispose(): void {
		// 保持しているのはメモリ上のバイト列だけなので、明示的な解放は不要
	}
}

/**
 * `.jis.png`（iTXt にソース埋め込み済みの PNG）を Canvas UI で開く
 * カスタムエディタプロバイダ。draw.io の `.drawio.png` 相当。
 *
 * PNG はバイナリのため CustomTextEditorProvider は使えず、
 * CustomEditorProvider として dirty 管理・保存・バックアップを自前で実装する。
 *
 * データフロー:
 *   開く:   ファイル読み込み → iTXt からソース JSON を抽出 → Webview へ送信
 *   編集:   Webview から doc JSON が届く → edit イベント発火（dirty / undo / redo）
 *   保存:   Webview に PNG 生成を依頼（fit-to-content で再レンダリング＋ソース
 *           再埋め込み）→ ファイルへ書き込み。Webview が応答できない場合は
 *           「既存画像＋最新ソースの再埋め込み」にフォールバックする
 *           （画像の見た目は前回保存時のままだがソースは失われない）
 */
export class JiscribePngEditorProvider implements vscode.CustomEditorProvider<JiscribePngDocument> {
	constructor(private readonly context: vscode.ExtensionContext) {}

	// ---- dirty / undo / redo の通知チャネル ----
	//
	// CustomEditorProvider では、このイベントを fire することで VSCode に
	// 「ドキュメントが編集された」と伝える。VSCode 側が undo/redo スタックを
	// 管理し、Ctrl+Z / Ctrl+Y でイベント内の undo() / redo() を呼び返してくる。
	private readonly changeEmitter = new vscode.EventEmitter<
		vscode.CustomDocumentEditEvent<JiscribePngDocument>
	>();
	public readonly onDidChangeCustomDocument = this.changeEmitter.event;

	// ドキュメントごとの表示中パネル（supportsMultipleEditorsPerDocument: false
	// のため高々1つ）。保存時の PNG 生成依頼と undo/redo の反映に使う。
	private readonly panels = new Map<JiscribePngDocument, vscode.WebviewPanel>();

	// requestPngExport の応答待ち。requestId で対応付ける。
	private nextRequestId = 1;
	private readonly pendingExports = new Map<
		number,
		(base64: string | null) => void
	>();

	/** ファイル（またはバックアップ）を読み込んでドキュメントを構築する。 */
	public async openCustomDocument(
		uri: vscode.Uri,
		openContext: vscode.CustomDocumentOpenContext,
		_token: vscode.CancellationToken,
	): Promise<JiscribePngDocument> {
		// ホットイグジット復元時はバックアップの方を読む（URI は元ファイルのまま）
		const readUri = openContext.backupId
			? vscode.Uri.parse(openContext.backupId)
			: uri;
		const bytes = await vscode.workspace.fs.readFile(readUri);
		const sourceText = readPngTextChunk(bytes, PNG_SOURCE_KEYWORD);
		return new JiscribePngDocument(uri, bytes, sourceText);
	}

	/** エディタ（Webview）を初期化し、ドキュメントとのメッセージ配線を行う。 */
	public async resolveCustomEditor(
		document: JiscribePngDocument,
		webviewPanel: vscode.WebviewPanel,
		_token: vscode.CancellationToken,
	): Promise<void> {
		this.panels.set(document, webviewPanel);

		webviewPanel.webview.options = { enableScripts: true };
		webviewPanel.webview.html = getCanvasWebviewHtml(
			webviewPanel.webview,
			this.context.extensionUri,
		);

		const messageListener = webviewPanel.webview.onDidReceiveMessage(
			(message: WebviewToExtensionMessage) => {
				switch (message.type) {
					case "ready":
						this.updateWebview(webviewPanel, document);
						break;

					case "undo":
						vscode.commands.executeCommand("undo");
						break;

					case "redo":
						vscode.commands.executeCommand("redo");
						break;

					case "update": {
						// Canvas の編集。テキストエディタと違いファイルへは書かず、
						// edit イベントで dirty にするだけ（実際の書き込みは保存時）。
						// undo/redo は VSCode から呼び返されるので、変更前後の
						// ソースをクロージャに閉じ込めて差し戻し／再適用する。
						const beforeText = document.sourceText;
						const afterText = message.data;
						document.sourceText = afterText;
						this.changeEmitter.fire({
							document,
							label: "Canvas edit",
							undo: () => {
								document.sourceText = beforeText;
								this.pushSourceToWebview(document);
							},
							redo: () => {
								document.sourceText = afterText;
								this.pushSourceToWebview(document);
							},
						});
						break;
					}

					case "pngExportResult": {
						const resolve = this.pendingExports.get(message.requestId);
						if (resolve) {
							this.pendingExports.delete(message.requestId);
							resolve(message.base64);
						}
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

		webviewPanel.onDidDispose(() => {
			messageListener.dispose();
			if (this.panels.get(document) === webviewPanel) {
				this.panels.delete(document);
			}
		});
	}

	/** 上書き保存。 */
	public async saveCustomDocument(
		document: JiscribePngDocument,
		token: vscode.CancellationToken,
	): Promise<void> {
		const bytes = await this.renderCurrentPng(document);
		if (token.isCancellationRequested) {
			return;
		}
		await vscode.workspace.fs.writeFile(document.uri, bytes);
		document.savedBytes = bytes;
	}

	/** 名前を付けて保存。 */
	public async saveCustomDocumentAs(
		document: JiscribePngDocument,
		destination: vscode.Uri,
		token: vscode.CancellationToken,
	): Promise<void> {
		const bytes = await this.renderCurrentPng(document);
		if (token.isCancellationRequested) {
			return;
		}
		await vscode.workspace.fs.writeFile(destination, bytes);
	}

	/** 変更の破棄（Revert File）。ファイルの内容へ巻き戻す。 */
	public async revertCustomDocument(
		document: JiscribePngDocument,
		_token: vscode.CancellationToken,
	): Promise<void> {
		const bytes = await vscode.workspace.fs.readFile(document.uri);
		document.savedBytes = bytes;
		document.sourceText = readPngTextChunk(bytes, PNG_SOURCE_KEYWORD);
		this.pushSourceToWebview(document);
	}

	/**
	 * ホットイグジット用バックアップ。エディタが非表示のタイミングでも呼ばれ
	 * るため、Webview への往復に依存しない埋め込みフォールバックで確実に書く
	 * （画像は前回保存時のままでも、ソースさえ残れば編集内容は復元できる）。
	 */
	public async backupCustomDocument(
		document: JiscribePngDocument,
		context: vscode.CustomDocumentBackupContext,
		_token: vscode.CancellationToken,
	): Promise<vscode.CustomDocumentBackup> {
		const bytes = this.embedCurrentSource(document);
		await vscode.workspace.fs.writeFile(context.destination, bytes);
		return {
			id: context.destination.toString(),
			delete: async () => {
				try {
					await vscode.workspace.fs.delete(context.destination);
				} catch {
					// バックアップが既に無い場合は何もしない
				}
			},
		};
	}

	/** 現在のソース JSON を Webview へ送る（undo/redo/revert の反映）。 */
	private pushSourceToWebview(document: JiscribePngDocument): void {
		const panel = this.panels.get(document);
		if (panel) {
			this.updateWebview(panel, document);
		}
	}

	/**
	 * ドキュメントの現在ソースを Webview へ送信する。
	 * ソース埋め込みが無い場合は空文字を送り、Webview 側が
	 * 「編集可能なソースが無い」旨の表示に切り替える。
	 */
	private updateWebview(
		panel: vscode.WebviewPanel,
		document: JiscribePngDocument,
	): void {
		const message: ExtensionToWebviewMessage = {
			type: "update",
			data: document.sourceText ?? "",
			docType: "png",
		};
		panel.webview.postMessage(message);
	}

	/**
	 * 現在のソースを反映した PNG バイト列を得る。
	 * 第一候補は Webview での再レンダリング（fit-to-content・最新の見た目）。
	 * Webview が無い/応答しない場合は、最後に保存した画像へ最新ソースを
	 * 埋め込み直したものを返す。
	 */
	private async renderCurrentPng(
		document: JiscribePngDocument,
	): Promise<Uint8Array> {
		const panel = this.panels.get(document);
		if (panel) {
			const base64 = await this.requestPngFromWebview(panel);
			if (base64 !== null) {
				return new Uint8Array(Buffer.from(base64, "base64"));
			}
		}
		return this.embedCurrentSource(document);
	}

	/** Webview に PNG 生成を依頼し、base64 応答を待つ（タイムアウト付き）。 */
	private requestPngFromWebview(
		panel: vscode.WebviewPanel,
	): Promise<string | null> {
		const requestId = this.nextRequestId++;
		const message: ExtensionToWebviewMessage = {
			type: "requestPngExport",
			requestId,
		};
		return new Promise<string | null>((resolve) => {
			const timeout = setTimeout(() => {
				this.pendingExports.delete(requestId);
				resolve(null);
			}, PNG_EXPORT_TIMEOUT_MS);
			this.pendingExports.set(requestId, (base64) => {
				clearTimeout(timeout);
				resolve(base64);
			});
			panel.webview.postMessage(message);
		});
	}

	/**
	 * 保存フォールバック: 最後に保存した画像バイト列へ現在のソースを
	 * 埋め込み直す。画像の見た目は前回保存時のままになるが、ソース
	 * （編集内容）は失われない。ソースが無い/PNG が壊れている場合は
	 * 画像をそのまま返す。
	 */
	private embedCurrentSource(document: JiscribePngDocument): Uint8Array {
		if (document.sourceText === null) {
			return document.savedBytes;
		}
		try {
			return insertPngTextChunk(
				document.savedBytes,
				PNG_SOURCE_KEYWORD,
				document.sourceText,
			);
		} catch {
			return document.savedBytes;
		}
	}
}

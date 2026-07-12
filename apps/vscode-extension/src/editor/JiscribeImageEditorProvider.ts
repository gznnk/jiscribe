import {
	insertPngTextChunk,
	PNG_SOURCE_KEYWORD,
	readPngTextChunk,
} from "@workspace/canvas/png-source";
import {
	extractCanvasSourceFromSvgText,
	replaceCanvasSourceInSvgText,
} from "@workspace/canvas/svg-source";
import * as vscode from "vscode";

import { saveExportedImage } from "./saveExportedImage";
import { getCanvasWebviewHtml } from "./webviewHtml";
import type {
	ExtensionToWebviewMessage,
	WebviewToExtensionMessage,
} from "../types/messages";

/**
 * Webview からの画像生成応答を待つ最大時間。通常は数百 ms オーダーで返るため、
 * これを超えたら Webview が応答不能とみなしフォールバックする。
 */
const IMAGE_EXPORT_TIMEOUT_MS = 10_000;

/** 画像ドキュメントの種別。ソースの埋め込み形式と保存時の画像化方法を決める。 */
type JiscribeImageKind = "png" | "svg";

/**
 * `.jis.png` / `.jis.svg` の CustomDocument。
 *
 * 画像のカスタムエディタでは TextDocument が使えないため、
 * ドキュメントの状態（ソース JSON と最後に保存した画像バイト列）を自前で持つ。
 */
class JiscribeImageDocument implements vscode.CustomDocument {
	/**
	 * @param uri - ドキュメントの URI
	 * @param kind - 画像種別（png / svg）
	 * @param savedBytes - 最後にファイルへ書いた（または読み込んだ）画像バイト列。
	 *   Webview が応答できないときの保存フォールバック（この画像に最新ソースを
	 *   埋め込み直す）の土台になる
	 * @param sourceText - 現在の `.jis.json` ソーステキスト。
	 *   null = ソース埋め込みが無い（編集不可のエラー表示になる）
	 */
	constructor(
		public readonly uri: vscode.Uri,
		public readonly kind: JiscribeImageKind,
		public savedBytes: Uint8Array,
		public sourceText: string | null,
	) {}

	dispose(): void {
		// 保持しているのはメモリ上のバイト列だけなので、明示的な解放は不要
	}
}

/**
 * ソース埋め込み済みの画像（`.jis.png` / `.jis.svg`、draw.io の `.drawio.png` /
 * `.drawio.svg` 相当）を Canvas UI で開くカスタムエディタプロバイダ。
 *
 * どちらも CustomEditorProvider として dirty 管理・保存・バックアップを自前で
 * 実装する。PNG はバイナリなので CustomTextEditorProvider が使えない。SVG は
 * テキストだが、編集のたびに SVG 全文を再レンダリングすると commit 経路が
 * DOM レンダリングに依存して失敗し得るため、同じ方式に乗せて画像化を保存時
 * まで遅延する。
 *
 * データフロー:
 *   開く:   ファイル読み込み → 埋め込みソース JSON を抽出（png: iTXt / svg:
 *           <metadata>）→ Webview へ送信
 *   編集:   Webview から doc JSON が届く → edit イベント発火（dirty / undo / redo）
 *   保存:   Webview に画像生成を依頼（fit-to-content で再レンダリング＋ソース
 *           再埋め込み）→ ファイルへ書き込み。Webview が応答できない場合は
 *           「既存画像＋最新ソースの再埋め込み」にフォールバックする
 *           （画像の見た目は前回保存時のままだがソースは失われない）
 */
export class JiscribeImageEditorProvider implements vscode.CustomEditorProvider<JiscribeImageDocument> {
	constructor(private readonly context: vscode.ExtensionContext) {}

	// ---- dirty / undo / redo の通知チャネル ----
	//
	// CustomEditorProvider では、このイベントを fire することで VSCode に
	// 「ドキュメントが編集された」と伝える。VSCode 側が undo/redo スタックを
	// 管理し、Ctrl+Z / Ctrl+Y でイベント内の undo() / redo() を呼び返してくる。
	private readonly changeEmitter = new vscode.EventEmitter<
		vscode.CustomDocumentEditEvent<JiscribeImageDocument>
	>();
	public readonly onDidChangeCustomDocument = this.changeEmitter.event;

	// ドキュメントごとの表示中パネル（supportsMultipleEditorsPerDocument: false
	// のため高々1つ）。保存時の画像生成依頼と undo/redo の反映に使う。
	private readonly panels = new Map<
		JiscribeImageDocument,
		vscode.WebviewPanel
	>();

	// requestImageExport の応答待ち。requestId で対応付ける。
	private nextRequestId = 1;
	private readonly pendingExports = new Map<
		number,
		(data: string | null) => void
	>();

	/** ファイル（またはバックアップ）を読み込んでドキュメントを構築する。 */
	public async openCustomDocument(
		uri: vscode.Uri,
		openContext: vscode.CustomDocumentOpenContext,
		_token: vscode.CancellationToken,
	): Promise<JiscribeImageDocument> {
		// ホットイグジット復元時はバックアップの方を読む（URI は元ファイルのまま）
		const readUri = openContext.backupId
			? vscode.Uri.parse(openContext.backupId)
			: uri;
		const kind = kindFromPath(uri.path);
		const bytes = await vscode.workspace.fs.readFile(readUri);
		return new JiscribeImageDocument(
			uri,
			kind,
			bytes,
			extractSourceFromImage(kind, bytes),
		);
	}

	/** エディタ（Webview）を初期化し、ドキュメントとのメッセージ配線を行う。 */
	public async resolveCustomEditor(
		document: JiscribeImageDocument,
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

					case "imageExportResult": {
						const resolve = this.pendingExports.get(message.requestId);
						if (resolve) {
							this.pendingExports.delete(message.requestId);
							resolve(message.data);
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
		document: JiscribeImageDocument,
		token: vscode.CancellationToken,
	): Promise<void> {
		const bytes = await this.renderCurrentImage(document);
		if (token.isCancellationRequested) {
			return;
		}
		await vscode.workspace.fs.writeFile(document.uri, bytes);
		document.savedBytes = bytes;
	}

	/**
	 * 名前を付けて保存。保存先の拡張子で画像形式を決める（`document.kind` では
	 * なく `destination` を見る）。`.jis.png` を `.jis.svg` として保存するような
	 * フォーマット跨ぎでも、保存先形式のバイト列を書く。
	 */
	public async saveCustomDocumentAs(
		document: JiscribeImageDocument,
		destination: vscode.Uri,
		token: vscode.CancellationToken,
	): Promise<void> {
		const destinationKind = kindFromPath(destination.path);
		const bytes = await this.renderCurrentImage(document, destinationKind);
		if (token.isCancellationRequested) {
			return;
		}
		await vscode.workspace.fs.writeFile(destination, bytes);
	}

	/** 変更の破棄（Revert File）。ファイルの内容へ巻き戻す。 */
	public async revertCustomDocument(
		document: JiscribeImageDocument,
		_token: vscode.CancellationToken,
	): Promise<void> {
		const bytes = await vscode.workspace.fs.readFile(document.uri);
		document.savedBytes = bytes;
		document.sourceText = extractSourceFromImage(document.kind, bytes);
		this.pushSourceToWebview(document);
	}

	/**
	 * ホットイグジット用バックアップ。エディタが非表示のタイミングでも呼ばれ
	 * るため、Webview への往復に依存しない埋め込みフォールバックで確実に書く
	 * （画像は前回保存時のままでも、ソースさえ残れば編集内容は復元できる）。
	 */
	public async backupCustomDocument(
		document: JiscribeImageDocument,
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
	private pushSourceToWebview(document: JiscribeImageDocument): void {
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
		document: JiscribeImageDocument,
	): void {
		const message: ExtensionToWebviewMessage = {
			type: "update",
			data: document.sourceText ?? "",
			docType: document.kind,
		};
		panel.webview.postMessage(message);
	}

	/**
	 * 現在のソースを反映した画像バイト列を `targetKind` 形式で得る。
	 * 第一候補は Webview での再レンダリング（fit-to-content・最新の見た目）。
	 * Webview が無い/応答しない場合は、最後に保存した画像へ最新ソースを
	 * 埋め込み直したものを返す（同一形式のときのみ・下記参照）。
	 */
	private async renderCurrentImage(
		document: JiscribeImageDocument,
		targetKind: JiscribeImageKind = document.kind,
	): Promise<Uint8Array> {
		const panel = this.panels.get(document);
		// retainContextWhenHidden: false のため、非表示タブの Webview は JS
		// コンテキストが破棄済みで postMessage に応答しない。タイムアウトを
		// 待たずに即フォールバックする。
		if (panel && panel.visible) {
			const data = await this.requestImageFromWebview(panel, targetKind);
			if (data !== null) {
				return targetKind === "png"
					? new Uint8Array(Buffer.from(data, "base64"))
					: new Uint8Array(Buffer.from(data, "utf8"));
			}
		}
		return this.embedCurrentSource(document, targetKind);
	}

	/** Webview に画像生成を依頼し、応答を待つ（タイムアウト付き）。 */
	private requestImageFromWebview(
		panel: vscode.WebviewPanel,
		format: JiscribeImageKind,
	): Promise<string | null> {
		const requestId = this.nextRequestId++;
		const message: ExtensionToWebviewMessage = {
			type: "requestImageExport",
			requestId,
			format,
		};
		return new Promise<string | null>((resolve) => {
			const timeout = setTimeout(() => {
				this.pendingExports.delete(requestId);
				resolve(null);
			}, IMAGE_EXPORT_TIMEOUT_MS);
			this.pendingExports.set(requestId, (data) => {
				clearTimeout(timeout);
				resolve(data);
			});
			panel.webview.postMessage(message);
		});
	}

	/**
	 * 保存フォールバック: 最後に保存した画像バイト列へ現在のソースを
	 * 埋め込み直す。画像の見た目は前回保存時のままになるが、ソース
	 * （編集内容）は失われない。ソースが無い/画像が壊れている場合は
	 * 画像をそのまま返す。
	 *
	 * 土台の `savedBytes` は `document.kind` 形式なので、別形式（`targetKind`
	 * が異なるフォーマット跨ぎの Save As）はここでは作れない。誤形式のバイト列
	 * を書くとファイルが壊れて図が失われるため、フォールバック不能として失敗
	 * させ、VSCode 側にエラーを通知させる。
	 */
	private embedCurrentSource(
		document: JiscribeImageDocument,
		targetKind: JiscribeImageKind = document.kind,
	): Uint8Array {
		if (targetKind !== document.kind) {
			throw new Error(
				`Cannot save as .jis.${targetKind}: the canvas must be open and ` +
					`visible to render a ${targetKind.toUpperCase()} image.`,
			);
		}
		if (document.sourceText === null) {
			return document.savedBytes;
		}
		if (document.kind === "png") {
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
		const replacedText = replaceCanvasSourceInSvgText(
			Buffer.from(document.savedBytes).toString("utf8"),
			document.sourceText,
		);
		return replacedText === null
			? document.savedBytes
			: new Uint8Array(Buffer.from(replacedText, "utf8"));
	}
}

/** URI パスから画像種別を判定する（`.jis.svg` 以外は png 扱い）。 */
function kindFromPath(path: string): JiscribeImageKind {
	return path.endsWith(".jis.svg") ? "svg" : "png";
}

/** 画像バイト列から埋め込みソース JSON を取り出す（無ければ null）。 */
function extractSourceFromImage(
	kind: JiscribeImageKind,
	bytes: Uint8Array,
): string | null {
	return kind === "png"
		? readPngTextChunk(bytes, PNG_SOURCE_KEYWORD)
		: extractCanvasSourceFromSvgText(Buffer.from(bytes).toString("utf8"));
}

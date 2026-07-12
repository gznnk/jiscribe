/**
 * VSCode Extension と Webview 間の通信メッセージ型定義
 *
 * 背景:
 *   VSCode の Custom Editor では、Extension（Node.js プロセス）と Webview（ブラウザ環境）
 *   が分離されており、直接関数を呼び出すことができません。
 *   代わりに postMessage() で JSON シリアライズ可能なオブジェクトをやり取りします。
 *
 *   型定義を両側で共有することで、送受信のフォーマットが食い違っているバグを
 *   TypeScript のコンパイル時に検出できるようにします。
 */

/**
 * 編集対象ドキュメントの種類。update メッセージの data の解釈を決める。
 *
 * - "json": `.jis.json`。data は JSON テキストそのもの
 * - "svg" / "png": `.jis.svg` / `.jis.png`。Extension が埋め込みソースを抽出済みで、
 *   双方向とも data は JSON テキスト（埋め込みが無い場合は空文字）。
 *   画像そのもの（SVG 全文 / PNG バイト列）は保存時に requestImageExport /
 *   imageExportResult で別途生成・受け渡しする
 */
export type JiscribeDocType = "json" | "svg" | "png";

/**
 * Webview → Extension 方向のメッセージ
 *
 * Webview 側で acquireVsCodeApi().postMessage() を呼ぶときの型。
 */
export type WebviewToExtensionMessage =
	/** Webview の初期化が完了し、ファイル内容の初回送信を要求する */
	| { type: "ready" }
	/**
	 * Canvas 上の編集内容の書き戻しを要求する。data は常に doc の JSON テキスト
	 * （画像ドキュメントでは Extension 側が dirty 管理し、画像化は保存時に行う）。
	 */
	| { type: "update"; data: string; saveNonce: string }
	/** Canvas 上で Undo が要求された（ホストエディタの undo コマンドに委譲する） */
	| { type: "undo" }
	/** Canvas 上で Redo が要求された（ホストエディタの redo コマンドに委譲する） */
	| { type: "redo" }
	/**
	 * requestImageExport への応答。data はソース埋め込み済みの画像
	 * （png: PNG バイト列の base64 / svg: SVG テキスト）。
	 * Canvas 未マウント等で生成できなかった場合は null。
	 */
	| { type: "imageExportResult"; requestId: number; data: string | null }
	/**
	 * エクスポートダイアログで生成した画像のワークスペース保存を要求する。
	 * base64 は画像バイト列（PNG / SVG テキストとも base64 で統一）。
	 * ファイル名の導出と保存ダイアログの表示は Extension 側が担う。
	 */
	| {
			type: "exportImage";
			format: "png" | "svg";
			base64: string;
			includesSource: boolean;
	  };

/**
 * Extension → Webview 方向のメッセージ
 *
 * Extension 側で webviewPanel.webview.postMessage() を呼ぶときの型。
 */
export type ExtensionToWebviewMessage =
	/**
	 * ファイルの最新内容を Webview へ送信する。
	 * data の中身は docType に依存する（JiscribeDocType を参照）。
	 * docType 省略時は "json"（後方互換）。
	 */
	| {
			type: "update";
			data: string;
			saveNonce?: string;
			docType?: JiscribeDocType;
	  }
	/**
	 * `.jis.png` / `.jis.svg` の保存時に、現在のキャンバスの画像
	 * （ソース埋め込み済み）の生成を要求する。Webview は imageExportResult で応答する。
	 */
	| { type: "requestImageExport"; requestId: number; format: "png" | "svg" };

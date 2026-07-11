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
 * - "svg":  `.jis.svg`。Extension→Webview は SVG 全文（Webview が <metadata> から
 *           ソースを抽出）、Webview→Extension も SVG 全文（再レンダリング済み）
 * - "png":  `.jis.png`。Extension→Webview は抽出済み JSON テキスト（埋め込みが
 *           無い場合は空文字）、Webview→Extension も JSON テキスト。画像バイト列は
 *           保存時に requestPngExport / pngExportResult で別途やり取りする
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
	 * Canvas 上の編集内容をファイルへ書き戻すよう要求する。
	 * data の中身は docType に依存する（JiscribeDocType を参照）。
	 */
	| { type: "update"; data: string; saveNonce: string }
	/**
	 * 書き戻しペイロードの生成に失敗した（.jis.svg の SVG 再レンダリング失敗等）。
	 * ファイルは更新されないため、Extension は保存失敗としてユーザーへ通知する。
	 */
	| { type: "updateError"; reason: string }
	/** Canvas 上で Undo が要求された（ホストエディタの undo コマンドに委譲する） */
	| { type: "undo" }
	/** Canvas 上で Redo が要求された（ホストエディタの redo コマンドに委譲する） */
	| { type: "redo" }
	/**
	 * requestPngExport への応答。base64 は PNG バイト列（ソース埋め込み済み）。
	 * Canvas 未マウント等で生成できなかった場合は null。
	 */
	| { type: "pngExportResult"; requestId: number; base64: string | null }
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
	 * `.jis.png` の保存時に、現在のキャンバスの PNG（ソース埋め込み済み）の
	 * 生成を要求する。Webview は pngExportResult で応答する。
	 */
	| { type: "requestPngExport"; requestId: number };

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
 * Webview → Extension 方向のメッセージ
 *
 * Webview 側で acquireVsCodeApi().postMessage() を呼ぶときの型。
 */
export type WebviewToExtensionMessage =
	/** Webview の初期化が完了し、ファイル内容の初回送信を要求する */
	| { type: "ready" }
	/** Canvas 上の編集内容を JSON 文字列としてファイルへ書き戻すよう要求する */
	| { type: "update"; data: string }
	/** Canvas 上で Undo が要求された（ホストエディタの undo コマンドに委譲する） */
	| { type: "undo" }
	/** Canvas 上で Redo が要求された（ホストエディタの redo コマンドに委譲する） */
	| { type: "redo" };

/**
 * Extension → Webview 方向のメッセージ
 *
 * Extension 側で webviewPanel.webview.postMessage() を呼ぶときの型。
 */
export type ExtensionToWebviewMessage =
	/** ファイルの最新内容を JSON 文字列として Webview へ送信する */
	{ type: "update"; data: string };

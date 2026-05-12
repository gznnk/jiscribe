import {
	Canvas,
	CanvasErrorScreen,
	CanvasValidationError,
	parseAndValidateCanvasDoc,
	type CanvasDoc,
	type SemanticDiagnostic,
} from "@workspace/svg-canvas-2";
import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import type {
	ExtensionToWebviewMessage,
	WebviewToExtensionMessage,
} from "../types/messages";

/**
 * VSCode の Webview 環境でのみ利用できる API の型定義。
 * acquireVsCodeApi() は VSCode が Webview 内に自動で注入するグローバル関数。
 * 通常の Web ブラウザには存在しないため、declare で型だけ宣言する。
 */
declare const acquireVsCodeApi: () => {
	postMessage(message: WebviewToExtensionMessage): void;
	getState(): unknown;
	setState(state: unknown): void;
};

// acquireVsCodeApi() はページの生存期間中に1回しか呼べないため、
// モジュールレベルで一度だけ呼び出してキャッシュする。
const vscode = acquireVsCodeApi();

/**
 * デバウンス関数。
 * 連続して呼び出されたとき、最後の呼び出しから ms ミリ秒後に1回だけ fn を実行する。
 *
 * Canvas の編集操作（ドラッグ・リサイズ等）は高頻度で発生するため、
 * そのたびに JSON.stringify してファイルへ書き込むとパフォーマンスが低下する。
 * デバウンスを挟むことで書き込み頻度を制限する（#11 修正）。
 *
 * @param fn  デバウンス対象の関数
 * @param ms  待機時間（ミリ秒）
 */
function debounce<Args extends unknown[]>(
	fn: (...args: Args) => void,
	ms: number,
): (...args: Args) => void {
	let timerId: ReturnType<typeof setTimeout> | undefined;
	return (...args: Args) => {
		clearTimeout(timerId);
		timerId = setTimeout(() => fn(...args), ms);
	};
}

/**
 * Canvas エディタのルートコンポーネント。
 *
 * 状態の種類:
 *   - canvasDoc: バリデーション済みの CanvasDoc（正常時に Canvas を表示）
 *   - diagnostics: セマンティクスエラー一覧（Canvas UI の代わりにエラー画面を表示）
 *   - parseError: JSON 構文エラーメッセージ（JSON が壊れている場合に表示）
 *
 * これら3つは排他的で、同時に複数が表示されることはない。
 */
function App() {
	const [canvasDoc, setCanvasDoc] = useState<CanvasDoc | null>(null);
	const [diagnostics, setDiagnostics] = useState<SemanticDiagnostic[]>([]);
	const [parseError, setParseError] = useState<string>("");

	// debounce した関数は、コンポーネントの再レンダリングをまたいで
	// 同じ関数インスタンスを維持する必要がある（再生成するとタイマーがリセットされる）。
	// useRef で関数インスタンスを保持し、useCallback で安定した参照を返す。
	const debouncedPostRef = useRef(
		debounce((doc: CanvasDoc) => {
			const message: WebviewToExtensionMessage = {
				type: "update",
				data: JSON.stringify(doc, null, 2),
			};
			vscode.postMessage(message);
		}, 150),
	);

	const handleCommit = useCallback((doc: CanvasDoc) => {
		debouncedPostRef.current(doc);
	}, []);

	useEffect(() => {
		/**
		 * Extension からのメッセージを受信するハンドラ。
		 *
		 * ファイルの内容が変わるたびに Extension から "update" メッセージが届く。
		 * 2段階でパース・バリデーションを行い、結果に応じて表示を切り替える。
		 */
		const messageHandler = (event: MessageEvent) => {
			const message = event.data as ExtensionToWebviewMessage;

			switch (message.type) {
				case "update": {
					// Step 1: JSON 構文チェック
					let parsed: unknown;
					try {
						parsed = JSON.parse(message.data);
					} catch (err) {
						const msg = err instanceof Error ? err.message : "JSON parse error";
						setParseError(msg);
						setDiagnostics([]);
						setCanvasDoc(null);
						return;
					}

					// Step 2: CanvasDoc セマンティクスチェック
					// parseAndValidateCanvasDoc() はエラー時に CanvasValidationError をスローする。
					try {
						const validated = parseAndValidateCanvasDoc(parsed);
						setCanvasDoc(validated);
						setDiagnostics([]);
						setParseError("");
					} catch (err) {
						if (err instanceof CanvasValidationError) {
							// セマンティクスエラー（重複 ID 等）はエラー画面で表示
							setDiagnostics(err.specifics);
							setCanvasDoc(null);
							setParseError("");
						} else {
							// 予期しないエラー
							setParseError(
								err instanceof Error ? err.message : "Unknown error",
							);
							setCanvasDoc(null);
						}
					}
					break;
				}
			}
		};

		window.addEventListener("message", messageHandler);

		// Extension へ「Webview の準備ができた」と通知し、ファイルの初期内容を要求する
		vscode.postMessage({ type: "ready" });

		// useEffect のクリーンアップ関数:
		// コンポーネントがアンマウントされたとき（または deps が変わったとき）に
		// イベントリスナーを削除してメモリリークを防ぐ。
		return () => {
			window.removeEventListener("message", messageHandler);
		};
	}, []); // 空の依存配列 = マウント時に1回だけ実行

	// ---- 表示の優先順位 ----
	// JSON 構文エラー > セマンティクスエラー > Canvas 表示 > ロード中

	if (parseError) {
		return (
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					width: "100%",
					height: "100vh",
					color: "#dc2626",
					fontFamily: "monospace",
					padding: "20px",
					boxSizing: "border-box",
				}}
			>
				<div style={{ fontWeight: "bold", marginBottom: "8px" }}>
					JSON Parse Error
				</div>
				<div style={{ fontSize: "12px", color: "#6b7280" }}>{parseError}</div>
			</div>
		);
	}

	if (diagnostics.length > 0) {
		return (
			<div style={{ width: "100%", height: "100vh" }}>
				<CanvasErrorScreen diagnostics={diagnostics} />
			</div>
		);
	}

	if (canvasDoc) {
		return (
			<div style={{ width: "100%", height: "100vh" }}>
				<Canvas canvasDoc={canvasDoc} onCommit={handleCommit} />
			</div>
		);
	}

	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				width: "100%",
				height: "100vh",
				color: "#6b7280",
			}}
		>
			Loading canvas...
		</div>
	);
}

// (#14) script タグを body の末尾に配置しているため、
// このコードが実行される時点で DOM は構築済みであることが保証されている。
// ただし null チェックを残すことで、将来的な HTML 構造の変更に対して安全にしておく。
const container = document.getElementById("root");
if (container) {
	const root = createRoot(container);
	root.render(<App />);
}

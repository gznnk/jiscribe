import {
	Canvas,
	parseCanvasText,
	type CanvasDoc,
} from "@workspace/svg-canvas-2";
import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import { CanvasErrorNotice } from "./CanvasErrorNotice";
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
 *   - hasSemanticError: 検証エラーの有無（Canvas UI の代わりにエラー通知を表示）
 *   - parseError: JSON 構文エラーメッセージ（JSON が壊れている場合に表示）
 *
 * エラー詳細は Extension 側（DiagnosticProvider）が Problems パネルへ出すため、
 * Webview ではエラーの有無だけを保持する。
 * これら3つは排他的で、同時に複数が表示されることはない。
 */
function App() {
	const [canvasDoc, setCanvasDoc] = useState<CanvasDoc | null>(null);
	const [syncNonce, setSyncNonce] = useState<string | undefined>(undefined);
	const [hasSemanticError, setHasSemanticError] = useState(false);
	const [parseError, setParseError] = useState<string>("");

	// ファイルから読み込んだ $schema を保持する。
	// Canvas の onCommit が返す doc（canvasToDoc の出力）には $schema が含まれないため、
	// 書き込み時にここから復元しないと保存のたびに $schema がファイルから消えてしまう。
	// $schema は描画ステートとは無関係なファイルメタデータなので、Webview 側で保持・付与する。
	const schemaRef = useRef<string | undefined>(undefined);

	// debounce した関数は、コンポーネントの再レンダリングをまたいで
	// 同じ関数インスタンスを維持する必要がある（再生成するとタイマーがリセットされる）。
	// useRef で関数インスタンスを保持し、useCallback で安定した参照を返す。
	const debouncedPostRef = useRef(
		debounce((doc: CanvasDoc, saveNonce: string) => {
			const message: WebviewToExtensionMessage = {
				type: "update",
				data: JSON.stringify(doc, null, 2),
				saveNonce,
			};
			vscode.postMessage(message);
		}, 150),
	);

	const handleCommit = useCallback((doc: CanvasDoc, saveNonce: string) => {
		// 読み込み時に保持した $schema を先頭キーとして復元してから書き込む
		const docWithSchema: CanvasDoc =
			schemaRef.current !== undefined
				? { $schema: schemaRef.current, ...doc }
				: doc;
		debouncedPostRef.current(docWithSchema, saveNonce);
	}, []);

	const handleUndo = useCallback(() => {
		vscode.postMessage({ type: "undo" });
	}, []);

	const handleRedo = useCallback(() => {
		vscode.postMessage({ type: "redo" });
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
					// JSON 構文チェック → CanvasDoc セマンティクスチェックを共通ヘルパーへ委譲する。
					// parseCanvasText() は例外を投げず判別可能なユニオンを返すため、
					// 拡張側（DiagnosticProvider）と同一ロジックで全ケースを扱える。
					const result = parseCanvasText(message.data);
					switch (result.kind) {
						case "ok":
							schemaRef.current = result.doc.$schema;
							setSyncNonce(message.saveNonce);
							setCanvasDoc(result.doc);
							setHasSemanticError(false);
							setParseError("");
							break;

						case "semantic-error":
							// セマンティクスエラー（重複 ID 等）はエラー通知を表示。
							// 詳細は Problems パネル側に出るためここでは有無のみ持つ。
							setHasSemanticError(true);
							setCanvasDoc(null);
							setParseError("");
							break;

						case "syntax-error":
						case "internal-error":
							// JSON 構文エラー・予期しないエラーはメッセージで表示
							setParseError(result.message);
							setHasSemanticError(false);
							setCanvasDoc(null);
							break;
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

	if (hasSemanticError) {
		return <CanvasErrorNotice />;
	}

	if (canvasDoc) {
		return (
			<div style={{ width: "100%", height: "100vh" }}>
				<Canvas
					canvasDoc={canvasDoc}
					syncNonce={syncNonce}
					onCommit={handleCommit}
					onUndo={handleUndo}
					onRedo={handleRedo}
				/>
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

import {
	Canvas,
	extractCanvasSource,
	parseCanvasText,
	type Camera,
	type CanvasDoc,
	type CanvasExportHandle,
	type CanvasExportImagePayload,
} from "@workspace/canvas";
import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import { CanvasErrorNotice } from "./CanvasErrorNotice";
import { vscodeCanvasTheme } from "./vscodeCanvasTheme";
import type {
	ExtensionToWebviewMessage,
	JiscribeDocType,
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
 * getState/setState に退避する Webview ローカル状態。retainContextWhenHidden:
 * false（#138）でタブ非表示時に Webview が破棄されても、この内容だけはリロードを
 * またいで保持されるため、ビューポート（カメラ）を退避して再マウント時に復元する。
 * ドキュメントは "ready" 経由で Extension が再送するので含めない。
 */
type PersistedState = {
	camera?: Camera;
};

const readPersistedCamera = (): Camera | undefined => {
	const state = vscode.getState() as PersistedState | null;
	return state?.camera ?? undefined;
};

const persistCamera = (camera: Camera): void => {
	const state = (vscode.getState() as PersistedState | null) ?? {};
	vscode.setState({ ...state, camera });
};

/**
 * `.jis.svg` のテキストから <metadata> に埋め込まれたソース JSON を取り出す。
 * SVG として解釈できない、または埋め込みが無い場合は null。
 */
const extractSourceFromSvgText = (svgText: string): string | null => {
	const parsed = new DOMParser().parseFromString(svgText, "image/svg+xml");
	if (parsed.getElementsByTagName("parsererror").length > 0) {
		return null;
	}
	const source = extractCanvasSource(
		parsed.documentElement as unknown as SVGSVGElement,
	);
	return source ? JSON.stringify(source) : null;
};

/** Blob を base64 文字列（データ URL のヘッダ無し）へ変換する。 */
const blobToBase64 = (blob: Blob): Promise<string> =>
	new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			resolve((reader.result as string).split(",")[1] ?? "");
		};
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(blob);
	});

/**
 * Canvas エディタのルートコンポーネント。
 *
 * 状態の種類:
 *   - canvasDoc: バリデーション済みの CanvasDoc（正常時に Canvas を表示）
 *   - hasSemanticError: 検証エラーの有無（Canvas UI の代わりにエラー通知を表示）
 *   - parseError: JSON 構文エラーメッセージ（JSON が壊れている場合に表示）
 *   - missingEmbeddedSource: 画像（.jis.svg / .jis.png）にソース埋め込みが無い
 *
 * エラー詳細は Extension 側（DiagnosticProvider）が Problems パネルへ出すため、
 * Webview ではエラーの有無だけを保持する。
 * これらは排他的で、同時に複数が表示されることはない。
 */
function App() {
	const [canvasDoc, setCanvasDoc] = useState<CanvasDoc | null>(null);
	const [syncNonce, setSyncNonce] = useState<string | undefined>(undefined);
	const [hasSemanticError, setHasSemanticError] = useState(false);
	const [parseError, setParseError] = useState<string>("");
	const [missingEmbeddedSource, setMissingEmbeddedSource] = useState(false);

	// 現在のドキュメント種別。コミット時のペイロード生成が参照する。
	// メッセージハンドラ／コールバックの再購読を避けるため ref で持つ。
	const docTypeRef = useRef<JiscribeDocType>("json");

	// Canvas の imperative エクスポート API（.jis.svg / .jis.png の書き戻しに使う）
	const exportHandleRef = useRef<CanvasExportHandle>(null);

	// Controlled camera, restored from persisted state on reload (undefined on
	// first open → Canvas uses its doc-derived default).
	const [camera, setCamera] = useState<Camera | undefined>(readPersistedCamera);

	// Mirror pan/zoom into state and persist it so the view survives tab hide.
	const handleViewportChange = useCallback((next: Camera) => {
		setCamera(next);
		persistCamera(next);
	}, []);

	// 高頻度コミット（キーリピート等）の間引きは Canvas 側の保存スケジューラが
	// 担うため（#125）、ここではデバウンスせずそのまま Extension へ送る。
	//
	// 書き戻すペイロードは docType に依存する:
	//   - json: doc の JSON テキスト
	//   - svg:  再レンダリングした SVG 全文（ソース埋め込み済み、draw.io 方式）
	//   - png:  doc の JSON テキスト（画像バイト列は保存時に requestPngExport で生成）
	const handleCommit = useCallback((doc: CanvasDoc, saveNonce: string) => {
		let data: string;
		if (docTypeRef.current === "svg") {
			let svgText: string | null = null;
			let renderError: unknown = null;
			try {
				svgText = exportHandleRef.current?.toSvgString() ?? null;
			} catch (err) {
				renderError = err;
			}
			if (!svgText) {
				// Canvas 未マウント等で SVG を生成できない場合、JSON を書き込むと
				// .jis.svg ファイルを壊すため、このコミットは書き戻さない。
				// この時点で saveNonce は消費済みで再送されないため、黙って捨てると
				// ユーザーは保存済みと誤認する。Extension へ通知して失敗を可視化する
				// （次の正常なコミットが全文を書き戻すので、それまでの警告が目的）。
				console.error(
					"[Jiscribe] Failed to render .jis.svg for commit:",
					renderError,
				);
				vscode.postMessage({
					type: "updateError",
					reason:
						renderError instanceof Error
							? renderError.message
							: "Failed to render the canvas as SVG",
				});
				return;
			}
			data = svgText;
		} else {
			data = JSON.stringify(doc, null, 2);
		}
		const message: WebviewToExtensionMessage = {
			type: "update",
			data,
			saveNonce,
		};
		vscode.postMessage(message);
	}, []);

	// エクスポートダイアログの結果をワークスペース保存へ委譲する。
	// 保存先の決定（保存ダイアログ）とファイル名導出は Extension 側の責務。
	const handleExportImage = useCallback((payload: CanvasExportImagePayload) => {
		blobToBase64(payload.data).then(
			(base64) => {
				vscode.postMessage({
					type: "exportImage",
					format: payload.format,
					base64,
					includesSource: payload.includesSource,
				});
			},
			(err: unknown) => {
				console.error("[Jiscribe] Failed to encode exported image:", err);
			},
		);
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
					const docType = message.docType ?? "json";
					docTypeRef.current = docType;

					// 画像ドキュメントはまずソース JSON を取り出す。
					//   - svg: SVG 全文が届くので <metadata> から抽出する
					//   - png: Extension が抽出済み（埋め込み無しは空文字）
					let jsonText = message.data;
					if (docType === "svg") {
						const extracted = extractSourceFromSvgText(message.data);
						if (extracted === null) {
							setMissingEmbeddedSource(true);
							setCanvasDoc(null);
							setHasSemanticError(false);
							setParseError("");
							break;
						}
						jsonText = extracted;
					}
					if (docType === "png" && jsonText === "") {
						setMissingEmbeddedSource(true);
						setCanvasDoc(null);
						setHasSemanticError(false);
						setParseError("");
						break;
					}
					setMissingEmbeddedSource(false);

					// JSON 構文チェック → CanvasDoc セマンティクスチェックを共通ヘルパーへ委譲する。
					// parseCanvasText() は例外を投げず判別可能なユニオンを返すため、
					// 拡張側（DiagnosticProvider）と同一ロジックで全ケースを扱える。
					const result = parseCanvasText(jsonText);
					switch (result.kind) {
						case "ok":
							setSyncNonce(message.saveNonce);
							setCanvasDoc(result.doc);
							setHasSemanticError(false);
							setParseError("");
							break;

						case "structure-error":
						case "semantic-error":
							// 構造エラー（型・必須フィールド）／セマンティクスエラー（重複 ID 等）は
							// エラー通知を表示。詳細は Problems パネル側に出るためここでは有無のみ持つ。
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

				case "requestPngExport": {
					// .jis.png の保存: 現在のキャンバスをラスタライズして返す。
					// 失敗時も必ず応答し（base64: null）、Extension 側のフォールバック
					// （旧画像＋新ソース再埋め込み）に切り替えさせる。
					const respond = (base64: string | null) => {
						vscode.postMessage({
							type: "pngExportResult",
							requestId: message.requestId,
							base64,
						});
					};
					const handle = exportHandleRef.current;
					if (!handle) {
						respond(null);
						break;
					}
					handle
						.toPngBlob()
						.then((blob) => (blob ? blobToBase64(blob) : null))
						.then(respond, (err: unknown) => {
							console.error("[Jiscribe] PNG export failed:", err);
							respond(null);
						});
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
	// ソース埋め込み無し > JSON 構文エラー > セマンティクスエラー > Canvas 表示 > ロード中

	if (missingEmbeddedSource) {
		return (
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					width: "100%",
					height: "100vh",
					color: "#6b7280",
					fontFamily: "monospace",
					padding: "20px",
					boxSizing: "border-box",
					textAlign: "center",
				}}
			>
				<div style={{ fontWeight: "bold", marginBottom: "8px" }}>
					No embedded jiscribe source
				</div>
				<div style={{ fontSize: "12px" }}>
					This image does not contain an editable jiscribe canvas. Only images
					exported from jiscribe (.jis.png / .jis.svg) can be edited.
				</div>
			</div>
		);
	}

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
					viewport={camera}
					onViewportChange={handleViewportChange}
					onCommit={handleCommit}
					onUndo={handleUndo}
					onRedo={handleRedo}
					theme={vscodeCanvasTheme}
					exportRef={exportHandleRef}
					onExportImage={handleExportImage}
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

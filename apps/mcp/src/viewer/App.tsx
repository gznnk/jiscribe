// キャンバスビューア。MCP プロセスが立てたホストへ WebSocket で繋ぎ、AI が
// 書き換えたファイルを映し、人が直した結果を書き戻す。
//
// 正本はファイルなので、ここは doc を握らない。届いた本文をパースして描き、
// 人が編集したらワークスペースへ保存し直す。
//
// もう 1 つの役目が、描かれた結果にしか答えの無い問い合わせ（撮影・カメラ・選択・
// 計測）に答えること。ファイルを読んでも分からないので AI はここへ聞きに来る。

import type { AiHandleOp } from "@jiscribe/ai-tools";
import {
	applyHandleOp,
	captureCanvasImage,
	createCanvasHandleControl,
	type AiHandleControl,
	type CapturePng,
} from "@jiscribe/ai-tools/client";
import type {
	CanvasDoc,
	CanvasHandle,
	CanvasPngExportOptions,
	OpenReferencePayload,
} from "@jiscribe/canvas";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { canvasParser } from "./canvasPlugins";
import { CanvasSurface } from "./CanvasSurface";
import { saveFile } from "./files";
import type {
	CanvasHostClientMessage,
	CanvasHostServerMessage,
} from "../shared/canvasHostProtocol";

/**
 * 編集が落ち着いてから書き出すまでの待ち。ドラッグ 1 回ごとに書くと、AI 側が
 * 読んだ瞬間に中途半端な姿を掴みうるので、短く溜めてからにする
 */
const SAVE_DEBOUNCE_MS = 500;

/** 再接続の間隔。ホストの立て直しを跨いで復帰できればよいので控えめに伸ばす */
const RECONNECT_BASE_DELAY_MS = 1_000;
const RECONNECT_MAX_DELAY_MS = 5_000;

const emptyDoc: CanvasDoc = { version: 1, root: [] };

const EXTERNAL_URL_PATTERN = /^https?:\/\//i;

/** ホスト側の書き戻し（canvasStore の serializeCanvasFile）と同じ整形にする */
const serializeDoc = (doc: CanvasDoc): string =>
	`${JSON.stringify(doc, null, "\t")}\n`;

const formatParseError = (
	result: Exclude<ReturnType<typeof canvasParser.parse>, { kind: "ok" }>,
): string => {
	switch (result.kind) {
		case "syntax-error":
		case "internal-error":
			return result.message;
		case "structure-error":
		case "semantic-error":
			return result.diagnostics
				.map((diagnostic) => `${diagnostic.path}: ${diagnostic.message}`)
				.join("\n");
	}
};

const isCanvasHostServerMessage = (
	value: unknown,
): value is CanvasHostServerMessage => {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const frame = value as Record<string, unknown>;
	switch (frame.type) {
		case "openCanvas":
		case "docChanged":
			return (
				typeof frame.relPath === "string" && typeof frame.docText === "string"
			);
		case "docError":
			return (
				typeof frame.relPath === "string" && typeof frame.message === "string"
			);
		case "handleOpRequest":
			return (
				typeof frame.requestId === "string" &&
				typeof frame.op === "object" &&
				frame.op !== null
			);
		case "closeViewer":
			return true;
		default:
			return false;
	}
};

export function App() {
	const [doc, setDoc] = useState<CanvasDoc>(emptyDoc);
	const [openPath, setOpenPath] = useState<string | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isConnected, setIsConnected] = useState(false);

	const latestDocRef = useRef<CanvasDoc>(emptyDoc);
	const openPathRef = useRef<string | null>(null);
	// 自分とホストが同じだと分かっている最後の本文。保存のこだまで再描画しないための控え
	const syncedTextRef = useRef<string | null>(null);
	const socketRef = useRef<WebSocket | null>(null);
	const saveTimerRef = useRef<number | null>(null);
	const canvasHandleRef = useRef<CanvasHandle | null>(null);

	const registerCanvas = useCallback((handle: CanvasHandle | null) => {
		canvasHandleRef.current = handle;
	}, []);

	const capturePng = useCallback<CapturePng>(
		async (options?: CanvasPngExportOptions) =>
			(await canvasHandleRef.current?.export.capturePng(options))?.blob ?? null,
		[],
	);

	const handleControl = useMemo<AiHandleControl>(
		() => createCanvasHandleControl(() => canvasHandleRef.current),
		[],
	);

	/**
	 * 描かれた結果への問い合わせに答える。撮影だけは非同期で画像を伴うため、
	 * canvas-agent 側でも経路が分かれている
	 */
	const runHandleOp = useCallback(
		async (op: AiHandleOp) => {
			try {
				return op.kind === "captureCanvas"
					? await captureCanvasImage(capturePng)
					: applyHandleOp(op, handleControl);
			} catch (error) {
				// 投げたまま返さないと、ホストは 15 秒待って時間切れにするしかなく、
				// AI には理由が何も残らない
				return {
					ok: false,
					text: `the canvas viewer failed to run ${op.kind}: ${error instanceof Error ? error.message : String(error)}`,
				};
			}
		},
		[capturePng, handleControl],
	);

	const applyIncomingDoc = useCallback(
		(relPath: string, docText: string): void => {
			if (docText === syncedTextRef.current) {
				return;
			}
			const result = canvasParser.parse(docText);
			if (result.kind !== "ok") {
				setErrorMessage(formatParseError(result));
				return;
			}
			syncedTextRef.current = docText;
			openPathRef.current = relPath;
			latestDocRef.current = result.doc;
			setOpenPath(relPath);
			setDoc(result.doc);
			setErrorMessage(null);
		},
		[],
	);

	const saveNow = useCallback(async (): Promise<void> => {
		const targetPath = openPathRef.current;
		if (targetPath === null) {
			return;
		}
		const text = serializeDoc(latestDocRef.current);
		if (text === syncedTextRef.current) {
			return;
		}
		// 保存の前に控えておく。ホストの監視がこの書き込みを拾って送り返しても、
		// 一致で弾けるようにする
		const previousSyncedText = syncedTextRef.current;
		syncedTextRef.current = text;
		try {
			await saveFile(targetPath, text);
			setErrorMessage(null);
		} catch (error) {
			// 控えたままだと、同じ内容で保存し直しても冒頭で弾かれて二度と書けない
			syncedTextRef.current = previousSyncedText;
			setErrorMessage(`保存に失敗しました: ${String(error)}`);
			return;
		}
		const socket = socketRef.current;
		if (socket !== null && socket.readyState === WebSocket.OPEN) {
			socket.send(
				JSON.stringify({
					type: "saved",
					relPath: targetPath,
					docText: text,
				} satisfies CanvasHostClientMessage),
			);
		}
	}, []);

	const handleCommit = useCallback(
		(committedDoc: CanvasDoc): void => {
			latestDocRef.current = committedDoc;
			setDoc(committedDoc);
			if (saveTimerRef.current !== null) {
				window.clearTimeout(saveTimerRef.current);
			}
			saveTimerRef.current = window.setTimeout(() => {
				saveTimerRef.current = null;
				void saveNow();
			}, SAVE_DEBOUNCE_MS);
		},
		[saveNow],
	);

	/**
	 * 溜めている編集を書き出してから窓を閉じる。close_canvas はここで閉じたかどうかを
	 * 接続が切れるかで見ているので、閉じられなくても何も返さない
	 */
	const closeWindow = useCallback(async (): Promise<void> => {
		if (saveTimerRef.current !== null) {
			window.clearTimeout(saveTimerRef.current);
			saveTimerRef.current = null;
			await saveNow();
		}
		window.close();
	}, [saveNow]);

	const handleOpenReference = useCallback((payload: OpenReferencePayload) => {
		if (EXTERNAL_URL_PATTERN.test(payload.reference)) {
			window.open(payload.reference, "_blank", "noopener,noreferrer");
			return;
		}
		setErrorMessage(`このビューアが開けない参照です: ${payload.reference}`);
	}, []);

	useEffect(() => {
		let isDisposed = false;
		let reconnectDelayMs = RECONNECT_BASE_DELAY_MS;
		let reconnectTimer: number | null = null;

		const connect = (): void => {
			const socket = new WebSocket(
				`${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws`,
			);
			socketRef.current = socket;

			socket.addEventListener("open", () => {
				if (isDisposed) {
					return;
				}
				reconnectDelayMs = RECONNECT_BASE_DELAY_MS;
				setIsConnected(true);
			});
			socket.addEventListener("message", (event) => {
				let frame: unknown;
				try {
					frame = JSON.parse(String(event.data));
				} catch {
					return;
				}
				if (!isCanvasHostServerMessage(frame)) {
					return;
				}
				switch (frame.type) {
					case "openCanvas":
					case "docChanged":
						applyIncomingDoc(frame.relPath, frame.docText);
						break;
					case "docError":
						setErrorMessage(`${frame.relPath}: ${frame.message}`);
						break;
					case "closeViewer":
						void closeWindow();
						break;
					case "handleOpRequest": {
						const { requestId, op } = frame;
						void runHandleOp(op).then((outcome) => {
							if (socket.readyState !== WebSocket.OPEN) {
								return;
							}
							socket.send(
								JSON.stringify({
									type: "handleOpResult",
									requestId,
									ok: outcome.ok,
									text: outcome.text,
									...(outcome.imagePngBase64 === undefined
										? {}
										: { imagePngBase64: outcome.imagePngBase64 }),
								} satisfies CanvasHostClientMessage),
							);
						});
						break;
					}
				}
			});
			socket.addEventListener("close", () => {
				socketRef.current = null;
				if (isDisposed) {
					return;
				}
				setIsConnected(false);
				reconnectTimer = window.setTimeout(connect, reconnectDelayMs);
				reconnectDelayMs = Math.min(
					reconnectDelayMs * 2,
					RECONNECT_MAX_DELAY_MS,
				);
			});
		};

		connect();

		return () => {
			isDisposed = true;
			if (reconnectTimer !== null) {
				window.clearTimeout(reconnectTimer);
			}
			socketRef.current?.close();
			socketRef.current = null;
		};
	}, [applyIncomingDoc, closeWindow, runHandleOp]);

	// 溜めている編集を、タブを閉じる前に書き出す。破棄されるページからの
	// 書き込みなので届く保証は無く、デバウンス待ちのぶんを拾えれば上出来という扱い
	useEffect(() => {
		const handleBeforeUnload = (): void => {
			if (saveTimerRef.current !== null) {
				window.clearTimeout(saveTimerRef.current);
				saveTimerRef.current = null;
				void saveNow();
			}
		};
		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
	}, [saveNow]);

	return (
		<div className="viewer-root">
			<div className="viewer-status-bar">
				<span className="viewer-path">{openPath ?? "（未指定）"}</span>
				{!isConnected && (
					<span className="viewer-disconnected">ホストと切断されました</span>
				)}
			</div>
			{errorMessage !== null && (
				<div className="viewer-error">{errorMessage}</div>
			)}
			<CanvasSurface
				doc={doc}
				onCommit={handleCommit}
				onOpenReference={handleOpenReference}
				onRegisterCanvas={registerCanvas}
			/>
		</div>
	);
}

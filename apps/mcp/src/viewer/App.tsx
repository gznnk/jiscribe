// The canvas viewer. It connects over WebSocket to the host the MCP process brought
// up, mirrors the file the AI rewrote, and writes back what a person fixed.
//
// The file is the source of truth, so nothing here owns the doc. The text that
// arrives is parsed and drawn, and once a person edits it, it is saved back to the
// workspace.
//
// Its other job is answering the queries only the drawn result can answer (capture,
// camera, selection, measurement). Reading the file does not tell the AI those, so
// it comes here to ask.
//
// The same page is used for the window a person looks at and for the headless one
// the AI looks through (?headless=1). The headless one has nobody to close it, so
// it is the one page that closes itself when the host stays unreachable.

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
import { HEADLESS_VIEWER_QUERY } from "../shared/canvasHostProtocol";

/**
 * How long to wait after the edits settle before writing out. Writing on every
 * single drag would let the AI catch a half-finished shape the moment it reads, so
 * they are buffered briefly first
 */
const SAVE_DEBOUNCE_MS = 500;

/**
 * The reconnect interval. Coming back across a host restart is all it has to do, so
 * it grows modestly
 */
const RECONNECT_BASE_DELAY_MS = 1_000;
const RECONNECT_MAX_DELAY_MS = 5_000;

/**
 * How long a headless window keeps trying to reconnect before closing itself.
 * This is a liveness check on the host, not an idle timeout: the AI may spend
 * minutes thinking without saying a word, and the window has to stay open through
 * that. The reconnect backoff tops out at 5 seconds and the host waits 5 seconds
 * before deciding the viewers are gone, so 15 seconds of silence is several failed
 * attempts past the point where a host that was coming back would have come back.
 * Without this, a window nobody can see would sit there for as long as the machine
 * runs, since there is no one to close it
 */
const HEADLESS_GIVE_UP_MS = 15_000;

/** Whether this window is the AI's eye rather than one a person is looking at */
const isHeadlessWindow = window.location.search
	.slice(1)
	.split("&")
	.includes(HEADLESS_VIEWER_QUERY);

const emptyDoc: CanvasDoc = { version: 1, root: [] };

const EXTERNAL_URL_PATTERN = /^https?:\/\//i;

/**
 * Formats it the same way the host's write-back does (canvasStore's
 * serializeCanvasFile)
 */
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
	// The last text known to be the same here as on the host. Kept so a save's echo
	// does not cause a redraw
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
	 * Answers the queries about the drawn result. Capture alone is asynchronous and
	 * carries an image, so its path is separate on the canvas-agent side as well
	 */
	const runHandleOp = useCallback(
		async (op: AiHandleOp) => {
			try {
				return op.kind === "captureCanvas"
					? await captureCanvasImage(capturePng)
					: applyHandleOp(op, handleControl);
			} catch (error) {
				// Throwing without answering would leave the host with nothing to do but
				// wait 15 seconds and time out, and the AI with no reason at all
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
		// Record it before saving, so that if the host's watch picks this write up and
		// sends it back, it can be rejected on the match
		const previousSyncedText = syncedTextRef.current;
		syncedTextRef.current = text;
		try {
			await saveFile(targetPath, text);
			setErrorMessage(null);
		} catch (error) {
			// Left recorded, saving the same content again would be rejected at the top
			// and never written
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
	 * Writes out the buffered edits, then closes the window. close_canvas reads
	 * whether it closed here from the connection being cut, so nothing is returned
	 * even when it could not close
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
		let giveUpTimer: number | null = null;

		const cancelGiveUp = (): void => {
			if (giveUpTimer !== null) {
				window.clearTimeout(giveUpTimer);
				giveUpTimer = null;
			}
		};

		const connect = (): void => {
			// The query goes on the socket as well as the page: it is how the host
			// tells a headless window from one a person can see
			const socket = new WebSocket(
				`${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws${isHeadlessWindow ? `?${HEADLESS_VIEWER_QUERY}` : ""}`,
			);
			socketRef.current = socket;

			socket.addEventListener("open", () => {
				if (isDisposed) {
					return;
				}
				reconnectDelayMs = RECONNECT_BASE_DELAY_MS;
				cancelGiveUp();
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
				if (isHeadlessWindow && giveUpTimer === null) {
					giveUpTimer = window.setTimeout(() => {
						giveUpTimer = null;
						window.close();
					}, HEADLESS_GIVE_UP_MS);
				}
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
			cancelGiveUp();
			if (reconnectTimer !== null) {
				window.clearTimeout(reconnectTimer);
			}
			socketRef.current?.close();
			socketRef.current = null;
		};
	}, [applyIncomingDoc, closeWindow, runHandleOp]);

	// Write out the buffered edits before the tab closes. It is a write from a page
	// on its way out, so there is no guarantee it arrives; catching what was waiting
	// on the debounce is treated as the best that can be hoped for
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
			{errorMessage !== null && (
				<div className="viewer-error">{errorMessage}</div>
			)}
			<CanvasSurface
				doc={doc}
				relPath={openPath}
				isConnected={isConnected}
				onCommit={handleCommit}
				onOpenReference={handleOpenReference}
				onRegisterCanvas={registerCanvas}
			/>
		</div>
	);
}

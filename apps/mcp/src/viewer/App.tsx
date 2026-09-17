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
import type { CSSProperties } from "react";

import { canvasParser } from "./canvasPlugins";
import { CanvasSurface } from "./CanvasSurface";
import { fetchSessionToken, saveFile } from "./files";
import { createDocImageResolver } from "./resolveDocImage";
import { viewerTheme } from "./viewerTheme";
import type {
	CanvasHostClientMessage,
	CanvasHostServerMessage,
} from "../shared/canvasHostProtocol";
import { HEADLESS_VIEWER_QUERY } from "../shared/canvasHostProtocol";
import { SESSION_TOKEN_QUERY_PARAM } from "../shared/fileApiRoute";

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
 * How long the transient notice stays up, fading in and back out included. The
 * element is dropped on the same timer the animation runs on, so it is passed to
 * the animation rather than repeated in the stylesheet
 */
const NOTICE_DURATION_MS = 2_000;

/**
 * The notice sits outside the Canvas root, where the theme's `--jiscribe-*` do
 * not reach, so its colors are read from the same theme the canvas is drawn with
 */
const noticeStyle: CSSProperties = {
	background: viewerTheme.tokens.surface,
	color: viewerTheme.tokens.foreground,
	borderColor: viewerTheme.tokens.border,
	borderRadius: viewerTheme.tokens.radius,
	boxShadow: viewerTheme.tokens.shadow,
	animationDuration: `${NOTICE_DURATION_MS}ms`,
};

/** What Ctrl+S is answered with, in place of the browser's save dialog */
const AUTO_SAVE_NOTICE = "変更は自動で保存されます";

/**
 * How long a headless window keeps trying to reconnect before closing itself.
 * This is a liveness check on the host, not an idle timeout: the AI may spend
 * minutes thinking without saying a word, and the window has to stay open through
 * that. The reconnect backoff tops out at 5 seconds, so 15 seconds of silence is
 * several failed attempts in a row, which a host that was merely restarting on
 * the same port would have answered.
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
		case "flushEdits":
			return typeof frame.requestId === "string";
		case "closeViewer":
			return true;
		default:
			return false;
	}
};

export function App() {
	const [doc, setDoc] = useState<CanvasDoc>(emptyDoc);
	const [openPath, setOpenPath] = useState<string | null>(null);
	// One resolver per open file: a src is relative to that file's directory
	const resolveImage = useMemo(
		() => (openPath === null ? undefined : createDocImageResolver(openPath)),
		[openPath],
	);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	// The id remounts the element, so pressing again while one is up replays the
	// animation instead of leaving a notice that is already fading
	const [notice, setNotice] = useState<{
		id: number;
		message: string;
	} | null>(null);
	const [isConnected, setIsConnected] = useState(false);

	const latestDocRef = useRef<CanvasDoc>(emptyDoc);
	const openPathRef = useRef<string | null>(null);
	// The last text known to be the same here as on the host. Kept so a save's echo
	// does not cause a redraw
	const syncedTextRef = useRef<string | null>(null);
	const socketRef = useRef<WebSocket | null>(null);
	// The token this host handed out, picked up again before every connect. A host
	// that was restarted on the same port hands out a new one, and the write that
	// would have gone to the old one is refused rather than landing in a workspace
	// nobody is looking at
	const sessionTokenRef = useRef<string | null>(null);
	const saveTimerRef = useRef<number | null>(null);
	// The write that is on its way, so that a second save queues behind it rather
	// than racing it, and so that closing or flushing can wait for it
	const inFlightSaveRef = useRef<Promise<boolean> | null>(null);
	const noticeTimerRef = useRef<number | null>(null);
	const noticeCountRef = useRef(0);
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
	 * Answers the queries about the drawn result. Capture alone carries an image
	 * rather than text, so its path is separate on the canvas-agent side as well
	 */
	const runHandleOp = useCallback(
		async (op: AiHandleOp) => {
			try {
				return op.kind === "captureCanvas"
					? await captureCanvasImage(capturePng)
					: await applyHandleOp(op, handleControl);
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

	/**
	 * Writes the current doc out, unless it is already what the host has. Only
	 * saveNow calls it, which is what keeps two writes from being in the air at once
	 */
	const writeCurrentDoc = useCallback(async (): Promise<boolean> => {
		const targetPath = openPathRef.current;
		if (targetPath === null) {
			return true;
		}
		const text = serializeDoc(latestDocRef.current);
		if (text === syncedTextRef.current) {
			return true;
		}
		// Record it before saving, so that if the host's watch picks this write up and
		// sends it back, it can be rejected on the match
		const previousSyncedText = syncedTextRef.current;
		syncedTextRef.current = text;
		try {
			await saveFile(targetPath, text, sessionTokenRef.current);
			setErrorMessage(null);
		} catch (error) {
			// Left recorded, saving the same content again would be rejected at the top
			// and never written
			syncedTextRef.current = previousSyncedText;
			setErrorMessage(`保存に失敗しました: ${String(error)}`);
			return false;
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
		return true;
	}, []);

	/**
	 * Writes the current doc out, behind whatever write is already on its way.
	 *
	 * @returns Whether the file now holds these edits. False only on a failed write,
	 *   which is reported in the error bar
	 */
	const saveNow = useCallback(async (): Promise<boolean> => {
		const precedingSave = inFlightSaveRef.current;
		const running = (async (): Promise<boolean> => {
			// A write started while another is in flight would race it, and the file
			// would end up holding whichever answer the host happened to take last.
			// How that one ended is its own caller's business: failing along with it
			// would spread one failure over every save that follows
			await precedingSave?.catch(() => false);
			return await writeCurrentDoc();
		})();
		inFlightSaveRef.current = running;
		try {
			return await running;
		} finally {
			// Only while this is still the newest write: a save that queued behind it
			// is what the next one has to wait for
			if (inFlightSaveRef.current === running) {
				inFlightSaveRef.current = null;
			}
		}
	}, [writeCurrentDoc]);

	/**
	 * Takes the edits off the debounce and writes them out now, waiting for any
	 * write already on its way.
	 *
	 * @returns Whether the file holds every edit made here
	 */
	const flushPendingSave = useCallback(async (): Promise<boolean> => {
		if (saveTimerRef.current !== null) {
			window.clearTimeout(saveTimerRef.current);
			saveTimerRef.current = null;
		}
		return await saveNow();
	}, [saveNow]);

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

	const showNotice = useCallback((message: string): void => {
		noticeCountRef.current += 1;
		setNotice({ id: noticeCountRef.current, message });
		if (noticeTimerRef.current !== null) {
			window.clearTimeout(noticeTimerRef.current);
		}
		noticeTimerRef.current = window.setTimeout(() => {
			noticeTimerRef.current = null;
			setNotice(null);
		}, NOTICE_DURATION_MS);
	}, []);

	/**
	 * Writes out the buffered edits, then closes the window. close_canvas reads
	 * whether it closed here from the connection being cut, so nothing is returned
	 * even when it could not close
	 */
	const closeWindow = useCallback(async (): Promise<void> => {
		await flushPendingSave();
		window.close();
	}, [flushPendingSave]);

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

		/**
		 * Puts the next attempt on the clock, and starts a headless window counting
		 * towards closing itself. A socket that closed and a token that could not be
		 * fetched arrive here alike: either way the host is not answering
		 */
		const scheduleReconnect = (): void => {
			setIsConnected(false);
			if (isHeadlessWindow && giveUpTimer === null) {
				giveUpTimer = window.setTimeout(() => {
					giveUpTimer = null;
					window.close();
				}, HEADLESS_GIVE_UP_MS);
			}
			reconnectTimer = window.setTimeout(() => {
				reconnectTimer = null;
				void connect();
			}, reconnectDelayMs);
			reconnectDelayMs = Math.min(reconnectDelayMs * 2, RECONNECT_MAX_DELAY_MS);
		};

		const connect = async (): Promise<void> => {
			// The token is read again on every attempt rather than held on to: the
			// host this page reconnects to is not necessarily the one it first met
			let sessionToken: string;
			try {
				sessionToken = await fetchSessionToken();
			} catch {
				if (!isDisposed) {
					scheduleReconnect();
				}
				return;
			}
			if (isDisposed) {
				return;
			}
			sessionTokenRef.current = sessionToken;
			// The headless query goes on the socket as well as the page: it is how the
			// host tells a window nobody can see from one a person is looking at
			const socket = new WebSocket(
				`${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws?${SESSION_TOKEN_QUERY_PARAM}=${encodeURIComponent(sessionToken)}${isHeadlessWindow ? `&${HEADLESS_VIEWER_QUERY}` : ""}`,
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
					case "flushEdits": {
						const { requestId } = frame;
						// The host is about to move to another file, after which this
						// window's write would be refused. A failed write is already in the
						// error bar, so the answer goes out either way rather than leaving
						// the host to sit out its timeout
						void flushPendingSave().finally(() => {
							if (socket.readyState !== WebSocket.OPEN) {
								return;
							}
							socket.send(
								JSON.stringify({
									type: "flushed",
									requestId,
								} satisfies CanvasHostClientMessage),
							);
						});
						break;
					}
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
				// Under StrictMode the first socket's close lands after the second one
				// has taken the ref, and clearing it unconditionally would leave the
				// live socket unreachable to saveNow and the flush answer
				if (socketRef.current === socket) {
					socketRef.current = null;
				}
				if (isDisposed) {
					return;
				}
				scheduleReconnect();
			});
		};

		void connect();

		return () => {
			isDisposed = true;
			cancelGiveUp();
			if (reconnectTimer !== null) {
				window.clearTimeout(reconnectTimer);
			}
			socketRef.current?.close();
			socketRef.current = null;
		};
	}, [applyIncomingDoc, closeWindow, flushPendingSave, runHandleOp]);

	// Ctrl+S is a person asking to save what is already saving itself. Left to the
	// browser it opens the save dialog, which would write a copy of the page rather
	// than the canvas, so it is taken over: the buffered edits go out now, and the
	// notice says the edits did not need the keystroke
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent): void => {
			if (
				event.key.toLowerCase() !== "s" ||
				!(event.ctrlKey || event.metaKey) ||
				event.altKey
			) {
				return;
			}
			event.preventDefault();
			void flushPendingSave().then((isSaved) => {
				// A failed write shows up in the error bar; saying it is saved on top of
				// that would be the opposite of the truth
				if (isSaved) {
					showNotice(AUTO_SAVE_NOTICE);
				}
			});
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [flushPendingSave, showNotice]);

	useEffect(
		() => () => {
			if (noticeTimerRef.current !== null) {
				window.clearTimeout(noticeTimerRef.current);
			}
		},
		[],
	);

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
				docLoadId={openPath ?? undefined}
				isConnected={isConnected}
				onCommit={handleCommit}
				onOpenReference={handleOpenReference}
				resolveImage={resolveImage}
				onRegisterCanvas={registerCanvas}
			/>
			{notice !== null && (
				<div
					key={notice.id}
					className="viewer-notice"
					role="status"
					style={noticeStyle}
				>
					{notice.message}
				</div>
			)}
		</div>
	);
}

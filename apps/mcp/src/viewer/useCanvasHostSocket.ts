// The one socket to the canvas host: getting it up, getting it back after the host
// restarts, and handing each frame to whoever answers it.
//
// The frames that expect an answer (a flush, a query about the drawn result) are
// answered here, so the protocol stays inside this file; what the answer is comes
// from the handlers the page passes in.

import type { AiCanvasOpOutcome, AiHandleOp } from "@jiscribe/ai-tools";
import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import { fetchSessionToken } from "./files";
import type { CanvasHostClientMessage } from "../shared/canvasHostProtocol";
import {
	HEADLESS_VIEWER_QUERY,
	isCanvasHostServerMessage,
} from "../shared/canvasHostProtocol";
import { SESSION_TOKEN_QUERY_PARAM } from "../shared/fileApiRoute";

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
 * that. The reconnect backoff tops out at 5 seconds, so 15 seconds of silence is
 * several failed attempts in a row, which a host that was merely restarting on
 * the same port would have answered.
 * Without this, a window nobody can see would sit there for as long as the machine
 * runs, since there is no one to close it
 */
const HEADLESS_GIVE_UP_MS = 15_000;

export type CanvasHostSocketOptions = {
	/**
	 * Whether this window is the AI's eye rather than one a person is looking at.
	 * It goes on the socket URL for the host to tell the two apart, and it is what
	 * decides whether an unreachable host ends in the window closing itself
	 */
	isHeadlessWindow: boolean;
	/**
	 * Where the token of the host currently connected to is left, for the writes
	 * that do not go over this socket to quote. Written on every connect
	 */
	sessionTokenRef: RefObject<string | null>;
	/** An openCanvas or docChanged frame: the file to draw, its text and revision */
	onDocFrame: (relPath: string, docText: string, revision: string) => void;
	/** A file the host could not read, named separately from what it says */
	onDocError: (relPath: string, message: string) => void;
	/** A request to close this window. Nothing is sent back */
	onCloseViewer: () => void;
	/**
	 * A request to write out the edits still on the debounce. The host is told it
	 * is done once this settles, whether or not the write went through
	 */
	onFlushEdits: () => Promise<unknown>;
	/** A query about the drawn result, whose outcome goes back under its request id */
	onHandleOp: (op: AiHandleOp) => Promise<AiCanvasOpOutcome>;
};

/**
 * Keeps this page attached to the canvas host for as long as it is mounted.
 *
 * @param options The handlers each frame is passed to, plus what this window is
 *   (headless or a person's) and where the session token is left. The handlers are
 *   read at frame time, so they may be fresh objects on every render — the socket
 *   is not reconnected over them
 * @returns Whether the socket is up, which is what the file label's badge shows
 */
export function useCanvasHostSocket(options: CanvasHostSocketOptions): boolean {
	const [isConnected, setIsConnected] = useState(false);
	// Read rather than closed over, so that the connection outlives the identity of
	// the handlers
	const optionsRef = useRef(options);
	useEffect(() => {
		optionsRef.current = options;
	});

	useEffect(() => {
		const { isHeadlessWindow, sessionTokenRef } = optionsRef.current;
		let isDisposed = false;
		let reconnectDelayMs = RECONNECT_BASE_DELAY_MS;
		let reconnectTimer: number | null = null;
		let giveUpTimer: number | null = null;
		let socket: WebSocket | null = null;

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

		const send = (
			openSocket: WebSocket,
			message: CanvasHostClientMessage,
		): void => {
			if (openSocket.readyState !== WebSocket.OPEN) {
				return;
			}
			openSocket.send(JSON.stringify(message));
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
			const openedSocket = new WebSocket(
				`${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws?${SESSION_TOKEN_QUERY_PARAM}=${encodeURIComponent(sessionToken)}${isHeadlessWindow ? `&${HEADLESS_VIEWER_QUERY}` : ""}`,
			);
			socket = openedSocket;

			openedSocket.addEventListener("open", () => {
				if (isDisposed) {
					return;
				}
				reconnectDelayMs = RECONNECT_BASE_DELAY_MS;
				cancelGiveUp();
				setIsConnected(true);
			});
			openedSocket.addEventListener("message", (event) => {
				let frame: unknown;
				try {
					frame = JSON.parse(String(event.data));
				} catch {
					return;
				}
				if (!isCanvasHostServerMessage(frame)) {
					return;
				}
				const handlers = optionsRef.current;
				switch (frame.type) {
					case "openCanvas":
					case "docChanged":
						handlers.onDocFrame(frame.relPath, frame.docText, frame.revision);
						break;
					case "docError":
						handlers.onDocError(frame.relPath, frame.message);
						break;
					case "closeViewer":
						handlers.onCloseViewer();
						break;
					case "flushEdits": {
						const { requestId } = frame;
						// The host is about to move to another file, after which this
						// window's write would be refused. A failed write is already in the
						// error bar, so the answer goes out either way rather than leaving
						// the host to sit out its timeout
						void handlers.onFlushEdits().finally(() => {
							send(openedSocket, { type: "flushed", requestId });
						});
						break;
					}
					case "handleOpRequest": {
						const { requestId, op } = frame;
						void handlers.onHandleOp(op).then((outcome) => {
							send(openedSocket, {
								type: "handleOpResult",
								requestId,
								ok: outcome.ok,
								text: outcome.text,
								...(outcome.imagePngBase64 === undefined
									? {}
									: { imagePngBase64: outcome.imagePngBase64 }),
							});
						});
						break;
					}
				}
			});
			openedSocket.addEventListener("close", () => {
				// A socket whose close lands after the reconnect that replaced it must
				// not clear the live one, which the cleanup would then leave open
				if (socket === openedSocket) {
					socket = null;
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
			socket?.close();
			socket = null;
		};
	}, []);

	return isConnected;
}

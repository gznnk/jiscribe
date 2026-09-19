// The bookkeeping behind every question the host puts to the windows.
//
// The shape is always the same: a frame carrying a requestId goes out to the
// windows that are open, and the wait ends on an answer, on there being no window
// left to hear from, or on the timeout. What differs between the two callers is
// only what those three endings are worth — a handleOp settles on the first window
// to speak, while a flush is over once every window asked is done — so both are
// decided by the caller's own callbacks rather than by a second copy of this.
//
// Every window that was asked is remembered, because windows leave without a word:
// with nothing tracking that, a request whose windows have all gone would sit out
// its whole timeout for an answer nobody is left to give.

import { randomUUID } from "node:crypto";

import type { WebSocket } from "ws";

import type { CanvasHostServerMessage } from "../shared/canvasHostProtocol";

/** One question to put to the windows (see ViewerRequestBroker.ask) */
export type ViewerRequest<TOutcome> = {
	/**
	 * The windows to ask, which are expected to be open. An empty list is a request
	 * nobody can answer, so callers deal with that case before asking
	 */
	askedSockets: readonly WebSocket[];
	/**
	 * Builds the frame to send, given the requestId this request was assigned. The
	 * answer names that id, which is how it finds its way back here
	 */
	calcFrame: (requestId: string) => CanvasHostServerMessage;
	/** How long to wait (milliseconds) before giving up on the windows */
	timeoutMs: number;
	/** The outcome for a request no window answered in that time */
	calcTimeoutOutcome: () => TOutcome;
	/**
	 * The outcome for a request every window asked is done with, each having either
	 * answered without settling it or closed
	 */
	calcAllDoneOutcome: () => TOutcome;
};

export type ViewerRequestBroker<TOutcome> = {
	/**
	 * Sends one request to the windows and waits for what becomes of it.
	 *
	 * @param request The windows to ask, the frame to send them, and what the
	 *   endings it can reach are worth
	 * @returns The outcome the request settled on. It never rejects: a window that
	 *   says nothing is an outcome like any other
	 */
	ask: (request: ViewerRequest<TOutcome>) => Promise<TOutcome>;
	/**
	 * Takes in one window's answer.
	 *
	 * @param requestId The request being answered. One nobody is waiting on is let
	 *   go, so a word arriving late cannot settle the request that came after it
	 * @param socket The window that answered
	 * @param outcome What to settle the request with here and now, the first window
	 *   to speak deciding it for all of them. Left out, this window is merely done
	 *   and the request settles once every other one is too
	 */
	answer: (requestId: string, socket: WebSocket, outcome?: TOutcome) => void;
	/**
	 * Drops one window from every request still waiting, settling the ones it was
	 * the last to be waited on for.
	 *
	 * @param socket The window that went away
	 */
	dropSocket: (socket: WebSocket) => void;
	/**
	 * Settles everything still waiting, for a host that is being torn down.
	 *
	 * @param outcome What every pending request is settled with
	 */
	settleAll: (outcome: TOutcome) => void;
};

/**
 * Creates the broker for one kind of request. The outcome type is the caller's:
 * handle operations settle on a result the AI reads, while a flush settles on
 * nothing but the fact that it is over.
 */
export const createViewerRequestBroker = <
	TOutcome,
>(): ViewerRequestBroker<TOutcome> => {
	const pendingRequests = new Map<
		string,
		{
			/**
			 * The windows still expected to be heard from. A window that answers or
			 * closes is taken out; once it is empty, nobody is left to wait for
			 */
			awaitedSockets: Set<WebSocket>;
			calcAllDoneOutcome: () => TOutcome;
			settle: (outcome: TOutcome) => void;
			timer: ReturnType<typeof setTimeout>;
		}
	>();

	const settle = (requestId: string, calcOutcome: () => TOutcome): void => {
		const pending = pendingRequests.get(requestId);
		if (pending === undefined) {
			return;
		}
		clearTimeout(pending.timer);
		pendingRequests.delete(requestId);
		pending.settle(calcOutcome());
	};

	/**
	 * Takes one window off one request, and ends the wait it was the last one
	 * holding up.
	 *
	 * @param requestId The request to take it off
	 * @param socket The window that answered or went away
	 */
	const dropFromRequest = (requestId: string, socket: WebSocket): void => {
		const pending = pendingRequests.get(requestId);
		if (pending === undefined) {
			return;
		}
		if (
			pending.awaitedSockets.delete(socket) &&
			pending.awaitedSockets.size === 0
		) {
			settle(requestId, pending.calcAllDoneOutcome);
		}
	};

	return {
		ask: async (request) => {
			const requestId = randomUUID();
			return await new Promise<TOutcome>((resolve) => {
				const timer = setTimeout(() => {
					settle(requestId, request.calcTimeoutOutcome);
				}, request.timeoutMs);
				pendingRequests.set(requestId, {
					awaitedSockets: new Set(request.askedSockets),
					calcAllDoneOutcome: request.calcAllDoneOutcome,
					settle: resolve,
					timer,
				});
				const frame = JSON.stringify(request.calcFrame(requestId));
				for (const socket of request.askedSockets) {
					socket.send(frame);
				}
			});
		},
		answer: (requestId, socket, outcome) => {
			if (outcome === undefined) {
				dropFromRequest(requestId, socket);
				return;
			}
			settle(requestId, () => outcome);
		},
		dropSocket: (socket) => {
			for (const requestId of [...pendingRequests.keys()]) {
				dropFromRequest(requestId, socket);
			}
		},
		settleAll: (outcome) => {
			for (const requestId of [...pendingRequests.keys()]) {
				settle(requestId, () => outcome);
			}
		},
	};
};

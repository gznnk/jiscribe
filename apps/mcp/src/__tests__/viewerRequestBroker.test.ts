// Covers the bookkeeping both round trips to the windows are built on: which
// ending a request settles on, and that nothing waits on a window that has gone.
// No browser and no server are needed — a request goes out as a frame, and the
// answers are fed back in as the socket handler would.

import { EventEmitter } from "node:events";

import { describe, expect, it } from "vitest";
import type { WebSocket } from "ws";

import { createViewerRequestBroker } from "../host/viewerRequestBroker";

/** A stand-in for a window's connection, holding the frames it was sent */
type FakeSocket = WebSocket & { sentFrames: string[] };

const createFakeSocket = (): FakeSocket => {
	const sentFrames: string[] = [];
	return Object.assign(new EventEmitter(), {
		OPEN: 1,
		readyState: 1,
		sentFrames,
		send: (frame: string): void => {
			sentFrames.push(frame);
		},
	}) as unknown as FakeSocket;
};

/** The requestId the host put on the frame this window was sent */
const readRequestId = (socket: FakeSocket): string => {
	const frame = socket.sentFrames.at(-1);
	if (frame === undefined) {
		throw new Error("this window was sent nothing to answer");
	}
	return (JSON.parse(frame) as { requestId: string }).requestId;
};

/**
 * Asks a question the way runHandleOp does: the first window to speak decides it,
 * and the two other endings carry a reason of their own
 */
const askOne = (
	broker: ReturnType<typeof createViewerRequestBroker<string>>,
	askedSockets: readonly FakeSocket[],
	timeoutMs = 10_000,
): Promise<string> =>
	broker.ask({
		askedSockets,
		calcFrame: (requestId) => ({ type: "flushEdits", requestId }),
		timeoutMs,
		calcTimeoutOutcome: () => "timed out",
		calcAllDoneOutcome: () => "everyone gone",
	});

describe("createViewerRequestBroker", () => {
	it("sends one frame carrying the requestId to every window asked", async () => {
		const broker = createViewerRequestBroker<string>();
		const first = createFakeSocket();
		const second = createFakeSocket();

		const asking = askOne(broker, [first, second]);
		broker.answer(readRequestId(first), first, "answered");

		expect(await asking).toBe("answered");
		expect(readRequestId(second)).toBe(readRequestId(first));
	});

	it("takes the first answer and lets a later one go", async () => {
		// Every open window is asked, so a second answer is the ordinary case rather
		// than a stray one
		const broker = createViewerRequestBroker<string>();
		const first = createFakeSocket();
		const second = createFakeSocket();

		const asking = askOne(broker, [first, second]);
		const requestId = readRequestId(first);
		broker.answer(requestId, first, "first");
		broker.answer(requestId, second, "second");

		expect(await asking).toBe("first");
	});

	it("lets go of an answer to a request nobody is waiting on", async () => {
		// A tab left over from an earlier session answers a requestId that has been
		// settled, or one this host never made
		const broker = createViewerRequestBroker<string>();
		const socket = createFakeSocket();

		const asking = askOne(broker, [socket]);
		broker.answer("a-request-that-was-never-made", socket, "stale");
		broker.answer(readRequestId(socket), socket, "fresh");

		expect(await asking).toBe("fresh");
	});

	it("settles once every window asked has gone", async () => {
		const broker = createViewerRequestBroker<string>();
		const first = createFakeSocket();
		const second = createFakeSocket();

		const asking = askOne(broker, [first, second]);
		broker.dropSocket(first);
		broker.dropSocket(second);

		expect(await asking).toBe("everyone gone");
	});

	it("keeps waiting while one of the windows asked is still there", async () => {
		const broker = createViewerRequestBroker<string>();
		const leaving = createFakeSocket();
		const staying = createFakeSocket();

		const asking = askOne(broker, [leaving, staying]);
		broker.dropSocket(leaving);
		broker.answer(readRequestId(staying), staying, "answered");

		expect(await asking).toBe("answered");
	});

	it("gives up on windows that never answer", async () => {
		const broker = createViewerRequestBroker<string>();
		const socket = createFakeSocket();

		expect(await askOne(broker, [socket], 10)).toBe("timed out");
	});

	it("settles everything still waiting at once", async () => {
		const broker = createViewerRequestBroker<string>();
		const socket = createFakeSocket();

		const asking = [askOne(broker, [socket]), askOne(broker, [socket])];
		broker.settleAll("host shut down");

		expect(await Promise.all(asking)).toEqual([
			"host shut down",
			"host shut down",
		]);
	});

	it("waits for every window when an answer settles nothing on its own", async () => {
		// This is the flush: each window says it is done, and the request is over
		// only once the last of them has
		const broker = createViewerRequestBroker<void>();
		const first = createFakeSocket();
		const second = createFakeSocket();
		let isSettled = false;
		const asking = broker
			.ask({
				askedSockets: [first, second],
				calcFrame: (requestId) => ({ type: "flushEdits", requestId }),
				timeoutMs: 10_000,
				calcTimeoutOutcome: () => undefined,
				calcAllDoneOutcome: () => undefined,
			})
			.then(() => {
				isSettled = true;
			});
		const requestId = readRequestId(first);

		broker.answer(requestId, first);
		await Promise.resolve();
		expect(isSettled).toBe(false);

		// A window that leaves has nothing more to write out, so it counts as done
		broker.dropSocket(second);
		await asking;
		expect(isSettled).toBe(true);
	});
});

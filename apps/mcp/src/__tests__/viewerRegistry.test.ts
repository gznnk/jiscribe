// Covers the set of connected windows on its own: what counts as open, which of
// them a person can see, and the grace period the host's lifetime hangs off. A
// plain event emitter stands in for the connection, since nothing here reads more
// of a socket than whether it is up and how to send to it.

import { EventEmitter } from "node:events";

import { describe, expect, it } from "vitest";
import type { WebSocket } from "ws";

import { createViewerRegistry } from "../host/viewerRegistry";

/** ws's own readyState values, as the registry compares against them */
const SOCKET_OPEN = 1;
const SOCKET_CLOSED = 3;

/** A stand-in for a window's connection, holding the frames it was sent */
type FakeSocket = WebSocket & {
	sentFrames: string[];
	readyState: number;
	terminatedCount: number;
};

const createFakeSocket = (): FakeSocket => {
	const sentFrames: string[] = [];
	return Object.assign(new EventEmitter(), {
		OPEN: SOCKET_OPEN,
		readyState: SOCKET_OPEN,
		sentFrames,
		terminatedCount: 0,
		send: (frame: string): void => {
			sentFrames.push(frame);
		},
		terminate(this: FakeSocket): void {
			this.terminatedCount += 1;
			this.readyState = SOCKET_CLOSED;
		},
	}) as unknown as FakeSocket;
};

/** The window closing, as the registry and the waits see it */
const closeSocket = (socket: FakeSocket): void => {
	socket.readyState = SOCKET_CLOSED;
	socket.emit("close");
};

/** A registry on a host that is up, with the grace period shortened */
const createTestRegistry = (
	options: { onViewersGone?: () => void; idleShutdownDelayMs?: number } = {},
): ReturnType<typeof createViewerRegistry> =>
	createViewerRegistry({
		idleShutdownDelayMs: 20,
		isHostClosed: () => false,
		...options,
	});

const waitFor = async (isSatisfied: () => boolean): Promise<void> => {
	const deadline = Date.now() + 2_000;
	while (!isSatisfied()) {
		if (Date.now() > deadline) {
			throw new Error("condition was not met in time");
		}
		await new Promise((resolve) => setTimeout(resolve, 5));
	}
};

describe("createViewerRegistry", () => {
	it("counts only the connections that are still up", () => {
		const registry = createTestRegistry();
		const open = createFakeSocket();
		const closing = createFakeSocket();
		registry.register(open, false);
		registry.register(closing, false);

		closing.readyState = SOCKET_CLOSED;

		expect(registry.countOpenSockets()).toBe(1);
		expect(registry.openSockets()).toEqual([open]);
	});

	it("does not count a window nobody can see as one on screen", () => {
		const registry = createTestRegistry();
		const headless = createFakeSocket();
		registry.register(headless, true);

		expect(registry.hasVisibleViewer()).toBe(false);
		expect(registry.hasHeadlessViewer()).toBe(true);
		expect(registry.openHeadlessSockets()).toEqual([headless]);

		const visible = createFakeSocket();
		registry.register(visible, false);
		expect(registry.hasVisibleViewer()).toBe(true);
	});

	it("sends a broadcast to the open windows alone", () => {
		const registry = createTestRegistry();
		const open = createFakeSocket();
		const gone = createFakeSocket();
		registry.register(open, false);
		registry.register(gone, false);
		gone.readyState = SOCKET_CLOSED;

		registry.broadcast({ type: "closeViewer" });

		expect(open.sentFrames).toEqual(['{"type":"closeViewer"}']);
		expect(gone.sentFrames).toEqual([]);
	});

	it("ends the wait for a viewer as soon as one connects", async () => {
		const registry = createTestRegistry();

		const waiting = registry.waitForViewer(2_000);
		registry.register(createFakeSocket(), false);

		expect(await waiting).toBe(true);
	});

	it("returns straight away for a viewer that is already there", async () => {
		const registry = createTestRegistry();
		registry.register(createFakeSocket(), false);

		expect(await registry.waitForViewer(0)).toBe(true);
	});

	it("gives up on a viewer that never arrives", async () => {
		const registry = createTestRegistry();

		expect(await registry.waitForViewer(10)).toBe(false);
	});

	it("ends every wait at once when told there is nothing coming", async () => {
		const registry = createTestRegistry();

		const waiting = [
			registry.waitForViewer(2_000),
			registry.waitForViewer(2_000),
		];
		registry.settleViewerWaiters(false);

		expect(await Promise.all(waiting)).toEqual([false, false]);
	});

	it("reports the windows gone once the last one has stayed away", async () => {
		let goneCount = 0;
		const registry = createTestRegistry({
			onViewersGone: () => {
				goneCount += 1;
			},
		});
		const socket = createFakeSocket();
		registry.register(socket, false);

		closeSocket(socket);
		registry.unregister(socket);

		await waitFor(() => goneCount === 1);
	});

	it("says nothing while nothing has ever connected", async () => {
		let goneCount = 0;
		createTestRegistry({
			onViewersGone: () => {
				goneCount += 1;
			},
		});

		await new Promise((resolve) => setTimeout(resolve, 80));
		expect(goneCount).toBe(0);
	});

	it("says nothing when a window comes back within the grace period", async () => {
		let goneCount = 0;
		const registry = createTestRegistry({
			onViewersGone: () => {
				goneCount += 1;
			},
		});
		const socket = createFakeSocket();
		registry.register(socket, false);
		closeSocket(socket);
		registry.unregister(socket);

		registry.register(createFakeSocket(), false);

		await new Promise((resolve) => setTimeout(resolve, 80));
		expect(goneCount).toBe(0);
	});

	it("counts a window that answered the close as closed", async () => {
		const registry = createTestRegistry();
		const socket = createFakeSocket();
		registry.register(socket, false);

		const closing = registry.closeSockets([socket]);
		closeSocket(socket);

		expect(await closing).toEqual({ closedCount: 1, remainingCount: 0 });
		expect(socket.sentFrames).toEqual(['{"type":"closeViewer"}']);
	});

	it("asks nobody when there is no window to close", async () => {
		const registry = createTestRegistry();

		expect(await registry.closeSockets([])).toEqual({
			closedCount: 0,
			remainingCount: 0,
		});
	});

	it("cuts every connection when the host is torn down", () => {
		const registry = createTestRegistry();
		const socket = createFakeSocket();
		registry.register(socket, false);

		registry.terminateAll();

		expect(socket.terminatedCount).toBe(1);
		expect(registry.openSockets()).toEqual([]);
	});
});

import { afterEach, describe, expect, it, vi } from "vitest";

import type { ClipboardData } from "../../commands/selection/ClipboardData";
import type { CanvasAction } from "../../reducer/CanvasActions";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { enqueueClipboardPaste } from "../useClipboardPaste";

const registries = createTestRegistries();

/**
 * Regression test for issue #48.
 * navigator.clipboard.readText() does not guarantee resolution order, so with
 * consecutive pastes the PASTE dispatch order can diverge from the call order.
 * enqueueClipboardPaste serializes them into a FIFO chain and guarantees
 * "call order = dispatch order" with no dropped requests.
 *
 * readText returns non-JSON so it falls through to the internalClipboard path,
 * and each call uses a distinct dummy ClipboardData to identify the dispatch
 * order (the ordering mechanism does not depend on where the data comes from,
 * so there is no need to build a real ClipboardData that would require
 * registry initialization).
 */

type Deferred = {
	promise: Promise<string>;
	resolve: (text: string) => void;
	reject: (error: unknown) => void;
};

const createDeferred = (): Deferred => {
	let resolve!: (text: string) => void;
	let reject!: (error: unknown) => void;
	const promise = new Promise<string>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
};

/** Installs a stub that returns deferreds[n-1] on the nth readText call */
const stubReadText = (deferreds: Deferred[]) => {
	let callCount = 0;
	const readText = vi.fn(() => {
		const deferred = deferreds[callCount];
		callCount++;
		return deferred?.promise ?? Promise.reject(new Error("unexpected read"));
	});
	vi.stubGlobal("navigator", { clipboard: { readText } });
	return readText;
};

const clipboardOf = (marker: string): ClipboardData =>
	({ marker }) as unknown as ClipboardData;

/** Drains the chain's .then continuations (only microtasks; RAF etc. are irrelevant) */
const flushMicrotasks = async () => {
	for (let i = 0; i < 10; i++) {
		await Promise.resolve();
	}
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("enqueueClipboardPaste serializes consecutive pastes in FIFO order", () => {
	it("dispatches in call order even when the earlier readText resolves late", async () => {
		const firstRead = createDeferred();
		const secondRead = createDeferred();
		const readText = stubReadText([firstRead, secondRead]);
		const pasteChain = { current: Promise.resolve() };
		const dispatched: CanvasAction[] = [];
		const dispatch = (action: CanvasAction) => {
			dispatched.push(action);
		};

		const clipA = clipboardOf("A");
		const clipB = clipboardOf("B");
		const firstPaste = enqueueClipboardPaste(
			pasteChain,
			clipA,
			dispatch,
			registries.objectStateValidator,
		);
		const secondPaste = enqueueClipboardPaste(
			pasteChain,
			clipB,
			dispatch,
			registries.objectStateValidator,
		);

		// the second paste does not read the clipboard until the first dispatch completes
		await flushMicrotasks();
		expect(readText).toHaveBeenCalledTimes(1);
		expect(dispatched).toEqual([]);

		firstRead.resolve("not clipboard json");
		await firstPaste;
		expect(dispatched).toEqual([{ type: "PASTE", data: clipA }]);
		await flushMicrotasks();
		expect(readText).toHaveBeenCalledTimes(2);

		secondRead.resolve("not clipboard json either");
		await secondPaste;
		expect(dispatched).toEqual([
			{ type: "PASTE", data: clipA },
			{ type: "PASTE", data: clipB },
		]);
	});

	it("a rejected earlier readText does not block subsequent pastes", async () => {
		const firstRead = createDeferred();
		const secondRead = createDeferred();
		stubReadText([firstRead, secondRead]);
		const pasteChain = { current: Promise.resolve() };
		const dispatched: CanvasAction[] = [];
		const dispatch = (action: CanvasAction) => {
			dispatched.push(action);
		};

		const clipB = clipboardOf("B");
		// first: OS read fails and internalClipboard is empty too → just close the menu
		const firstPaste = enqueueClipboardPaste(
			pasteChain,
			null,
			dispatch,
			registries.objectStateValidator,
		);
		const secondPaste = enqueueClipboardPaste(
			pasteChain,
			clipB,
			dispatch,
			registries.objectStateValidator,
		);

		firstRead.reject(new Error("clipboard permission denied"));
		await firstPaste;
		expect(dispatched).toEqual([{ type: "CLOSE_CONTEXT_MENU" }]);

		secondRead.resolve("not clipboard json");
		await secondPaste;
		expect(dispatched).toEqual([
			{ type: "CLOSE_CONTEXT_MENU" },
			{ type: "PASTE", data: clipB },
		]);
	});

	it("dispatches one PASTE per rapid press without dropping any request", async () => {
		const reads = [createDeferred(), createDeferred(), createDeferred()];
		stubReadText(reads);
		const pasteChain = { current: Promise.resolve() };
		const dispatched: CanvasAction[] = [];
		const dispatch = (action: CanvasAction) => {
			dispatched.push(action);
		};

		const clips = [clipboardOf("1"), clipboardOf("2"), clipboardOf("3")];
		const pastes = clips.map((clip) =>
			enqueueClipboardPaste(
				pasteChain,
				clip,
				dispatch,
				registries.objectStateValidator,
			),
		);

		for (let i = 0; i < reads.length; i++) {
			reads[i].resolve("not clipboard json");
			await pastes[i];
		}

		expect(dispatched).toEqual(
			clips.map((clip) => ({ type: "PASTE", data: clip })),
		);
	});
});

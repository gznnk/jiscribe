import { describe, expect, it } from "vitest";

import { createLatestWriteSerializer } from "../latestWriteSerializer";

/** Canvas JSON as the extension writes it: pretty-printed with "\n" separators. */
const docJson = (name: string): string =>
	JSON.stringify({ version: 1, root: [{ id: name }] }, null, 2);

const docA = docJson("a");
const docB = docJson("b");
const docC = docJson("c");
const docD = docJson("d");

/** One call of the recorded write, with the levers that end it. */
interface RecordedWrite {
	/** The text the serializer handed to the write. */
	readonly text: string;
	/** End this write the way a landed applyEdit does. */
	resolve(): void;
	/** End it the way a rejected applyEdit does. */
	reject(): void;
}

/** A write that never finishes on its own, so a test decides when each one does. */
function createWriteRecorder(): {
	calls: RecordedWrite[];
	write: (text: string) => Promise<void>;
} {
	const calls: RecordedWrite[] = [];
	return {
		calls,
		write: (text: string) =>
			new Promise<void>((resolve, reject) => {
				calls.push({
					text,
					resolve: () => resolve(),
					reject: () => reject(new Error("applyEdit refused the edit")),
				});
			}),
	};
}

/**
 * Let the serializer's await chain run, so the write that follows a settled one
 * has been started by the time the assertions look.
 */
function flushPendingWrites(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("latestWriteSerializer", () => {
	it("starts the first write immediately", () => {
		const recorder = createWriteRecorder();
		const serializer = createLatestWriteSerializer(recorder.write);

		serializer.enqueue(docA);

		expect(recorder.calls.map((call) => call.text)).toEqual([docA]);
	});

	it("hands the write the enqueued text unchanged", () => {
		const recorder = createWriteRecorder();
		const serializer = createLatestWriteSerializer(recorder.write);

		serializer.enqueue(docA);

		expect(recorder.calls[0].text).toBe(docA);
	});

	it("holds the second write back until the first one settles", async () => {
		const recorder = createWriteRecorder();
		const serializer = createLatestWriteSerializer(recorder.write);

		serializer.enqueue(docA);
		serializer.enqueue(docB);
		expect(recorder.calls.map((call) => call.text)).toEqual([docA]);

		recorder.calls[0].resolve();
		await flushPendingWrites();

		expect(recorder.calls.map((call) => call.text)).toEqual([docA, docB]);
	});

	it("writes three enqueues made during one write as the last text only", async () => {
		const recorder = createWriteRecorder();
		const serializer = createLatestWriteSerializer(recorder.write);

		serializer.enqueue(docA);
		serializer.enqueue(docB);
		serializer.enqueue(docC);
		serializer.enqueue(docD);

		recorder.calls[0].resolve();
		await flushPendingWrites();

		expect(recorder.calls.map((call) => call.text)).toEqual([docA, docD]);
	});

	it("writes the waiting text after a rejected write", async () => {
		const recorder = createWriteRecorder();
		const serializer = createLatestWriteSerializer(recorder.write);

		serializer.enqueue(docA);
		serializer.enqueue(docB);

		recorder.calls[0].reject();
		await flushPendingWrites();

		expect(recorder.calls.map((call) => call.text)).toEqual([docA, docB]);
	});

	it("keeps serializing after a rejected write", async () => {
		const recorder = createWriteRecorder();
		const serializer = createLatestWriteSerializer(recorder.write);

		serializer.enqueue(docA);
		recorder.calls[0].reject();
		await flushPendingWrites();

		serializer.enqueue(docB);
		serializer.enqueue(docC);
		expect(recorder.calls.map((call) => call.text)).toEqual([docA, docB]);

		recorder.calls[1].resolve();
		await flushPendingWrites();

		expect(recorder.calls.map((call) => call.text)).toEqual([docA, docB, docC]);
	});

	it("starts a write immediately once everything has settled", async () => {
		const recorder = createWriteRecorder();
		const serializer = createLatestWriteSerializer(recorder.write);

		serializer.enqueue(docA);
		recorder.calls[0].resolve();
		await flushPendingWrites();

		serializer.enqueue(docB);

		expect(recorder.calls.map((call) => call.text)).toEqual([docA, docB]);
	});

	it("starts no write of its own when nothing is enqueued during one", async () => {
		const recorder = createWriteRecorder();
		const serializer = createLatestWriteSerializer(recorder.write);

		serializer.enqueue(docA);
		recorder.calls[0].resolve();
		await flushPendingWrites();

		expect(recorder.calls.map((call) => call.text)).toEqual([docA]);
	});

	it("does not throw from enqueue when the write throws synchronously", () => {
		const serializer = createLatestWriteSerializer(() => {
			throw new Error("applyEdit is unavailable");
		});

		expect(() => serializer.enqueue(docA)).not.toThrow();
	});
});

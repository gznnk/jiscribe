import { describe, expect, it } from "vitest";

import { createSelfWriteTracker } from "../selfWriteTracker";

/** Canvas JSON as the extension writes it: pretty-printed with "\n" separators. */
const docJson = (name: string): string =>
	JSON.stringify({ version: 1, root: [{ id: name }] }, null, 2);

const docA = docJson("a");
const docB = docJson("b");
const externalJson = docJson("edited-by-someone-else");

describe("selfWriteTracker", () => {
	it("recognizes the echo of a single write", () => {
		const tracker = createSelfWriteTracker();

		tracker.track(docA, "\n");

		expect(tracker.isSelfWrite(docA)).toBe(true);
	});

	it("recognizes two overlapping writes echoed in write order", () => {
		const tracker = createSelfWriteTracker();

		tracker.track(docA, "\n");
		tracker.track(docB, "\n");

		expect(tracker.isSelfWrite(docA)).toBe(true);
		expect(tracker.isSelfWrite(docB)).toBe(true);
	});

	it("drops an older write with no echo when the newer one matches", () => {
		const tracker = createSelfWriteTracker();

		// A's echo never arrived, so B's is the first event the tracker sees.
		tracker.track(docA, "\n");
		tracker.track(docB, "\n");

		expect(tracker.isSelfWrite(docB)).toBe(true);
		// A is gone with it; a document holding A again is an external change.
		expect(tracker.isSelfWrite(docA)).toBe(false);
	});

	it("forwards a pending write's echo that arrives after an external change", () => {
		const tracker = createSelfWriteTracker();

		tracker.track(docA, "\n");

		// The external change is forwarded, replacing the canvas' document...
		expect(tracker.isSelfWrite(externalJson)).toBe(false);
		// ...so our own write landing afterwards is news for the canvas too.
		expect(tracker.isSelfWrite(docA)).toBe(false);
	});

	it("forgets a write that failed to reach the document", () => {
		const tracker = createSelfWriteTracker();

		const trackedText = tracker.track(docA, "\n");
		tracker.untrack(trackedText);

		expect(tracker.isSelfWrite(docA)).toBe(false);
	});

	it("forgets only one entry per untrack when the same text is written twice", () => {
		const tracker = createSelfWriteTracker();

		const trackedText = tracker.track(docA, "\n");
		tracker.track(docA, "\n");
		tracker.untrack(trackedText);

		expect(tracker.isSelfWrite(docA)).toBe(true);
		expect(tracker.isSelfWrite(docA)).toBe(false);
	});

	it("matches a CRLF document against the \\n text handed to applyEdit", () => {
		const tracker = createSelfWriteTracker();

		const trackedText = tracker.track(docA, "\r\n");

		expect(trackedText).toBe(docA.replaceAll("\n", "\r\n"));
		expect(tracker.isSelfWrite(trackedText)).toBe(true);
	});

	it("does not match the unconverted text on a CRLF document", () => {
		const tracker = createSelfWriteTracker();

		tracker.track(docA, "\r\n");

		expect(tracker.isSelfWrite(docA)).toBe(false);
	});

	it("leaves the text untouched on an LF document", () => {
		const tracker = createSelfWriteTracker();

		const trackedText = tracker.track(docA, "\n");

		expect(trackedText).toBe(docA);
		expect(tracker.isSelfWrite(docA)).toBe(true);
	});

	it("empties the queue on an unrelated text", () => {
		const tracker = createSelfWriteTracker();

		tracker.track(docA, "\n");
		tracker.track(docB, "\n");

		expect(tracker.isSelfWrite(externalJson)).toBe(false);
		expect(tracker.isSelfWrite(docA)).toBe(false);
		expect(tracker.isSelfWrite(docB)).toBe(false);
	});
});

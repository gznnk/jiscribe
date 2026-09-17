import { describe, expect, it } from "vitest";

import { createCommitGate } from "../commitGate";

describe("createCommitGate", () => {
	it("accepts any commit before the first update is posted", () => {
		const gate = createCommitGate();

		expect(gate.lastForwardedVersion).toBeUndefined();
		expect(gate.accepts(undefined)).toBe(true);
		expect(gate.accepts(0)).toBe(true);
		expect(gate.accepts(7)).toBe(true);
	});

	it("accepts a commit built on the version it last stamped", () => {
		const gate = createCommitGate();
		gate.stamp(4);

		expect(gate.accepts(4)).toBe(true);
	});

	it("keeps accepting a run of commits, as nothing restamps between them", () => {
		const gate = createCommitGate();
		gate.stamp(4);

		// Each commit is written and echoes back as a change event the editor does
		// not forward, so every one of them still quotes version 4.
		expect(gate.accepts(4)).toBe(true);
		expect(gate.accepts(4)).toBe(true);
		expect(gate.accepts(4)).toBe(true);
	});

	it("drops a commit built before the newest stamped update", () => {
		const gate = createCommitGate();
		gate.stamp(4);
		gate.stamp(9);

		expect(gate.accepts(4)).toBe(false);
		expect(gate.accepts(8)).toBe(false);
		expect(gate.lastForwardedVersion).toBe(9);
	});

	it("accepts a commit newer than the newest stamped update", () => {
		const gate = createCommitGate();
		gate.stamp(4);

		// The Webview cannot quote a version it was never sent, but a document that
		// moves between the read and the post would produce one; such a commit is
		// built on at least what the gate knows about.
		expect(gate.accepts(5)).toBe(true);
	});

	it("drops an unversioned commit once it has stamped, as no posted update lacked a version", () => {
		const gate = createCommitGate();
		gate.stamp(4);

		expect(gate.accepts(undefined)).toBe(false);
	});

	it("keeps each gate's stamps to itself", () => {
		const firstGate = createCommitGate();
		const secondGate = createCommitGate();
		firstGate.stamp(9);

		expect(secondGate.lastForwardedVersion).toBeUndefined();
		expect(secondGate.accepts(1)).toBe(true);
	});
});

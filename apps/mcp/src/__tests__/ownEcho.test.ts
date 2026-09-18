import { describe, expect, it } from "vitest";

import { isOwnEcho } from "../viewer/ownEcho";

const emptyDocText = '{"version":1,"root":[]}\n';

describe("isOwnEcho", () => {
	it("recognises the synced text coming back for the synced file", () => {
		expect(
			isOwnEcho(
				{ relPath: "a.jis.json", docText: emptyDocText },
				{ openPath: "a.jis.json", syncedText: emptyDocText },
			),
		).toBe(true);
	});

	it("does not take another file with the same text for an echo", () => {
		// Two freshly created files hold the same empty canvas; opening the second
		// has to move the page to it rather than keep the first's path
		expect(
			isOwnEcho(
				{ relPath: "b.jis.json", docText: emptyDocText },
				{ openPath: "a.jis.json", syncedText: emptyDocText },
			),
		).toBe(false);
	});

	it("does not take a different text for an echo", () => {
		expect(
			isOwnEcho(
				{ relPath: "a.jis.json", docText: '{"version":1,"root":[{}]}\n' },
				{ openPath: "a.jis.json", syncedText: emptyDocText },
			),
		).toBe(false);
	});

	it("treats nothing as an echo before anything has been synced", () => {
		expect(
			isOwnEcho(
				{ relPath: "a.jis.json", docText: emptyDocText },
				{ openPath: null, syncedText: null },
			),
		).toBe(false);
	});
});

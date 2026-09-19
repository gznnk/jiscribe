import { describe, expect, it } from "vitest";

import {
	calcDocLoadId,
	classifyIncomingDoc,
	isOwnEcho,
	type DocIdentity,
} from "../viewer/ownEcho";

const emptyDocText = '{"version":1,"root":[]}\n';

/** A file as the first host names it */
const firstHostDoc: DocIdentity = {
	sessionToken: "first-host",
	relPath: "a.jis.json",
};

/**
 * A file of the same name in another directory, which a host of its own serves
 * (the host restarts on the new directory)
 */
const secondHostDoc: DocIdentity = {
	sessionToken: "second-host",
	relPath: "a.jis.json",
};

describe("isOwnEcho", () => {
	it("recognises the synced text coming back for the synced file", () => {
		expect(
			isOwnEcho(
				{ identity: firstHostDoc, docText: emptyDocText },
				{ identity: firstHostDoc, syncedText: emptyDocText },
			),
		).toBe(true);
	});

	it("still recognises it after a reconnect to the same host", () => {
		// The frame after a dropped connection is a fresh object from the same host;
		// it has to stay the same document, or an edit held through the drop is lost
		expect(
			isOwnEcho(
				{ identity: { ...firstHostDoc }, docText: emptyDocText },
				{ identity: firstHostDoc, syncedText: emptyDocText },
			),
		).toBe(true);
	});

	it("does not take another file with the same text for an echo", () => {
		// Two freshly created files hold the same empty canvas; opening the second
		// has to move the page to it rather than keep the first's path
		expect(
			isOwnEcho(
				{
					identity: { ...firstHostDoc, relPath: "b.jis.json" },
					docText: emptyDocText,
				},
				{ identity: firstHostDoc, syncedText: emptyDocText },
			),
		).toBe(false);
	});

	it("does not take a same-named file from another host for an echo", () => {
		// The same text and the same relative path, but another directory: taking it
		// for an echo would keep the previous file's doc, and the next save would
		// write it into this one
		expect(
			isOwnEcho(
				{ identity: secondHostDoc, docText: emptyDocText },
				{ identity: firstHostDoc, syncedText: emptyDocText },
			),
		).toBe(false);
	});

	it("does not take a different text for an echo", () => {
		expect(
			isOwnEcho(
				{ identity: firstHostDoc, docText: '{"version":1,"root":[{}]}\n' },
				{ identity: firstHostDoc, syncedText: emptyDocText },
			),
		).toBe(false);
	});

	it("treats nothing as an echo before anything has been synced", () => {
		expect(
			isOwnEcho(
				{ identity: firstHostDoc, docText: emptyDocText },
				{ identity: null, syncedText: null },
			),
		).toBe(false);
	});
});

describe("classifyIncomingDoc", () => {
	const syncedFirstHostDoc = {
		identity: firstHostDoc,
		syncedText: emptyDocText,
	};

	it("takes the synced text for an echo while the file has stayed usable", () => {
		expect(
			classifyIncomingDoc(
				{ identity: firstHostDoc, docText: emptyDocText },
				{ ...syncedFirstHostDoc, isFileUnusable: false },
			),
		).toBe("echo");
	});

	it("takes the synced text for a recovery after the file could not be used", () => {
		// A broken or missing file put back byte for byte: taken for an echo, the
		// error would stay up and a broken file would go on refusing every save
		expect(
			classifyIncomingDoc(
				{ identity: firstHostDoc, docText: emptyDocText },
				{ ...syncedFirstHostDoc, isFileUnusable: true },
			),
		).toBe("back-to-synced");
	});

	it("takes a different text for a new one whatever the file went through", () => {
		const otherText = '{"version":1,"root":[{}]}\n';
		for (const isFileUnusable of [false, true]) {
			expect(
				classifyIncomingDoc(
					{ identity: firstHostDoc, docText: otherText },
					{ ...syncedFirstHostDoc, isFileUnusable },
				),
			).toBe("new");
		}
	});

	it("takes another document with the synced text for a new one", () => {
		// Recovery is of the document synced; a same-named file from another host
		// has to be drawn, not written over with this page's edits
		expect(
			classifyIncomingDoc(
				{ identity: secondHostDoc, docText: emptyDocText },
				{ ...syncedFirstHostDoc, isFileUnusable: true },
			),
		).toBe("new");
	});

	it("takes anything for a new one before anything has been synced", () => {
		expect(
			classifyIncomingDoc(
				{ identity: firstHostDoc, docText: emptyDocText },
				{ identity: null, syncedText: null, isFileUnusable: true },
			),
		).toBe("new");
	});
});

describe("calcDocLoadId", () => {
	it("keeps the load id across a reconnect to the same host", () => {
		// A changed id drops the undo history, which a dropped network must not do
		expect(calcDocLoadId({ ...firstHostDoc })).toBe(
			calcDocLoadId(firstHostDoc),
		);
	});

	it("changes the load id for a same-named file from another host", () => {
		// The canvas's undo history belongs to the previous file; kept, Ctrl+Z would
		// write that file's content into this one
		expect(calcDocLoadId(secondHostDoc)).not.toBe(calcDocLoadId(firstHostDoc));
	});

	it("changes the load id for another file from the same host", () => {
		expect(calcDocLoadId({ ...firstHostDoc, relPath: "b.jis.json" })).not.toBe(
			calcDocLoadId(firstHostDoc),
		);
	});

	it("gives no load id while nothing is open", () => {
		expect(calcDocLoadId(null)).toBeUndefined();
	});
});

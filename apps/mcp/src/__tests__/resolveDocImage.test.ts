// The viewer's image resolver. What it decides is which workspace-relative path a
// `src` becomes, and which `src` never reaches the host at all, so `fetch` is
// replaced with a recorder here.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDocImageResolver } from "../viewer/resolveDocImage";

/** Every URL the resolver asked for, in order */
let requestedUrls: string[];

/**
 * Replaces `fetch` with one answering the same response every time.
 *
 * @param response What to answer with. Its body is what a resolved Blob is read
 *   from
 */
const stubFetch = (response: Response): void => {
	vi.stubGlobal(
		"fetch",
		vi.fn((input: string) => {
			requestedUrls.push(input);
			return Promise.resolve(response);
		}),
	);
};

beforeEach(() => {
	requestedUrls = [];
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("createDocImageResolver", () => {
	it("reads the image through the host, relative to the diagram's directory", async () => {
		stubFetch(new Response("png-bytes", { status: 200 }));
		const resolveImage = createDocImageResolver("docs/nested/diagram.jis.json");

		const blob = await resolveImage("images/logo.png");

		expect(requestedUrls).toEqual([
			`/api/file?path=${encodeURIComponent("docs/nested/images/logo.png")}`,
		]);
		expect(await blob.text()).toBe("png-bytes");
	});

	it("asks for the bare path when the diagram sits at the workspace root", async () => {
		stubFetch(new Response("png-bytes", { status: 200 }));
		const resolveImage = createDocImageResolver("diagram.jis.json");

		await resolveImage("images/logo.png");

		expect(requestedUrls).toEqual([
			`/api/file?path=${encodeURIComponent("images/logo.png")}`,
		]);
	});

	it.each([
		["an escape through ..", "../secret.png"],
		["an absolute path", "/etc/passwd"],
		["a url", "https://example.com/logo.png"],
		["a windows separator", "images\\logo.png"],
		["an empty string", ""],
	])("rejects %s without asking the host", async (_label, src) => {
		stubFetch(new Response("png-bytes", { status: 200 }));
		const resolveImage = createDocImageResolver("diagram.jis.json");

		await expect(resolveImage(src)).rejects.toThrow(
			/relative to the diagram's own directory/,
		);
		expect(requestedUrls).toEqual([]);
	});

	it("rejects when the host does not hand the file back", async () => {
		stubFetch(new Response('{"error":"not found"}', { status: 404 }));
		const resolveImage = createDocImageResolver("diagram.jis.json");

		await expect(resolveImage("images/missing.png")).rejects.toThrow(
			/images\/missing\.png/,
		);
	});
});

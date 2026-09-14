import { describe, expect, it } from "vitest";

import { resolveDocImageMimeType } from "../docImageMimeType";

describe("resolveDocImageMimeType", () => {
	it.each([
		["a.png", "image/png"],
		["a.jpg", "image/jpeg"],
		["a.jpeg", "image/jpeg"],
		["a.gif", "image/gif"],
		["a.webp", "image/webp"],
		["a.avif", "image/avif"],
		["a.bmp", "image/bmp"],
		["a.svg", "image/svg+xml"],
	])("maps %s to %s", (docRelativePath, mimeType) => {
		expect(resolveDocImageMimeType(docRelativePath)).toBe(mimeType);
	});

	it("reads the extension case-insensitively and off the last segment only", () => {
		expect(resolveDocImageMimeType("images/Photo.JPG")).toBe("image/jpeg");
		expect(resolveDocImageMimeType("release.v2/logo.png")).toBe("image/png");
	});

	it("returns null for a missing extension or one no image object may name", () => {
		expect(resolveDocImageMimeType("logo")).toBeNull();
		expect(resolveDocImageMimeType("release.v2/logo")).toBeNull();
		expect(resolveDocImageMimeType("notes.txt")).toBeNull();
		expect(resolveDocImageMimeType("diagram.jis")).toBeNull();
		expect(resolveDocImageMimeType("a.png/")).toBeNull();
	});
});

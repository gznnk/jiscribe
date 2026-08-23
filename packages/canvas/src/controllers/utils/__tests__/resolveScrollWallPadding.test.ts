import { describe, expect, it } from "vitest";

import { resolveScrollWallPadding } from "../resolveScrollWallPadding";

const pagePadding = { top: 32, right: 64, bottom: 24, left: 64 };

describe("resolveScrollWallPadding", () => {
	describe("with no host setting", () => {
		it("leaves a document that declares nothing unrestricted", () => {
			expect(resolveScrollWallPadding(null, undefined)).toBeNull();
			expect(resolveScrollWallPadding(null, {})).toBeNull();
			expect(
				resolveScrollWallPadding(null, { padding: pagePadding }),
			).toBeNull();
		});

		it("leaves an explicitly infinite document unrestricted", () => {
			expect(
				resolveScrollWallPadding(null, {
					padding: pagePadding,
					scroll: "infinite",
				}),
			).toBeNull();
		});

		it("walls a content document in at its own per-side view.padding", () => {
			expect(
				resolveScrollWallPadding(null, {
					padding: pagePadding,
					scroll: "content",
				}),
			).toEqual(pagePadding);
		});

		it("puts the wall flush on the content when the document declares no padding", () => {
			expect(resolveScrollWallPadding(null, { scroll: "content" })).toEqual({
				top: 0,
				right: 0,
				bottom: 0,
				left: 0,
			});
		});
	});

	describe("with a host setting", () => {
		it("wins over a document that asks for a content wall", () => {
			expect(
				resolveScrollWallPadding(
					{ mode: "infinite" },
					{
						padding: pagePadding,
						scroll: "content",
					},
				),
			).toBeNull();
		});

		it("wins over a document that asks for no wall", () => {
			expect(
				resolveScrollWallPadding(
					{ mode: "content", padding: 0 },
					{
						padding: pagePadding,
						scroll: "infinite",
					},
				),
			).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
		});

		it("ignores view.padding, using its own uniform padding on every side", () => {
			expect(
				resolveScrollWallPadding(
					{ mode: "content", padding: 300 },
					{
						padding: pagePadding,
						scroll: "content",
					},
				),
			).toEqual({ top: 300, right: 300, bottom: 300, left: 300 });
		});

		it("defaults its padding to 100 world units", () => {
			expect(resolveScrollWallPadding({ mode: "content" }, undefined)).toEqual({
				top: 100,
				right: 100,
				bottom: 100,
				left: 100,
			});
		});
	});
});

import { describe, expect, it } from "vitest";

import { validateViewDoc } from "../validateViewDoc";
import { isViewOpenMode, resolveViewPadding } from "../ViewDoc";

const paths = (view: unknown) =>
	validateViewDoc(view, "view").map((diagnostic) => diagnostic.path);

describe("validateViewDoc", () => {
	it("accepts an empty view", () => {
		expect(validateViewDoc({}, "view")).toEqual([]);
	});

	it("accepts a fully specified view", () => {
		const view = {
			padding: { top: 48, right: 64, bottom: 64, left: 64 },
			open: "fit-width",
		};
		expect(validateViewDoc(view, "view")).toEqual([]);
	});

	it("accepts padding with only some sides", () => {
		expect(validateViewDoc({ padding: { top: 0 } }, "view")).toEqual([]);
	});

	it("rejects a non-object view at the field's own path", () => {
		expect(paths("fit-all")).toEqual(["view"]);
		expect(paths(null)).toEqual(["view"]);
	});

	it("rejects non-object padding", () => {
		expect(paths({ padding: 24 })).toEqual(["view.padding"]);
	});

	it("rejects a non-numeric padding side", () => {
		expect(paths({ padding: { top: "48" } })).toEqual(["view.padding.top"]);
	});

	it("rejects a negative padding side, which would crop rather than frame", () => {
		expect(paths({ padding: { left: -1 } })).toEqual(["view.padding.left"]);
	});

	it("reports every bad side, not just the first", () => {
		expect(paths({ padding: { top: -1, bottom: "x" } })).toEqual([
			"view.padding.top",
			"view.padding.bottom",
		]);
	});

	it("rejects an open mode outside the known set", () => {
		expect(paths({ open: "fit-height" })).toEqual(["view.open"]);
	});
});

describe("isViewOpenMode", () => {
	it("passes exactly the known modes", () => {
		expect(isViewOpenMode("fit-width")).toBe(true);
		expect(isViewOpenMode("fit-all")).toBe(true);
	});

	it("rejects anything else, non-strings included", () => {
		expect(isViewOpenMode("fit-height")).toBe(false);
		expect(isViewOpenMode("")).toBe(false);
		expect(isViewOpenMode(undefined)).toBe(false);
		expect(isViewOpenMode(1)).toBe(false);
	});
});

describe("resolveViewPadding", () => {
	it("fills every missing side with 0", () => {
		expect(resolveViewPadding({ top: 48 })).toEqual({
			top: 48,
			right: 0,
			bottom: 0,
			left: 0,
		});
	});

	it("treats an absent padding as zero on every side", () => {
		expect(resolveViewPadding()).toEqual({
			top: 0,
			right: 0,
			bottom: 0,
			left: 0,
		});
	});
});

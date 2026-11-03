import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { normalizeCssColor } from "../normalizeCssColor";

// Node has no canvas. This one mimics a 2D context's fillStyle: an assignment it
// accepts is stored in the browser's spelling, one it rejects is ignored.
const ACCEPTED_SPELLINGS: Record<string, string> = {
	"#000000": "#000000",
	"#ffffff": "#ffffff",
	red: "#ff0000",
	"hsl(0 72% 51% / 0.5)": "rgba(220, 40, 40, 0.5)",
};

const createFakeContext = () => {
	let fillStyle = "#000000";
	return {
		get fillStyle() {
			return fillStyle;
		},
		set fillStyle(value: string) {
			const spelling = ACCEPTED_SPELLINGS[value.trim()];
			if (spelling !== undefined) {
				fillStyle = spelling;
			}
		},
	};
};

describe("normalizeCssColor", () => {
	const getContext = vi.fn();

	beforeEach(() => {
		getContext.mockReset();
		getContext.mockImplementation(createFakeContext);
		vi.stubGlobal("document", {
			createElement: () => ({ getContext }),
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it.each([
		["red", "#ff0000"],
		["  red  ", "#ff0000"],
		["hsl(0 72% 51% / 0.5)", "rgba(220, 40, 40, 0.5)"],
	])("returns the canvas spelling of %j", (color, expected) => {
		expect(normalizeCssColor(color)).toBe(expected);
	});

	it.each(["#000000", "#ffffff"])(
		"reads %s, one of its own starting values, as itself",
		(color) => {
			expect(normalizeCssColor(color)).toBe(color);
		},
	);

	it.each(["auto", "", "inherit"])(
		"returns null for %j, which the canvas rejects",
		(color) => {
			expect(normalizeCssColor(color)).toBeNull();
		},
	);

	it.each([
		"var(--x)",
		"currentColor",
		"color-mix(in srgb, CurrentColor, red)",
	])("returns null for %j without asking the canvas", (color) => {
		expect(normalizeCssColor(color)).toBeNull();
		expect(getContext).not.toHaveBeenCalled();
	});

	it("returns null when no 2D context is available", () => {
		getContext.mockReturnValue(null);
		expect(normalizeCssColor("red")).toBeNull();
	});
});

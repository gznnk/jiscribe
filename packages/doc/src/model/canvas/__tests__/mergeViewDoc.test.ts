import { describe, expect, it } from "vitest";

import { mergeViewDoc } from "../mergeViewDoc";
import type { ViewDoc } from "../ViewDoc";

describe("mergeViewDoc", () => {
	it("returns a fresh declaration, leaving the one it was given alone", () => {
		const srcView: ViewDoc = { open: "fit-all" };

		const nextView = mergeViewDoc(srcView, { scroll: "content" });

		expect(nextView).toEqual({ open: "fit-all", scroll: "content" });
		expect(srcView).toEqual({ open: "fit-all" });
	});

	it("starts from nothing when no declaration is given, dropping a side of 0", () => {
		expect(mergeViewDoc(undefined, { padding: { top: 24, left: 0 } })).toEqual({
			padding: { top: 24 },
		});
	});

	it("drops a part given as null", () => {
		expect(
			mergeViewDoc(
				{ padding: { top: 24 }, open: "fit-width", scroll: "content" },
				{ padding: null, open: null },
			),
		).toEqual({ scroll: "content" });
	});

	it("returns undefined once no part is left", () => {
		expect(
			mergeViewDoc({ padding: { top: 24 } }, { padding: { top: 0 } }),
		).toBeUndefined();
	});

	it("hands back an unchanged copy for empty params", () => {
		const srcView: ViewDoc = { scroll: "content" };

		const nextView = mergeViewDoc(srcView, {});

		expect(nextView).toEqual(srcView);
		expect(nextView).not.toBe(srcView);
	});
});

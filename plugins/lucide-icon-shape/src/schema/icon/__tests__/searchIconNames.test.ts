import { describe, expect, it } from "vitest";

import { ICON_ALIASES, ICON_NODES } from "../iconData.generated";
import { searchIconNames } from "../searchIconNames";

describe("searchIconNames", () => {
	it("ranks names starting with the term first, then shorter, then alphabetically", () => {
		expect(searchIconNames("lock").names.slice(0, 6)).toEqual([
			"lock",
			"lock-open",
			"lock-keyhole",
			"lock-keyhole-open",
			"clock",
			"blocks",
		]);
		expect(searchIconNames("user").names.slice(3, 6)).toEqual([
			"user-cog",
			"user-key",
			"user-pen",
		]);
	});

	it("answers a superseded name with the current one", () => {
		expect(searchIconNames("alert-circle").names).toEqual(["circle-alert"]);
		expect(ICON_ALIASES["alert-circle"]).toBe("circle-alert");
	});

	// `circle-user` holds the term itself and through its former name `user-circle`.
	it("lists a name once when it matches both ways", () => {
		expect(ICON_ALIASES["user-circle"]).toBe("circle-user");
		const { names, total } = searchIconNames("user");
		expect(names.filter((name) => name === "circle-user")).toHaveLength(1);
		expect(new Set(names).size).toBe(names.length);
		expect(total).toBe(names.length);
	});

	it("cuts the list at 96 and counts every match in total", () => {
		const matching = Object.keys(ICON_NODES).filter((name) =>
			name.includes("a"),
		);
		const { names, total } = searchIconNames("a");
		expect(names).toHaveLength(96);
		expect(total).toBeGreaterThanOrEqual(matching.length);
		expect(new Set(names).size).toBe(96);
	});

	it("normalizes the term and matches nothing for one that normalizes to nothing", () => {
		expect(searchIconNames("FileText").names[0]).toBe("file-text");
		expect(searchIconNames("  ")).toEqual({ names: [], total: 0 });
	});
});

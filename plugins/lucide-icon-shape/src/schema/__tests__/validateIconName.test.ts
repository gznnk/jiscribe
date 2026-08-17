import { describe, expect, it } from "vitest";

import { validateIconName } from "../validateIconName";

describe("validateIconName", () => {
	it("accepts an absent icon", () => {
		expect(validateIconName({}, "root[0]")).toEqual([]);
		expect(validateIconName({ icon: undefined }, "root[0]")).toEqual([]);
	});

	it("accepts a name that resolves, alias or spelling variant included", () => {
		expect(validateIconName({ icon: "lock" }, "root[0]")).toEqual([]);
		expect(validateIconName({ icon: "user-circle" }, "root[0]")).toEqual([]);
		expect(validateIconName({ icon: "fileText" }, "root[0]")).toEqual([]);
	});

	it("reports a non-string name at the field's path", () => {
		expect(validateIconName({ icon: 42 }, "root[0]")).toEqual([
			{ path: "root[0].icon", message: "must be a string", beyondSchema: true },
		]);
	});

	it("names the candidates for an unknown name so one round of correcting is enough", () => {
		const [diagnostic] = validateIconName({ icon: "clock-alarm" }, "root[0]");
		expect(diagnostic.path).toBe("root[0].icon");
		expect(diagnostic.message).toBe(
			'unknown icon "clock-alarm" — did you mean "alarm-clock"?',
		);
		expect(diagnostic.beyondSchema).toBe(true);
	});

	it("still reports an unknown name that resembles nothing", () => {
		const [diagnostic] = validateIconName(
			{ icon: "qwertyuiopasdfgh" },
			"root[0]",
		);
		expect(diagnostic.message).toBe(
			'unknown icon "qwertyuiopasdfgh" (see the icon list in the AI reference)',
		);
	});
});

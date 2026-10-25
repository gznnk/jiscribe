import { describe, expect, it } from "vitest";

import { buildMenuTemplate } from "../applicationMenu";

describe("buildMenuTemplate", () => {
	it("keeps only the app menu and the Edit menu on macOS", () => {
		expect(buildMenuTemplate("darwin")).toEqual([
			{ role: "appMenu" },
			{ role: "editMenu" },
		]);
	});

	it.each(["win32", "linux"] as const)(
		"builds no menu bar on %s",
		(platform) => {
			expect(buildMenuTemplate(platform)).toBeNull();
		},
	);
});

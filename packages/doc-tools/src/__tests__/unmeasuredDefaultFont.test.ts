import { DEFAULT_FONT_FAMILY } from "@jiscribe/doc/unstable";
import { expect, it, vi } from "vitest";

import { diagnoseDoc } from "../diagnoseDoc";
import type * as fontSourcePackages from "../measure/fontSourcePackages";
import { validateDoc } from "../validateDoc";

// An install without the font packages: no stack is measured, the default
// family's included.
vi.mock("../measure/fontSourcePackages", async (importOriginal) => ({
	...(await importOriginal<typeof fontSourcePackages>()),
	isFontStackMeasured: () => false,
}));

it("names the objects drawn in the default family when its font files are missing", () => {
	const result = validateDoc(
		JSON.stringify({
			version: 1,
			root: [
				{
					id: "plain",
					type: "rect",
					x: 0,
					y: 0,
					width: 300,
					height: 100,
					text: "a",
				},
				{
					id: "styled",
					type: "rect",
					x: 400,
					y: 0,
					width: 300,
					height: 100,
					text: [{ text: "b", fontFamily: '"Klee One", cursive' }],
				},
				{ id: "empty", type: "rect", x: 800, y: 0, width: 300, height: 100 },
			],
		}),
	);
	const diagnostics = diagnoseDoc(result.doc!).filter((diagnostic) =>
		diagnostic.message.startsWith("fontFamily "),
	);
	expect(
		diagnostics.map((diagnostic) =>
			/^fontFamily "(.*)" names .*: (\w+);/.exec(diagnostic.message)?.slice(1),
		),
	).toEqual([
		[DEFAULT_FONT_FAMILY, "plain"],
		['"Klee One", cursive', "styled"],
	]);
});

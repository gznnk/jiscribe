import { describe, it, expect } from "vitest";

import { extraStyleTable } from "../extraStyleTable";
import { connectorOf, contextOf, rectOf } from "./support/styleFixtures";

describe("extraStyleTable", () => {
	it("a type declaring nothing answers for nothing", () => {
		expect(extraStyleTable("rect", undefined)).toEqual({});
	});

	it("one entry per declared name, under the name itself", () => {
		const table = extraStyleTable("container", {
			headerFill: { valueType: "string" },
			headerHeight: { valueType: "number" },
		});
		expect(Object.keys(table)).toEqual(["headerFill", "headerHeight"]);
	});

	it("the entry writes the field the name states, read as the declared type", () => {
		const table = extraStyleTable("container", {
			headerHeight: { valueType: "number" },
		});
		const updated = table["headerHeight"]?.apply(
			rectOf("a"),
			null,
			"32",
			contextOf(),
		);
		expect((updated as unknown as { headerHeight: number }).headerHeight).toBe(
			32,
		);
	});

	it("a dotted name is the path into the nested object", () => {
		const table = extraStyleTable("connector", {
			"label.fill": { valueType: "string" },
		});
		const updated = table["label.fill"]?.apply(
			connectorOf("c", { label: { text: "Yes" } }),
			null,
			"#f00",
			contextOf(),
		);
		expect((updated as unknown as { label: object }).label).toEqual({
			text: "Yes",
			fill: "#f00",
		});
	});

	it("a name the engine's own vocabulary owns is refused, naming the type and the name", () => {
		expect(() =>
			extraStyleTable("container", { fill: { valueType: "string" } }),
		).toThrow(/"container".*"fill"/);
	});
});

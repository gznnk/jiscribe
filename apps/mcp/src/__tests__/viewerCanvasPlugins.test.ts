import { standardDocPlugins } from "@jiscribe/standard-shapes/doc";
import { describe, expect, it } from "vitest";

import { canvasParser, plugins } from "../viewer/canvasPlugins";

/** Every object type a list of plugins contributes, sorted. */
const objectTypesOf = (
	pluginList: readonly { objects?: Readonly<Record<string, unknown>> }[],
): string[] =>
	pluginList.flatMap((plugin) => Object.keys(plugin.objects ?? {})).sort();

// The viewer draws with one list and parses with the other: a type only the
// parser knows reaches the canvas as an unknown object and is never drawn.
describe("the viewer's shape set", () => {
	it("draws every type it parses, plugin for plugin in the same order", () => {
		expect(plugins.map((plugin) => plugin.id)).toEqual(
			standardDocPlugins.map((plugin) => plugin.id),
		);
		expect(objectTypesOf(plugins)).toEqual(objectTypesOf(standardDocPlugins));
		expect(objectTypesOf(plugins)).toContain("erEntity");
	});

	it("parses an entity as a type it knows, with no warning", () => {
		const parsed = canvasParser.parse(
			JSON.stringify({
				version: 1,
				root: [
					{
						id: "users",
						type: "erEntity",
						x: 0,
						y: 0,
						name: "users",
						columns: [{ key: "PK", name: "id", type: "bigint" }],
					},
				],
			}),
		);

		expect(parsed.kind).toBe("ok");
		if (parsed.kind !== "ok") {
			return;
		}
		// An unknown type is kept as written, so only the warning tells the two apart.
		expect(parsed.warnings).toEqual([]);
		expect(parsed.doc.root.map((object) => object.type)).toEqual(["erEntity"]);
	});
});

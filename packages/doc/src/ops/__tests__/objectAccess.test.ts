import { describe, expect, it } from "vitest";

import type { CanvasDoc } from "../../model/canvas/CanvasDoc";
import type { ObjectDoc } from "../../model/objects/base/ObjectDoc";
import { DocOperationError } from "../errors";
import { locateObjects, requireObjects } from "../utils/objectAccess";

/** A bare object; these helpers read nothing but `id`, `type` and a group's `children`. */
const leaf = (id: string, marker?: string): ObjectDoc =>
	({
		id,
		type: "rect",
		...(marker !== undefined ? { marker } : {}),
	}) as ObjectDoc;

const group = (id: string, children: ObjectDoc[]): ObjectDoc =>
	({ id, type: "group", children }) as ObjectDoc;

/** `a`, then group `g` holding `b` and group `h` holding `c`, then `d`. */
const nestedDoc = (): CanvasDoc => ({
	version: 1,
	root: [
		leaf("a"),
		group("g", [leaf("b"), group("h", [leaf("c")])]),
		leaf("d"),
	],
});

describe("requireObjects", () => {
	it("returns the locations in the order the ids were given, group children included", () => {
		const doc = nestedDoc();

		const locations = requireObjects(doc, ["d", "c", "a", "b"]);

		expect(locations.map(({ object }) => object.id)).toEqual([
			"d",
			"c",
			"a",
			"b",
		]);
		const [, nested] = locations;
		expect(nested.siblings[nested.index]).toBe(nested.object);
		expect(nested.siblings).toBe(
			(
				(doc.root[1] as unknown as { children: ObjectDoc[] })
					.children[1] as unknown as { children: ObjectDoc[] }
			).children,
		);
	});

	it("yields a repeated id once per time it was given", () => {
		const locations = requireObjects(nestedDoc(), ["b", "a", "b"]);

		expect(locations.map(({ object }) => object.id)).toEqual(["b", "a", "b"]);
	});

	it("names every missing id in one error, in the order given", () => {
		expect(() => requireObjects(nestedDoc(), ["x", "a", "y", "x"])).toThrow(
			new DocOperationError("object not found: x, y, x"),
		);
	});

	it("takes the first in pre-order when the doc carries an id twice", () => {
		const doc: CanvasDoc = {
			version: 1,
			root: [
				group("g", [leaf("dup", "inside the group")]),
				leaf("dup", "at the root"),
			],
		};

		const [location] = requireObjects(doc, ["dup"]);

		expect(location.object.marker).toBe("inside the group");
	});

	it("is empty for no ids", () => {
		expect(requireObjects(nestedDoc(), [])).toEqual([]);
	});
});

describe("locateObjects", () => {
	it("locates every object, groups and their children, when no ids are named", () => {
		expect([...locateObjects(nestedDoc()).keys()]).toEqual([
			"a",
			"g",
			"b",
			"h",
			"c",
			"d",
		]);
	});

	it("leaves out the ids it was not asked for and the ones no object carries", () => {
		const located = locateObjects(nestedDoc(), new Set(["c", "missing"]));

		expect([...located.keys()]).toEqual(["c"]);
	});

	it("keeps a group's own id ahead of a child carrying it too", () => {
		const doc: CanvasDoc = {
			version: 1,
			root: [group("dup", [leaf("dup")])],
		};

		expect(locateObjects(doc).get("dup")?.object.type).toBe("group");
	});
});

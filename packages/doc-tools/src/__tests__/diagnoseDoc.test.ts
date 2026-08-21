import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { CanvasDoc } from "@jiscribe/canvas/doc";
import { describe, expect, it } from "vitest";

import { diagnoseDoc } from "../diagnoseDoc";
import { validateDoc } from "../validateDoc";

const readFixture = (name: string): CanvasDoc => {
	const path = fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));
	const result = validateDoc(readFileSync(path, "utf8"));
	if (result.doc === undefined) {
		throw new Error(
			`${name} does not parse: ${result.diagnostics.map((diagnostic) => diagnostic.message).join("; ")}`,
		);
	}
	return result.doc;
};

describe("diagnoseDoc", () => {
	it("reports nothing for shapes their text fits in", () => {
		expect(diagnoseDoc(readFixture("fitting.jis.json"))).toEqual([]);
	});

	it("reports the object whose text does not fit, and only that one", () => {
		const diagnostics = diagnoseDoc(readFixture("overflowing.jis.json"));
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0]).toMatchObject({
			severity: "error",
			objectId: "cramped",
		});
		// The message carries the numbers behind the verdict, so a caller reading one
		// line knows how much bigger the box has to be.
		expect(diagnostics[0].message).toMatch(/text overflows rect 60x40/);
	});

	it("checks the children of a group along with the objects at the root", () => {
		const doc = readFixture("overflowing.jis.json");
		const [cramped, roomy] = doc.root;
		const grouped: CanvasDoc = {
			version: 1,
			root: [
				{ id: "group1", type: "group", children: [cramped, roomy] } as never,
			],
		};
		expect(diagnoseDoc(grouped)).toHaveLength(1);
	});

	it("passes over a shape whose label is drawn outside its outline", () => {
		const doc: CanvasDoc = {
			version: 1,
			root: [
				{
					id: "person",
					type: "actor",
					x: 0,
					y: 0,
					width: 40,
					height: 60,
					text: "ずっと長い名前のついた登場人物",
					fontSize: 14,
				} as never,
			],
		};
		expect(diagnoseDoc(doc)).toEqual([]);
	});
});

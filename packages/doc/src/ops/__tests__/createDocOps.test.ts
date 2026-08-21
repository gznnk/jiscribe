import { describe, expect, it } from "vitest";

import { createDocOps } from "../createDocOps";
import { emptyDoc } from "./support/docFixtures";
import { starDefinition } from "./support/pluginFixtures";

describe("createDocOps with a plugin definition", () => {
	const starPlugin = { id: "star-plugin", objects: { star: starDefinition } };

	it("adds and connects a plugin-supplied shape", () => {
		const pluginOps = createDocOps({ plugins: [starPlugin] });
		const doc = emptyDoc();

		const starId = pluginOps.addObject(doc, "star", {
			x: 10,
			y: 20,
			width: 100,
			height: 50,
		});
		expect(starId).toBe("star-1");
		const star = doc.root[0] as Record<string, unknown>;
		expect(star).toMatchObject({ type: "star", x: 10, y: 20 });
		expect(star.width).toBe(100);
		expect(star.height).toBe(50);

		const rectId = pluginOps.addObject(doc, "rect", { x: 300, y: 0 });
		const connectorId = pluginOps.connect(doc, {
			sourceId: starId,
			targetId: rectId,
		});
		expect(connectorId).toBe("connector-1");
	});

	it("throws at construction when a plugin duplicates a preset type", () => {
		expect(() =>
			createDocOps({
				plugins: [{ id: "dup-plugin", objects: { rect: starDefinition } }],
			}),
		).toThrow(/dup-plugin/);
	});
});

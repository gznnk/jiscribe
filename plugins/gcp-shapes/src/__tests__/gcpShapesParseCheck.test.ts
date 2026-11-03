import { createParseCheckSuite } from "@jiscribe/canvas-sdk/testing";
import { describe, expect, it } from "vitest";

import { gcpIconDocDefinition, gcpShapesDocPlugin } from "../doc";

// Run through a parser the plugin is registered on. `icon` is a string the JSON
// schema cannot see inside, so what matters is that validation reaches it.
createParseCheckSuite({
	name: "gcp shapes",
	plugin: gcpShapesDocPlugin,
	sampleDoc: {
		version: 1,
		root: [
			{
				id: "app",
				type: "gcpIcon",
				x: 40,
				y: 80,
				width: 64,
				height: 64,
				icon: "cloud-run",
				text: "Cloud Run",
			},
			{
				id: "db",
				type: "gcpIcon",
				x: 240,
				y: 80,
				width: 64,
				height: 64,
				// A doc naming a product drawn with its category's icon passes too.
				icon: "pubsub",
				text: "Pub/Sub",
			},
			{
				id: "writes",
				type: "connector",
				source: { owner: { id: "app" }, anchor: { kind: "center" } },
				target: { owner: { id: "db" }, anchor: { kind: "center" } },
				points: [],
			},
		],
	},
	accepts: [
		{
			name: "accepts an icon that names no icon",
			doc: {
				version: 1,
				root: [
					{ id: "icon", type: "gcpIcon", x: 0, y: 0, width: 64, height: 64 },
				],
			},
		},
	],
	rejects: [
		{
			name: "rejects an icon the set does not have",
			doc: {
				version: 1,
				root: [
					{
						id: "icon",
						type: "gcpIcon",
						x: 0,
						y: 0,
						width: 64,
						height: 64,
						icon: "compute-enginee",
					},
				],
			},
			diagnosticPaths: ["root[0].icon"],
		},
	],
});

describe("gcpIconDocDefinition", () => {
	it("names candidates for an icon that is nearly right, under the set's name", () => {
		const diagnostics = gcpIconDocDefinition.validateDoc?.(
			{
				id: "icon-1",
				type: "gcpIcon",
				x: 0,
				y: 0,
				width: 64,
				height: 64,
				icon: "cloud-runz",
			},
			"objects[0]",
		);

		expect(diagnostics?.[0]?.path).toBe("objects[0].icon");
		expect(diagnostics?.[0]?.message).toBe(
			'unknown Google Cloud icon "cloud-runz" — did you mean "cloud-run"?',
		);
		expect(diagnostics?.[0]?.beyondSchema).toBe(true);
	});

	it("creates icons without offering drag-drawing", () => {
		expect(gcpIconDocDefinition.factory?.createDoc).toBeTypeOf("function");
		expect(gcpIconDocDefinition.factory?.createDocFromBounds).toBeUndefined();
	});
});

import { createParseCheckSuite } from "@jiscribe/canvas-sdk/testing";
import { describe, expect, it } from "vitest";

import { azureIconDocDefinition, azureShapesDocPlugin } from "../doc";

// Run through a parser the plugin is registered on. `icon` is a string the JSON
// schema cannot see inside, so what matters is that validation reaches it.
createParseCheckSuite({
	name: "azure shapes",
	plugin: azureShapesDocPlugin,
	sampleDoc: {
		version: 1,
		root: [
			{
				id: "app",
				type: "azureIcon",
				x: 40,
				y: 80,
				width: 64,
				height: 64,
				icon: "app-services",
				text: "Azure App Service",
			},
			{
				id: "db",
				type: "azureIcon",
				x: 240,
				y: 80,
				width: 64,
				height: 64,
				// A doc written with the short name passes too.
				icon: "cosmos",
				text: "Azure Cosmos DB",
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
					{ id: "icon", type: "azureIcon", x: 0, y: 0, width: 64, height: 64 },
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
						type: "azureIcon",
						x: 0,
						y: 0,
						width: 64,
						height: 64,
						icon: "virtual-machinee",
					},
				],
			},
			diagnosticPaths: ["root[0].icon"],
		},
	],
});

describe("azureIconDocDefinition", () => {
	it("names candidates for an icon that is nearly right, under the set's name", () => {
		const diagnostics = azureIconDocDefinition.validateDoc?.(
			{
				id: "icon-1",
				type: "azureIcon",
				x: 0,
				y: 0,
				width: 64,
				height: 64,
				icon: "key-vaultz",
			},
			"objects[0]",
		);

		expect(diagnostics?.[0]?.path).toBe("objects[0].icon");
		expect(diagnostics?.[0]?.message).toBe(
			'unknown Azure icon "key-vaultz" — did you mean "key-vaults"?',
		);
		expect(diagnostics?.[0]?.beyondSchema).toBe(true);
	});

	it("creates icons without offering drag-drawing", () => {
		expect(azureIconDocDefinition.factory?.createDoc).toBeTypeOf("function");
		expect(azureIconDocDefinition.factory?.createDocFromBounds).toBeUndefined();
	});
});

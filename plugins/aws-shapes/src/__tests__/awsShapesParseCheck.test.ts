import { createParseCheckSuite } from "@jiscribe/canvas-sdk/testing";
import { describe, expect, it } from "vitest";

import {
	awsGroupDocDefinition,
	awsIconDocDefinition,
	awsShapesDocPlugin,
} from "../doc";

// Run through a parser the plugin is registered on. `icon` is a string the JSON
// schema cannot see inside, and `kind` is an enum there but still has to be
// checked at parse time, so what matters is that validation reaches the shapes'
// own fields.
createParseCheckSuite({
	name: "aws shapes",
	plugin: awsShapesDocPlugin,
	sampleDoc: {
		version: 1,
		root: [
			{
				id: "vpc",
				type: "awsGroup",
				x: 0,
				y: 0,
				width: 400,
				height: 240,
				kind: "vpc",
				text: "production",
			},
			{
				id: "lambda",
				type: "awsIcon",
				x: 40,
				y: 80,
				width: 64,
				height: 64,
				icon: "service/aws-lambda",
				text: "Lambda",
			},
			{
				id: "bucket",
				type: "awsIcon",
				x: 240,
				y: 80,
				width: 64,
				height: 64,
				// A doc written with the short name passes too — the spelling an AI or
				// a hand reaches for first.
				icon: "s3",
				text: "S3",
			},
			{
				id: "writes",
				type: "connector",
				source: { owner: { id: "lambda" }, anchor: { kind: "center" } },
				target: { owner: { id: "bucket" }, anchor: { kind: "center" } },
				points: [],
			},
		],
	},
	accepts: [
		{
			name: "accepts an icon and a frame that name neither icon nor kind",
			doc: {
				version: 1,
				root: [
					{
						id: "frame",
						type: "awsGroup",
						x: 0,
						y: 0,
						width: 320,
						height: 200,
					},
					{
						id: "icon",
						type: "awsIcon",
						x: 20,
						y: 60,
						width: 64,
						height: 64,
					},
				],
			},
		},
	],
	rejects: [
		{
			name: "rejects an icon the asset package does not have",
			doc: {
				version: 1,
				root: [
					{
						id: "icon",
						type: "awsIcon",
						x: 0,
						y: 0,
						width: 64,
						height: 64,
						icon: "service/aws-lambdaa",
					},
				],
			},
			diagnosticPaths: ["root[0].icon"],
		},
		{
			name: "rejects a frame kind outside the nineteen it draws",
			doc: {
				version: 1,
				root: [
					{
						id: "frame",
						type: "awsGroup",
						x: 0,
						y: 0,
						width: 320,
						height: 200,
						kind: "subnet",
					},
				],
			},
			diagnosticPaths: ["root[0].kind"],
		},
	],
});

describe("awsIconDocDefinition", () => {
	it("names candidates for an icon that is nearly right", () => {
		const diagnostics = awsIconDocDefinition.validateDoc?.(
			{
				id: "icon-1",
				type: "awsIcon",
				x: 0,
				y: 0,
				width: 64,
				height: 64,
				icon: "service/aws-lambdaa",
			},
			"objects[0]",
		);

		expect(diagnostics?.[0]?.path).toBe("objects[0].icon");
		expect(diagnostics?.[0]?.message).toContain("service/aws-lambda");
		expect(diagnostics?.[0]?.beyondSchema).toBe(true);
	});

	it("runs the extra check alongside the ones features imply", () => {
		const diagnostics = awsIconDocDefinition.validateDoc?.(
			{
				id: "icon-1",
				type: "awsIcon",
				y: 0,
				width: 64,
				height: 64,
				icon: 42,
			},
			"objects[0]",
		);

		expect(diagnostics?.map((diagnostic) => diagnostic.path)).toEqual([
			"objects[0].x",
			"objects[0].icon",
		]);
	});

	it("creates icons without offering drag-drawing", () => {
		expect(awsIconDocDefinition.factory?.createDoc).toBeTypeOf("function");
		expect(awsIconDocDefinition.factory?.createDocFromBounds).toBeUndefined();
	});
});

describe("awsGroupDocDefinition", () => {
	it("lists the kinds it accepts in the diagnostic", () => {
		const diagnostics = awsGroupDocDefinition.validateDoc?.(
			{
				id: "frame-1",
				type: "awsGroup",
				x: 0,
				y: 0,
				width: 320,
				height: 200,
				kind: "subnet",
			},
			"objects[0]",
		);

		expect(diagnostics?.[0]?.path).toBe("objects[0].kind");
		expect(diagnostics?.[0]?.message).toContain("public-subnet");
		// The schema enumerates the kinds, so schema-driven hosts must not show
		// this one twice.
		expect(diagnostics?.[0]?.beyondSchema).toBeUndefined();
	});

	it("does not size the frame from its title", () => {
		expect(awsGroupDocDefinition.autoHeight).toBe(false);
	});

	it("is drawn by dragging a box, unlike the icon", () => {
		expect(awsGroupDocDefinition.factory?.createDocFromBounds).toBeTypeOf(
			"function",
		);
	});
});

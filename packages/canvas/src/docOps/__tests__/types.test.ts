import { describe, expect, it } from "vitest";

import { docOps } from "./support/docFixtures";
import { cardDefinition, starDefinition } from "./support/pluginFixtures";
import type { ObjectDocDefinition } from "../../schemas/plugin/ObjectDocDefinition";
import { builtinObjectDocDefinitions } from "../../schemas/registry/builtinObjectDocDefinitions";
import { createDocOps } from "../createDocOps";

/** The built-ins plus two plugins, so the merge order can be told apart from the map order. */
const pluginOps = createDocOps({
	plugins: [
		{ id: "stars", objects: { star: starDefinition } },
		{ id: "cards", objects: { "slot-card": cardDefinition } },
	],
});

/** No definitions at all: the built-ins are dropped and no plugin fills their place. */
const emptyOps = createDocOps({ presetDefinitions: {} });

describe("listTypes", () => {
	it("describes every built-in type, in the order the definitions declare them", () => {
		expect(docOps.listTypes().map(({ type }) => type)).toEqual([
			"rect",
			"ellipse",
			"text",
			"group",
			"polygon",
			"polyline",
			"connector",
			"svg",
		]);
	});

	it("reads creatable, connectable, text and geometry off the definition", () => {
		const summaries = new Map(
			docOps.listTypes().map((summary) => [summary.type, summary]),
		);

		expect(summaries.get("rect")).toEqual({
			type: "rect",
			creatable: true,
			connectable: true,
			text: "single",
			geometry: "rect",
		});
		expect(summaries.get("text")).toEqual({
			type: "text",
			creatable: true,
			connectable: true,
			text: "single",
			geometry: "point",
		});
		expect(summaries.get("polygon")).toEqual({
			type: "polygon",
			creatable: true,
			connectable: false,
			text: null,
			geometry: "poly",
		});
	});

	it("marks the types with no factory as not creatable", () => {
		expect(
			docOps
				.listTypes()
				.filter(({ creatable }) => !creatable)
				.map(({ type }) => type),
		).toEqual(["group", "connector", "svg"]);
	});

	it("calls a group's geometry none, since it is measured from its children", () => {
		expect(docOps.listTypes().find(({ type }) => type === "group")).toEqual({
			type: "group",
			creatable: false,
			connectable: false,
			text: null,
			geometry: "none",
		});
	});

	it("puts plugin types after the built-ins, in the order the plugins were given", () => {
		expect(pluginOps.listTypes().map(({ type }) => type)).toEqual([
			...docOps.listTypes().map(({ type }) => type),
			"star",
			"slot-card",
		]);
	});

	it("reads a plugin's own features the same way as a built-in's", () => {
		const summaries = pluginOps.listTypes();

		expect(summaries.find(({ type }) => type === "star")).toEqual({
			type: "star",
			creatable: true,
			connectable: true,
			text: null,
			geometry: "rect",
		});
		expect(summaries.find(({ type }) => type === "slot-card")).toEqual({
			type: "slot-card",
			creatable: false,
			connectable: true,
			text: "slots",
			geometry: "rect",
		});
	});

	it("is empty for a table holding nothing", () => {
		expect(emptyOps.listTypes()).toEqual([]);
	});

	// The set an AI tool schema offers is derived by hand in
	// packages/canvas-agent/src/capabilities.ts (toCanvasCapabilities), whose whole hazard
	// is drifting from what these ops accept. Restated here so listTypes can replace it.
	it("yields the sets toCanvasCapabilities derives by hand", () => {
		const handDerived: Array<[string, ObjectDocDefinition]> = [
			...Object.entries(builtinObjectDocDefinitions),
			["star", starDefinition],
			["slot-card", cardDefinition],
		];
		const summaries = pluginOps.listTypes();

		expect(
			summaries.filter(({ creatable }) => creatable).map(({ type }) => type),
		).toEqual(
			handDerived
				.filter(([, definition]) => definition.factory !== undefined)
				.map(([type]) => type),
		);
		expect(
			summaries
				.filter(({ connectable }) => connectable)
				.map(({ type }) => type),
		).toEqual(
			handDerived
				.filter(([, definition]) => definition.features.connectable === true)
				.map(([type]) => type),
		);
	});
});

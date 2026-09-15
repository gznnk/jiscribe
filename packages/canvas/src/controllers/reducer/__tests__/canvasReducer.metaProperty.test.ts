import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { describe, expect, it } from "vitest";

import { createTestState } from "./support/createTestState";
import { rectDoc, twoRectsDoc } from "./support/fixtures";
import type { CanvasControllerState } from "../../CanvasTypes";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import type { MetaProperty } from "../CanvasActions";
import { createCanvasReducer } from "../canvasReducer";

const canvasReducer = createCanvasReducer(createTestRegistries());

const update = (
	state: CanvasControllerState,
	property: MetaProperty,
	value: string | null,
	options: { commit?: boolean; coalesceHistory?: boolean } = {},
): CanvasControllerState =>
	canvasReducer(state, {
		type: "META_PROPERTY_UPDATE",
		property,
		value,
		commit: options.commit ?? true,
		coalesceHistory: options.coalesceHistory,
	});

/** rect-1 selected on its own, which is what the Meta section is drawn for. */
const singleRectState = (): CanvasControllerState =>
	createTestState(twoRectsDoc, { selectedIds: ["rect-1"] });

/** A group holding rect-1, selected as a whole. */
const groupDoc: CanvasDoc = {
	version: 1,
	root: [
		{
			id: "group-1",
			type: "group",
			children: [rectDoc("rect-1", 0, 0)],
		},
	],
} as unknown as CanvasDoc;

/** One rect plus a connector hanging off it, for the connector-only selection. */
const connectorDoc: CanvasDoc = {
	version: 1,
	root: [
		rectDoc("rect-1", 0, 0),
		{
			id: "conn-1",
			type: "connector",
			points: [],
			source: { owner: { id: "rect-1" }, anchor: { kind: "center" } },
			target: { anchor: { kind: "free", point: { x: 50, y: 50 } } },
		},
	],
} as unknown as CanvasDoc;

describe("canvasReducer / META_PROPERTY_UPDATE", () => {
	it("states the name of the single selected object", () => {
		const state = update(singleRectState(), "name", "Server");

		expect(state.objects["rect-1"].meta?.name).toBe("Server");
	});

	it("states the description beside a name already there", () => {
		let state = update(singleRectState(), "name", "Server");
		state = update(state, "description", "The one behind the proxy");

		expect(state.objects["rect-1"].meta).toEqual({
			name: "Server",
			description: "The one behind the proxy",
		});
	});

	it("states the name of the selected connector", () => {
		const connectorSelected = createTestState(connectorDoc, {
			selectedConnectorId: "conn-1",
		});

		const state = update(connectorSelected, "name", "Uplink");

		expect(state.objects["conn-1"].meta?.name).toBe("Uplink");
	});

	it("writes the group's own note, not its children's", () => {
		const groupSelected = createTestState(groupDoc, {
			selectedIds: ["group-1"],
		});

		const state = update(groupSelected, "name", "Cluster");

		expect(state.objects["group-1"].meta?.name).toBe("Cluster");
		expect(state.objects["rect-1"].meta).toBeUndefined();
	});

	it("leaves a multi-selection alone: a note belongs to one object", () => {
		const before = createTestState(twoRectsDoc, {
			selectedIds: ["rect-1", "rect-2"],
		});

		expect(update(before, "name", "Server")).toBe(before);
	});

	it("leaves the state alone with nothing selected", () => {
		const before = createTestState(twoRectsDoc);

		expect(update(before, "name", "Server")).toBe(before);
	});

	it("drops the field on null, and on the empty string just the same", () => {
		for (const emptied of [null, ""] as const) {
			let state = update(singleRectState(), "name", "Server");
			state = update(state, "description", "Behind the proxy");

			state = update(state, "name", emptied);

			expect(state.objects["rect-1"].meta).toEqual({
				description: "Behind the proxy",
			});
		}
	});

	it("drops meta itself once its last field is gone", () => {
		let state = update(singleRectState(), "name", "Server");
		expect(state.objects["rect-1"].meta).toBeDefined();

		state = update(state, "name", null);

		expect(state.objects["rect-1"].meta).toBeUndefined();
	});

	it("leaves a preview of the text already stated alone", () => {
		const before = update(singleRectState(), "name", "Server");

		expect(update(before, "name", "Server", { commit: false })).toBe(before);
	});

	it("records the commit of a text the preview already applied", () => {
		const previewed = update(singleRectState(), "name", "Server", {
			commit: false,
		});
		expect(previewed.history.past).toHaveLength(0);

		const committed = update(previewed, "name", "Server");

		expect(committed.history.past).toHaveLength(1);
		expect(committed.commitVersion).toBe(previewed.commitVersion + 1);
	});

	it("previews without recording history", () => {
		const before = singleRectState();

		const state = update(before, "name", "Server", { commit: false });

		expect(state.objects["rect-1"].meta?.name).toBe("Server");
		expect(state.history.past).toHaveLength(0);
		expect(state.commitVersion).toBe(before.commitVersion);
	});

	it("records one history entry per commit", () => {
		let state = update(singleRectState(), "name", "Server");
		expect(state.history.past).toHaveLength(1);

		state = update(state, "name", "Gateway");
		expect(state.history.past).toHaveLength(2);
	});

	it("merges consecutive commits asking to coalesce into one entry", () => {
		let state = update(singleRectState(), "name", "S", {
			coalesceHistory: true,
		});
		expect(state.history.past).toHaveLength(1);

		state = update(state, "name", "Se", { coalesceHistory: true });
		state = update(state, "name", "Ser", { coalesceHistory: true });

		expect(state.history.past).toHaveLength(1);
		expect(state.objects["rect-1"].meta?.name).toBe("Ser");
	});

	it("undoes a committed name in one step", () => {
		let state = update(singleRectState(), "name", "Server");
		state = update(state, "name", "Gateway");

		state = canvasReducer(state, { type: "COMMAND", commandId: "undo" });

		expect(state.objects["rect-1"].meta?.name).toBe("Server");
	});

	it("undoes a stated name back to no note at all", () => {
		let state = update(singleRectState(), "name", "Server");

		state = canvasReducer(state, { type: "COMMAND", commandId: "undo" });

		expect(state.objects["rect-1"].meta).toBeUndefined();
	});
});

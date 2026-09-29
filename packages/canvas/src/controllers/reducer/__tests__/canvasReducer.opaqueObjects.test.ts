import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { createCanvasParser } from "@jiscribe/doc/parse";
import { describe, expect, it } from "vitest";

import { createTestState } from "./support/createTestState";
import { rectDoc } from "./support/fixtures";
import { canvasToState } from "../../../states/canvas/CanvasMapper";
import type { CanvasControllerState } from "../../CanvasTypes";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { resolveDocSnapshot } from "../../utils/resolveDocSnapshot";
import { createCanvasReducer } from "../canvasReducer";

const registries = createTestRegistries();
const canvasReducer = createCanvasReducer(registries);

/** A type no registry of this canvas carries, as a newer build would have written it. */
const hexagram = {
	id: "hexagram-1",
	type: "hexagram",
	x: 40,
	y: 40,
	spikes: 6,
};

/** rect-1, the unknown object, rect-2, and a connector from rect-1 to the unknown object. */
const docWithUnknownObject: CanvasDoc = {
	version: 1,
	root: [
		rectDoc("rect-1", 0, 0),
		hexagram,
		rectDoc("rect-2", 100, 100),
		{
			id: "connector-1",
			type: "connector",
			source: { owner: { id: "rect-1" }, anchor: { kind: "center" } },
			target: { owner: { id: "hexagram-1" }, anchor: { kind: "center" } },
		},
	],
} as unknown as CanvasDoc;

/** The document the canvas would hand the host on save. */
const savedDoc = (state: CanvasControllerState): CanvasDoc =>
	resolveDocSnapshot(state.history.present, registries.objectMapper);

const rootIdsOf = (doc: CanvasDoc): string[] =>
	doc.root.map((object) => object.id);

/** Parses as a host reloading the saved file would, failing the test when it does not. */
const expectLoadable = (doc: CanvasDoc): void => {
	expect(createCanvasParser().parse(JSON.stringify(doc)).kind).toBe("ok");
};

const command = (
	state: CanvasControllerState,
	commandId: string,
): CanvasControllerState =>
	canvasReducer(state, { type: "COMMAND", commandId });

describe("canvasReducer: objects of a type the canvas does not carry", () => {
	it("are out of reach of select-all, and survive deleting everything else", () => {
		const selected = command(
			createTestState(docWithUnknownObject),
			"selectAll",
		);
		expect([...selected.selectedIds].sort()).toEqual(["rect-1", "rect-2"]);

		const after = command(selected, "delete");

		// The connector went with rect-1, the way a connector goes with its shape.
		expect(rootIdsOf(savedDoc(after))).toEqual(["hexagram-1"]);
		expect(savedDoc(after).root[0]).toEqual(hexagram);
		expectLoadable(savedDoc(after));
	});

	it("survive grouping what is around them, and undo brings the document back as it was", () => {
		const grouped = command(
			createTestState(docWithUnknownObject, {
				selectedIds: ["rect-1", "rect-2"],
			}),
			"group",
		);

		const groupedDoc = savedDoc(grouped);
		expect(rootIdsOf(groupedDoc)).toContain("hexagram-1");
		expect(rootIdsOf(groupedDoc)).toContain("connector-1");
		expectLoadable(groupedDoc);

		const undone = command(grouped, "undo");
		expect(JSON.stringify(savedDoc(undone))).toBe(
			JSON.stringify(docWithUnknownObject),
		);
	});

	it("come in with a document synced from outside and go out with the next commit", () => {
		const synced = canvasReducer(createTestState(docWithUnknownObject), {
			type: "SYNC_EXTERNAL",
			payload: canvasToState(
				docWithUnknownObject,
				registries.objectMapper,
				registries.objectContentResizer,
			),
		});
		expect(rootIdsOf(savedDoc(synced))).toEqual(
			rootIdsOf(docWithUnknownObject),
		);

		const after = command(
			canvasReducer(synced, { type: "SET_SELECTION", ids: ["rect-2"] }),
			"delete",
		);
		expect(rootIdsOf(savedDoc(after))).toEqual([
			"rect-1",
			"hexagram-1",
			"connector-1",
		]);
		expectLoadable(savedDoc(after));
	});
});

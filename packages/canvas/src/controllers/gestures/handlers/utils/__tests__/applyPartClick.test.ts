import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import { vertexPartSelection } from "../../../../selection/__tests__/support/vertexPartSelection";
import { createTextSlotPartKindDefinition } from "../../../../selection/createTextSlotPartKindDefinition";
import { createVertexPartKindDefinition } from "../../../../selection/createVertexPartKindDefinition";
import { createObjectPartKindRegistry } from "../../../../selection/ObjectPartKindRegistry";
import type { ObjectPartSelection } from "../../../../selection/ObjectPartSelection";
import { TEXT_SLOT_PART_KIND } from "../../../../selection/textSlotPartKind";
import { applyPartClick } from "../applyPartClick";
import { textSlotPart, vertexPart } from "../partAddress";

/** A record-like shape: multiple text slots, declared via features.text = "slots". */
const slotShape = (id: string): ObjectState =>
	({
		id,
		type: "record",
		features: { text: "slots" },
		text: { name: { text: "User" }, rows: { text: ["id: string"] } },
	}) as unknown as ObjectState;

/** A polyline carrying two vertices, the parts of its `vertex` kind. */
const poly = (id: string): ObjectState =>
	({
		id,
		type: "polyline",
		points: [
			{ x: 0, y: 0 },
			{ x: 10, y: 0 },
		],
	}) as unknown as ObjectState;

/** A rect: a type that registers no part kind at all. */
const rect = (id: string): ObjectState =>
	({ id, type: "rect" }) as unknown as ObjectState;

/** The registry every case here is checked against, as applyObjectDefinition builds it. */
const objectPartKind = createObjectPartKindRegistry();
objectPartKind.register("record", [createTextSlotPartKindDefinition()]);
objectPartKind.register("polyline", [createVertexPartKindDefinition(2)]);

const makeState = (
	objectPartSelection: ObjectPartSelection | null,
	objectMenuOpenId: string | null = null,
): CanvasControllerState =>
	({
		objects: {
			"rec-1": slotShape("rec-1"),
			"poly-1": poly("poly-1"),
			"rect-1": rect("rect-1"),
		},
		objectPartSelection,
		objectMenuOpenId,
		stencilLibraryOpenCategory: "basic",
	}) as unknown as CanvasControllerState;

const textSlotSelection = (
	objectId: string,
	slotId: string,
): ObjectPartSelection => ({
	objectId,
	kind: TEXT_SLOT_PART_KIND,
	ranges: [{ anchorId: slotId, focusId: slotId }],
});

describe("applyPartClick", () => {
	it("picks the part the address names, as one collapsed range", () => {
		const state = makeState(null);

		const next = applyPartClick(
			state,
			state.objects["rec-1"],
			textSlotPart("rows"),
			objectPartKind,
		);

		expect(next.objectPartSelection).toEqual(
			textSlotSelection("rec-1", "rows"),
		);
	});

	it("reads a vertex handle's address through the same path", () => {
		const state = makeState(null);

		const next = applyPartClick(
			state,
			state.objects["poly-1"],
			vertexPart(1),
			objectPartKind,
		);

		expect(next.objectPartSelection).toEqual(vertexPartSelection("poly-1", 1));
	});

	it("replaces whatever was picked, including a part of another kind", () => {
		const state = makeState(vertexPartSelection("poly-1", 1));

		const next = applyPartClick(
			state,
			state.objects["rec-1"],
			textSlotPart("name"),
			objectPartKind,
		);

		expect(next.objectPartSelection).toEqual(
			textSlotSelection("rec-1", "name"),
		);
	});

	it("closes the open submenu and the stencil flyout on the part that is picked", () => {
		const state = makeState(null, "alignment");

		const next = applyPartClick(
			state,
			state.objects["rec-1"],
			textSlotPart("rows"),
			objectPartKind,
		);

		expect(next.objectMenuOpenId).toBeNull();
		expect(next.stencilLibraryOpenCategory).toBeNull();
	});

	it("clears the pick when the id names no part the object still has", () => {
		const state = makeState(textSlotSelection("rec-1", "rows"), "alignment");

		const next = applyPartClick(
			state,
			state.objects["rec-1"],
			textSlotPart("gone"),
			objectPartKind,
		);

		expect(next.objectPartSelection).toBeNull();
		expect(next.objectMenuOpenId).toBeNull();
	});

	it("clears the pick when the object's type declares no such kind", () => {
		const state = makeState(textSlotSelection("rec-1", "rows"));

		expect(
			applyPartClick(
				state,
				state.objects["rec-1"],
				vertexPart(0),
				objectPartKind,
			).objectPartSelection,
		).toBeNull();
		expect(
			applyPartClick(
				state,
				state.objects["rect-1"],
				textSlotPart("body"),
				objectPartKind,
			).objectPartSelection,
		).toBeNull();
	});

	it("clears the pick on a click beside the parts, which steps up to the object", () => {
		const state = makeState(textSlotSelection("rec-1", "rows"));

		expect(
			applyPartClick(state, state.objects["rec-1"], undefined, objectPartKind)
				.objectPartSelection,
		).toBeNull();
		// A bare slot id, the way the plugins spelled it before the address.
		expect(
			applyPartClick(state, state.objects["rec-1"], "rows", objectPartKind)
				.objectPartSelection,
		).toBeNull();
	});

	it("hands back the state itself when the picked part is clicked again", () => {
		const state = makeState(textSlotSelection("rec-1", "rows"), "alignment");

		expect(
			applyPartClick(
				state,
				state.objects["rec-1"],
				textSlotPart("rows"),
				objectPartKind,
			),
		).toBe(state);
	});

	it("hands back the state itself when there was nothing to clear", () => {
		const state = makeState(null, "alignment");

		expect(
			applyPartClick(state, state.objects["rec-1"], undefined, objectPartKind),
		).toBe(state);
	});
});

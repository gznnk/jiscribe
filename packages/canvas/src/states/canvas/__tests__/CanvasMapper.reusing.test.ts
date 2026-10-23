import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import type { TextMeasurement } from "@jiscribe/doc/text/measure/TextMeasurement";
import {
	advanceTextMeasurementGeneration,
	offerTextMeasurement,
	resetTextMeasurementForTests,
} from "@jiscribe/doc/text/measure/textMeasurementSlot";
import { beforeEach, describe, expect, it } from "vitest";

import type { CanvasControllerState } from "../../../controllers/CanvasTypes";
import { createInitialControllerState } from "../../../controllers/reducer/createInitialControllerState";
import { createTestRegistries } from "../../../controllers/registries/createCanvasRegistries";
import { resolveDocSnapshot } from "../../../controllers/utils/resolveDocSnapshot";
import type { ObjectState } from "../../objects/base/ObjectState";
import type { GroupState } from "../../objects/primitives/group/GroupState";
import { canvasToStateReusing } from "../CanvasMapper";

const registries = createTestRegistries();
const { objectMapper, objectContentResizer } = registries;

/** Width per character per px of font size; raised by {@link loadWiderFace}. */
let characterWidthRatio = 0.5;

const switchingMeasurement: TextMeasurement = {
	source: "renderer",
	createMeasurer: (font) => (text) =>
		text.length * font.fontSize * characterWidthRatio,
};

resetTextMeasurementForTests();
offerTextMeasurement(switchingMeasurement);

/** What the browser host does when a face finishes loading (Canvas, useDocFonts). */
const loadWiderFace = (): void => {
	characterWidthRatio = 0.9;
	advanceTextMeasurementGeneration();
};

beforeEach(() => {
	characterWidthRatio = 0.5;
});

const rect = (id: string, x: number, extra: Record<string, unknown> = {}) => ({
	id,
	type: "rect",
	x,
	y: 0,
	width: 10,
	height: 10,
	...extra,
});

const createDoc = (
	overrides: {
		rect1?: Record<string, unknown>;
		groupChild?: Record<string, unknown>;
		rootOrder?: string[];
	} = {},
): CanvasDoc => {
	const root = [
		overrides.rect1 ?? rect("rect-1", 0),
		rect("rect-2", 100),
		{ id: "text-1", type: "text", x: 300, y: 0, text: "Hello" },
		{
			id: "group-1",
			type: "group",
			children: [
				overrides.groupChild ?? rect("child-1", 200),
				rect("child-2", 250),
				{
					id: "group-2",
					type: "group",
					children: [rect("nested-1", 400), rect("nested-2", 450)],
				},
			],
		},
	];
	return {
		version: 1,
		root: overrides.rootOrder
			? overrides.rootOrder.map((id) => root.find((node) => node.id === id))
			: root,
	} as unknown as CanvasDoc;
};

/** Builds `doc` reusing what `state` holds, as useSyncExternalDoc does. */
const buildReusing = (state: CanvasControllerState, doc: CanvasDoc) =>
	canvasToStateReusing(doc, objectMapper, objectContentResizer, {
		referenceDoc: resolveDocSnapshot(state.history.present, objectMapper),
		committedObjects: state.history.present.source.objects,
		liveObjects: state.objects,
		remeasure: false,
	});

const openOn = (doc: CanvasDoc): CanvasControllerState =>
	createInitialControllerState(doc, registries);

describe("canvasToStateReusing", () => {
	it("keeps every object the edit leaves alone and rebuilds the edited one", () => {
		const opened = openOn(createDoc());

		const { state, isSameAsReference } = buildReusing(
			opened,
			createDoc({ rect1: rect("rect-1", 50) }),
		);

		expect(isSameAsReference).toBe(false);
		expect(state.objects["rect-1"]).not.toBe(opened.objects["rect-1"]);
		for (const id of ["rect-2", "text-1", "group-1", "child-1", "nested-1"]) {
			expect(state.objects[id]).toBe(opened.objects[id]);
		}
	});

	it("rebuilds a group whose member changed, keeping its other members and nested groups", () => {
		const opened = openOn(createDoc());

		const { state } = buildReusing(
			opened,
			createDoc({ groupChild: rect("child-1", 220) }),
		);

		expect(state.objects["group-1"]).not.toBe(opened.objects["group-1"]);
		expect(state.objects["child-1"]).not.toBe(opened.objects["child-1"]);
		for (const id of ["child-2", "group-2", "nested-1", "nested-2"]) {
			expect(state.objects[id]).toBe(opened.objects[id]);
		}
		expect((state.objects["group-1"] as GroupState).childIds).toEqual([
			"child-1",
			"child-2",
			"group-2",
		]);
		expect(state.objects["child-1"].parentId).toBe("group-1");
	});

	it("keeps every object of a reordered root and reports the reorder", () => {
		const opened = openOn(createDoc());

		const { state, isSameAsReference } = buildReusing(
			opened,
			createDoc({ rootOrder: ["rect-2", "rect-1", "text-1", "group-1"] }),
		);

		expect(isSameAsReference).toBe(false);
		expect(state.rootIds).toEqual(["rect-2", "rect-1", "text-1", "group-1"]);
		Object.keys(opened.objects).forEach((id) => {
			expect(state.objects[id]).toBe(opened.objects[id]);
		});
	});

	it("reads a document differing only in key order as the same", () => {
		const opened = openOn(createDoc());
		const reordered = createDoc({
			rect1: { height: 10, width: 10, y: 0, x: 0, type: "rect", id: "rect-1" },
		});

		const { state, isSameAsReference } = buildReusing(opened, reordered);

		expect(isSameAsReference).toBe(true);
		Object.keys(opened.objects).forEach((id) => {
			expect(state.objects[id]).toBe(opened.objects[id]);
		});
	});

	it("rebuilds an object whose live state moved on from the committed one", () => {
		const opened = openOn(createDoc());
		const dragged: CanvasControllerState = {
			...opened,
			objects: {
				...opened.objects,
				"rect-2": { ...opened.objects["rect-2"], cx: 999 } as ObjectState,
			},
		};

		const { state } = buildReusing(dragged, createDoc());

		expect(state.objects["rect-2"]).not.toBe(dragged.objects["rect-2"]);
		expect(state.objects["rect-2"]).toEqual(opened.objects["rect-2"]);
		expect(state.objects["rect-1"]).toBe(opened.objects["rect-1"]);
	});

	it("re-measures the objects it keeps when the measurement generation moved on", () => {
		const opened = openOn(createDoc());
		loadWiderFace();

		const { state } = canvasToStateReusing(
			createDoc({ rect1: rect("rect-1", 50) }),
			objectMapper,
			objectContentResizer,
			{
				referenceDoc: resolveDocSnapshot(opened.history.present, objectMapper),
				committedObjects: opened.history.present.source.objects,
				liveObjects: opened.objects,
				remeasure: true,
			},
		);

		const widthOf = (objState: ObjectState): number =>
			(objState as ObjectState & { width: number }).width;
		expect(widthOf(state.objects["text-1"])).toBeGreaterThan(
			widthOf(opened.objects["text-1"]),
		);
		// A resizer hands back the very object whose box did not move
		expect(state.objects["rect-2"]).toBe(opened.objects["rect-2"]);
	});
});

import { bench, describe } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { createTextSlotPartKindDefinition } from "../../selection/partKinds/textSlotPartKind";
import { resolveLabelBackdrops } from "../resolveLabelBackdrops";

// --- test data builders ---

const registries = createTestRegistries();
registries.objectLabelBackdrop.register("frame", (state, style) => {
	const { width, height } = state as ObjectState & {
		width: number;
		height: number;
	};
	return [
		{
			rect: { x: -width / 2, y: -height / 2, width, height },
			fill: style.fillColor,
			fillOpacity: style.fillAlpha,
		},
	];
});
registries.objectPartKind.register("captioned", [
	createTextSlotPartKindDefinition({
		region: () => ({ x: -30, y: 25, width: 60, height: 20 }),
	}),
]);

const FRAME_SIZE = 300;
const FRAME_COLUMNS = 8;

/**
 * `frameCount` filled frames on a grid, then `labelCount` captioned shapes and
 * `connectorCount` labelled connectors spread over them, every frame drawn
 * before every label: the worst case, each label tested against every frame.
 */
function buildDiagram(
	frameCount: number,
	labelCount: number,
	connectorCount: number,
	plainCount = 0,
): { objects: Record<string, ObjectState>; rootIds: string[] } {
	const objects: Record<string, ObjectState> = {};
	const rootIds: string[] = [];
	const frameRows = Math.ceil(frameCount / FRAME_COLUMNS);
	for (let i = 0; i < frameCount; i++) {
		const id = `frame${i}`;
		objects[id] = {
			id,
			type: "frame",
			cx: (i % FRAME_COLUMNS) * FRAME_SIZE + FRAME_SIZE / 2,
			cy: Math.floor(i / FRAME_COLUMNS) * FRAME_SIZE + FRAME_SIZE / 2,
			width: FRAME_SIZE,
			height: FRAME_SIZE,
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
			fill: "#e9f3e6",
			fillOpacity: 1,
		} as unknown as ObjectState;
		rootIds.push(id);
	}
	const spanX = FRAME_COLUMNS * FRAME_SIZE;
	const spanY = frameRows * FRAME_SIZE;
	for (let i = 0; i < labelCount; i++) {
		const id = `shape${i}`;
		objects[id] = {
			id,
			type: "captioned",
			features: { type: "captioned", geometry: "rect", text: "label" },
			cx: (i * 37) % spanX,
			cy: (i * 53) % spanY,
			width: 40,
			height: 40,
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
			text: { body: { text: `Service ${i}` } },
		} as unknown as ObjectState;
		rootIds.push(id);
	}
	// Shapes holding no label and painting no backdrop, which the walk only passes.
	for (let i = 0; i < plainCount; i++) {
		const id = `plain${i}`;
		objects[id] = {
			id,
			type: "rect",
			cx: (i * 29) % spanX,
			cy: (i * 31) % spanY,
			width: 60,
			height: 40,
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
		} as unknown as ObjectState;
		rootIds.push(id);
	}
	for (let i = 0; i < connectorCount; i++) {
		const id = `connector${i}`;
		const y = (i * 41) % spanY;
		objects[id] = {
			id,
			type: "connector",
			points: [],
			routing: "straight",
			source: { anchor: { kind: "free", point: { x: 0, y } } },
			target: { anchor: { kind: "free", point: { x: spanX, y } } },
			label: { text: "HTTPS" },
		} as unknown as ObjectState;
		rootIds.push(id);
	}
	return { objects, rootIds };
}

// --- benchmarks ---

describe("resolveLabelBackdrops", () => {
	const small = buildDiagram(10, 100, 20);
	bench("10 frames, 100 captions, 20 connector labels", () => {
		resolveLabelBackdrops(small.objects, small.rootIds, registries);
	});

	const large = buildDiagram(40, 400, 100);
	bench("40 frames, 400 captions, 100 connector labels", () => {
		resolveLabelBackdrops(large.objects, large.rootIds, registries);
	});
});

describe("resolveLabelBackdrops, about 5000 objects", () => {
	// 100 frames, 2000 "auto" captions, 500 connector labels, 2400 plain shapes.
	const huge = buildDiagram(100, 2000, 500, 2400);
	const ids = Object.keys(huge.objects);

	/** Fresh copies of every object: nothing a previous pass cached applies to them. */
	const copyObjects = (): Record<string, ObjectState> => {
		const copies: Record<string, ObjectState> = {};
		for (const id of ids) {
			copies[id] = { ...huge.objects[id] };
		}
		return copies;
	};

	bench("copying the objects alone (the cold pass's overhead)", () => {
		copyObjects();
	});

	bench("cold pass: nothing cached", () => {
		resolveLabelBackdrops(copyObjects(), huge.rootIds, registries);
	});

	// One caption moved by a pixel since the last pass, back and forth: a
	// keystroke's or a nudge's pass.
	const editedId = "shape1000";
	const editedStates = [
		huge.objects[editedId],
		{
			...huge.objects[editedId],
			cx: (huge.objects[editedId] as ObjectState & { cx: number }).cx + 1,
		} as ObjectState,
	];
	let editedIndex = 0;
	resolveLabelBackdrops(huge.objects, huge.rootIds, registries);
	bench("warm pass: one object changed since the last", () => {
		editedIndex = 1 - editedIndex;
		resolveLabelBackdrops(
			{ ...huge.objects, [editedId]: editedStates[editedIndex] },
			huge.rootIds,
			registries,
		);
	});
});

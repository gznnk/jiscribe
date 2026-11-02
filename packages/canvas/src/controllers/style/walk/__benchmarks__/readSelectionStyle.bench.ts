import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { bench, describe } from "vitest";

import type { CanvasControllerState } from "../../../CanvasTypes";
import { createInitialControllerState } from "../../../reducer/createInitialControllerState";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { selectionOf } from "../../../selection/__tests__/support/selectionOf";
import { createSelectionStyleReader } from "../readSelectionStyle";
import type { SelectionStyleRead } from "../readSelectionStyle";

// The core kinds the ObjectMenu and the properties sidebar rows read, once each:
// roughly one surface's worth of rows for a mixed selection.
const KINDS = [
	"fill",
	"fillOpacity",
	"stroke",
	"strokeOpacity",
	"strokeWidth",
	"strokeDashType",
	"cornerRadius",
	"startArrow",
	"endArrow",
	"fontSize",
	"fontFamily",
	"fontColor",
	"fontWeight",
	"fontStyle",
	"textDecoration",
	"textAlign",
	"verticalAlign",
	"textVerticalBasis",
] as const;

const registries = createTestRegistries();

const childDoc = (index: number): unknown => {
	const x = (index % 50) * 120;
	const y = Math.floor(index / 50) * 80;
	switch (index % 3) {
		case 0:
			return { id: `c-${index}`, type: "rect", x, y, width: 100, height: 60 };
		case 1:
			return {
				id: `c-${index}`,
				type: "ellipse",
				x,
				y,
				width: 100,
				height: 60,
			};
		default:
			return {
				id: `c-${index}`,
				type: "text",
				x,
				y,
				width: 100,
				text: "label",
			};
	}
};

/** One group of `childCount` mixed shapes, selected as a whole. */
const groupSelectedState = (childCount: number): CanvasControllerState => {
	const doc = {
		version: 1,
		root: [
			{
				id: "g",
				type: "group",
				children: Array.from({ length: childCount }, (_, index) =>
					childDoc(index),
				),
			},
		],
	} as unknown as CanvasDoc;
	return {
		...createInitialControllerState(doc, registries),
		selection: selectionOf(["g"]),
	};
};

const readAllWithReader = (read: SelectionStyleRead): void => {
	for (const kind of KINDS) {
		read(kind);
	}
};

const GROUP_SIZES = [1, 100, 1000];
const groupStates = GROUP_SIZES.map((childCount) => ({
	childCount,
	state: groupSelectedState(childCount),
}));

// A pan frame leaves objects, selection and the text edit alone, so
// useSelectionStyleReader keeps the reader it built.
describe("createSelectionStyleReader: pan frame, reader kept", () => {
	for (const { childCount, state } of groupStates) {
		const keptReader = createSelectionStyleReader(state, registries);
		bench(`${KINDS.length} kinds, group of ${childCount}`, () => {
			readAllWithReader(keptReader);
		});
	}
});

// A drag frame rewrites objects, so a new reader walks the selection once.
describe("createSelectionStyleReader: drag frame, new reader", () => {
	for (const { childCount, state } of groupStates) {
		bench(`${KINDS.length} kinds, group of ${childCount}`, () => {
			readAllWithReader(createSelectionStyleReader(state, registries));
		});
	}
});

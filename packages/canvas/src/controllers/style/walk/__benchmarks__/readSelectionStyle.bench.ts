import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { bench, describe } from "vitest";

import type { CanvasControllerState } from "../../../CanvasTypes";
import { createInitialControllerState } from "../../../reducer/createInitialControllerState";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { selectionOf } from "../../../selection/__tests__/support/selectionOf";
import {
	createSelectionStyleReader,
	readSelectionStyle,
} from "../readSelectionStyle";
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

const readAllBefore = (state: CanvasControllerState): void => {
	for (const kind of KINDS) {
		readSelectionStyle(state, kind, registries);
	}
};

const readAllWithReader = (read: SelectionStyleRead): void => {
	for (const kind of KINDS) {
		read(kind);
	}
};

for (const childCount of [1, 100, 1000]) {
	const state = groupSelectedState(childCount);
	// What useSelectionStyleReader keeps while objects, selection and the text
	// edit hold still.
	const keptReader = createSelectionStyleReader(state, registries);

	describe(`pan frame: objects and selection unchanged (group of ${childCount})`, () => {
		bench("before: every kind walks the selection", () => {
			readAllBefore(state);
		});
		bench("after: the reader is kept", () => {
			readAllWithReader(keptReader);
		});
	});

	describe(`drag frame: objects rewritten (group of ${childCount})`, () => {
		bench("before: every kind walks the selection", () => {
			readAllBefore(state);
		});
		bench("after: a new reader walks once", () => {
			readAllWithReader(createSelectionStyleReader(state, registries));
		});
	});
}

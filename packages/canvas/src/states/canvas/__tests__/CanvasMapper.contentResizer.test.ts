import { describe, expect, it } from "vitest";

import type { CanvasDoc } from "../../../schemas/canvas/CanvasDoc";
import {
	rectToDoc,
	rectToState,
} from "../../objects/primitives/rect/RectMapper";
import { createObjectContentResizerRegistry } from "../../registry/ObjectContentResizerRegistry";
import { createObjectMapperRegistry } from "../../registry/ObjectMapperRegistry";
import { canvasToState } from "../CanvasMapper";

const buildMapperRegistry = () => {
	const mapper = createObjectMapperRegistry();
	mapper.register(
		"rect",
		{ toState: rectToState, toDoc: rectToDoc },
		{ type: "rect", geometry: "rect", transform: true },
	);
	return mapper;
};

const rectDoc: CanvasDoc = {
	version: 1,
	root: [{ id: "rect-1", type: "rect", x: 0, y: 0, width: 10, height: 10 }],
} as unknown as CanvasDoc;

describe("canvasToState: content resizers", () => {
	it("leaves a type with no registered resizer on the box its doc stored", () => {
		const state = canvasToState(
			rectDoc,
			buildMapperRegistry(),
			createObjectContentResizerRegistry(),
		);

		const rect = state.objects["rect-1"] as unknown as {
			width: number;
			height: number;
		};
		expect(rect.width).toBe(10);
		expect(rect.height).toBe(10);
	});

	it("re-derives a registered type's box from its freshly mapped state", () => {
		const contentResizer = createObjectContentResizerRegistry();
		const seenWidths: number[] = [];
		contentResizer.register("rect", (state) => {
			seenWidths.push((state as unknown as { width: number }).width);
			return { ...state, width: 99 } as typeof state;
		});

		const state = canvasToState(rectDoc, buildMapperRegistry(), contentResizer);

		// The doc's own box reaches the resizer, and what it returns is what the
		// state keeps.
		expect(seenWidths).toEqual([10]);
		expect(
			(state.objects["rect-1"] as unknown as { width: number }).width,
		).toBe(99);
	});
});

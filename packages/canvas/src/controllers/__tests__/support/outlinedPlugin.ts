import type { Dimensions, Point } from "@jiscribe/geometry";

import type { CanvasPlugin } from "../../../plugin/CanvasPlugin";
import { defineObject } from "../../../plugin/ObjectTypeDefinition";
import { createFrameObjectFactory } from "../../../schemas/objects/utils/createFrameObjectFactory";

/**
 * Outline of the `outlined` type: the bounding box with its bottom quarter cut
 * away, so a ray leaving the center downwards meets the silhouette a quarter of
 * the height above the box edge. That gap is the whole point — it is what tells
 * an outline-resolved connector endpoint apart from the bounding-box fallback.
 */
const outlinedOutline = ({ width, height }: Dimensions): Point[] => {
	const halfWidth = width / 2;
	const bodyBottom = height / 2 - height * 0.25;
	return [
		{ x: -halfWidth, y: -height / 2 },
		{ x: halfWidth, y: -height / 2 },
		{ x: halfWidth, y: bodyBottom },
		{ x: -halfWidth, y: bodyBottom },
	];
};

/**
 * A shape whose drawn silhouette is smaller than its bounding box, i.e. one that
 * registers an `outline`. No built-in has one any more — the callout, the last,
 * moved to `@jiscribe/plugin-annotation-shapes` — so tests covering connector
 * attachment to an outline supply it themselves. Attachment keys off the
 * registered calculator, not off any particular type, so a stand-in is faithful.
 *
 * Wire it with `createCanvasRegistries({ plugins: [outlinedPlugin] })`; the type
 * is named `outlined`.
 */
export const outlinedPlugin: CanvasPlugin = {
	id: "outlined-plugin",
	objects: {
		outlined: defineObject({
			features: { type: "outlined", geometry: "rect", connectable: true },
			validateDoc: () => [],
			factory: createFrameObjectFactory({
				type: "outlined",
				x: 0,
				y: 0,
				width: 200,
				height: 100,
			}),
			mapper: {
				toDoc: (state) => ({ id: state.id, type: "outlined" }),
				toState: (doc) => ({ id: doc.id, type: "outlined" }),
			},
			stateValidator: () => true,
			component: () => null,
			outline: outlinedOutline,
			behavior: {
				moveByDelta: (state) => state,
				transformByGroup: (state) => state,
				rotateByGroup: (state) => state,
			},
			menu: [],
		}),
	},
};

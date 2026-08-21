import { createFrameObjectFactory } from "@jiscribe/doc/model/objects/utils/createFrameObjectFactory";

import type { CanvasPlugin } from "../../../plugin/CanvasPlugin";
import { defineObject } from "../../../plugin/ObjectTypeDefinition";

/**
 * A shape placed by a single click instead of drag-drawn, i.e. one whose factory
 * has no `createDocFromBounds`. No built-in has that shape any more — sticky, the
 * last one, moved to `@jiscribe/plugin-sticky-shape` — so tests covering the
 * click-placement branch of the StencilLibrary supply it themselves. The branch
 * keys off the factory, not off any particular type, so a stand-in is faithful.
 *
 * Wire it with `createCanvasRegistries({ plugins: [clickPlacedPlugin] })`; the
 * type and its stencil are both named `pin`.
 */
export const clickPlacedPlugin: CanvasPlugin = {
	id: "click-placed-plugin",
	objects: {
		pin: defineObject({
			features: { type: "pin", geometry: "rect" },
			validateDoc: () => [],
			factory: createFrameObjectFactory(
				{ type: "pin", x: 0, y: 0, width: 40, height: 40 },
				{ supportsBounds: false },
			),
			mapper: {
				toDoc: (state) => ({ id: state.id, type: "pin" }),
				toState: (doc) => ({ id: doc.id, type: "pin" }),
			},
			stateValidator: () => true,
			component: () => null,
			behavior: {
				moveByDelta: (state) => state,
				transformByGroup: (state) => state,
				rotateByGroup: (state) => state,
			},
			menu: [],
			stencils: [
				{ id: "pin", objectType: "pin", label: "Pin", icon: () => null },
			],
		}),
	},
};

import { createFrameObjectFactory } from "../../../schemas/objects/utils/createFrameObjectFactory";
import type { ObjectDocDefinition } from "../../../schemas/plugin/ObjectDocDefinition";

/**
 * The dependency direction stops a canvas test from importing a real plugin, so build a
 * fake connectable shape "star" with createFrameObjectFactory.
 */
export const starDefinition: ObjectDocDefinition = {
	features: {
		type: "star",
		geometry: "rect",
		transform: true,
		connectable: true,
	},
	validateDoc: () => [],
	factory: createFrameObjectFactory({
		type: "star",
		width: 120,
		height: 80,
		fill: "transparent",
		stroke: "auto",
		strokeWidth: 2,
	}),
};

/**
 * The dependency direction stops a canvas test from importing the uml plugin, so
 * stand in a minimal `text: "slots"` definition with the same doc shape.
 */
export const cardDefinition: ObjectDocDefinition = {
	features: {
		type: "slot-card",
		geometry: "rect",
		text: "slots",
		connectable: true,
	},
	validateDoc: () => [],
};

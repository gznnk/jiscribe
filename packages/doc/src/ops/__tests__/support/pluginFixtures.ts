import { createFrameObjectFactory } from "../../../model/objects/utils/createFrameObjectFactory";
import type { ObjectDocDefinition } from "../../../plugin/ObjectDocDefinition";

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

/** Values the badge fixture accepts, so an unknown one has something to be measured against. */
export const BADGE_KINDS = ["new", "beta"] as const;

/**
 * A shape carrying a property of its own, which is what `extraProps` exists to reach. It
 * declares `badge` twice over — `extraKeys` says the name exists, the validator says
 * what it may hold — which is the pair a creation call is checked against.
 */
export const badgeDefinition: ObjectDocDefinition = {
	features: {
		type: "badged",
		geometry: "rect",
		transform: true,
		connectable: true,
	},
	extraKeys: ["badge"],
	validateDoc: (o, path) => {
		if (!("badge" in o) || o.badge === undefined) {
			return [];
		}
		if (
			typeof o.badge !== "string" ||
			!(BADGE_KINDS as readonly string[]).includes(o.badge)
		) {
			return [
				{
					path: `${path}.badge`,
					message: `must be one of ${BADGE_KINDS.join(" | ")}`,
					beyondSchema: true,
				},
			];
		}
		return [];
	},
	factory: createFrameObjectFactory({
		type: "badged",
		width: 100,
		height: 60,
		fill: "transparent",
		stroke: "auto",
		strokeWidth: 2,
	}),
};

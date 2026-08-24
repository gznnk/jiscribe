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

/**
 * A body-text shape whose declared region gives up a quarter of the height at
 * the top and nothing at the bottom, the way a cylinder's cap does. Off-centre
 * on purpose: it is the one shape of region on which the two vertical bases
 * derive different heights.
 */
export const cappedDefinition: ObjectDocDefinition = {
	features: {
		type: "capped",
		geometry: "rect",
		text: "body",
		transform: true,
		connectable: true,
	},
	validateDoc: () => [],
	textRegion: ({ width, height }) => ({
		x: -width / 2,
		y: -height / 2 + height * 0.25,
		width,
		height: height * 0.75,
	}),
	factory: createFrameObjectFactory({
		type: "capped",
		width: 200,
		height: 100,
		fill: "transparent",
		stroke: "auto",
		strokeWidth: 2,
	}),
};

/**
 * A body-text shape whose label hangs below its outline, the way a pictogram's
 * does: its declared region lies outside the box, so a body placement
 * (`textVerticalBasis`) has nothing to move on it.
 */
export const belowLabelDefinition: ObjectDocDefinition = {
	features: {
		type: "below-label",
		geometry: "rect",
		text: "body",
		transform: true,
		connectable: true,
	},
	validateDoc: () => [],
	textRegion: ({ width, height }) => ({
		x: -width / 2,
		y: height / 2,
		width,
		height: 20,
	}),
	factory: createFrameObjectFactory({
		type: "below-label",
		width: 80,
		height: 80,
		fill: "transparent",
		stroke: "auto",
		strokeWidth: 2,
	}),
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

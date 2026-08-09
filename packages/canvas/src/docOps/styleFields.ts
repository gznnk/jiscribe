import type { ObjectRecord } from "./objectAccess";
import { isConnectorObject } from "./objectGeometry";
import {
	FILL_STYLE_KEYS,
	type FillStyleDoc,
} from "../schemas/objects/base/FillStyleDoc";
import {
	RADIUS_STYLE_KEYS,
	type RadiusStyleDoc,
} from "../schemas/objects/base/RadiusStyleDoc";
import {
	STROKE_STYLE_KEYS,
	type StrokeStyleDoc,
} from "../schemas/objects/base/StrokeStyleDoc";
import {
	TEXT_SLOT_STYLE_KEYS,
	type TextSlot,
} from "../schemas/objects/types/TextSlot";
import type { ObjectDocDefinition } from "../schemas/plugin/ObjectDocDefinition";

/**
 * Every styling property the doc-ops can set, gathered from the same style groups the
 * per-type docs mix in. Which of them an object actually accepts follows its
 * `features` — `fill` needs `features.fill`, the typography needs `features.text`, and
 * so on — and the rest are reported back as ignored rather than written blindly.
 */
export type StyleParams = FillStyleDoc &
	StrokeStyleDoc &
	RadiusStyleDoc &
	Omit<TextSlot, "text">;

/** Label styling a connector accepts, in the order ConnectorExtraStyleProperties declares it. */
const CONNECTOR_LABEL_KEYS = [
	"fill",
	"fontColor",
	"fontSize",
	"fontWeight",
] as const satisfies readonly (keyof StyleParams)[];

const ALL_STYLE_KEYS = [
	...FILL_STYLE_KEYS,
	...STROKE_STYLE_KEYS,
	...RADIUS_STYLE_KEYS,
	...TEXT_SLOT_STYLE_KEYS,
] as const satisfies readonly (keyof StyleParams)[];

/** The property names `style` actually asks for, in declaration order. */
export const requestedStyleKeys = (style: StyleParams): string[] =>
	ALL_STYLE_KEYS.filter((key) => style[key] !== undefined);

/** Copy the requested subset of `keys` onto `target`, returning the keys written. */
const applyKeys = (
	target: Record<string, unknown>,
	style: StyleParams,
	keys: readonly (keyof StyleParams)[],
): string[] =>
	keys.flatMap((key) => {
		const value = style[key];
		if (value === undefined) {
			return [];
		}
		target[key] = value;
		return [key];
	});

/** The slot objects of a `text: "slots"` doc, whose typography lives per slot. */
const readTextSlots = (object: ObjectRecord): Record<string, unknown>[] => {
	const slots = object.text;
	if (typeof slots !== "object" || slots === null) {
		return [];
	}
	return Object.values(slots).filter(
		(slot): slot is Record<string, unknown> =>
			typeof slot === "object" && slot !== null,
	);
};

/**
 * Write the styling an object supports and report the rest, mutating the object in place.
 * Shared by `setStyle` and by `addObject`, which styles what the factory just built.
 *
 * A connector is styled as the line it is: the stroke group draws the line itself, while
 * `fill` and the typography go to its label (and are ignored when it has none, since a
 * label is created by giving it text). Its label border is not reachable from here — the
 * stroke group is already spoken for by the line.
 *
 * @param object - Mutated in place
 * @param style - Properties to set; an omitted one is left as it is, and there is no way
 *   to unset a property back to its default
 * @param definition - The object's own definition, whose `features` decide what applies
 * @returns The requested property names this object type has no place for, in declaration
 *   order; empty when everything applied
 */
export const applyStyle = (
	object: ObjectRecord,
	style: StyleParams,
	definition: ObjectDocDefinition | undefined,
): string[] => {
	const appliedKeys = new Set<string>();

	if (isConnectorObject(object)) {
		applyKeys(object, style, STROKE_STYLE_KEYS).forEach((key) =>
			appliedKeys.add(key),
		);
		const label = object.label;
		if (typeof label === "object" && label !== null) {
			applyKeys(
				label as Record<string, unknown>,
				style,
				CONNECTOR_LABEL_KEYS,
			).forEach((key) => appliedKeys.add(key));
		}
	} else {
		const features = definition?.features;
		const shapeKeys = [
			...(features?.fill === true ? FILL_STYLE_KEYS : []),
			...(features?.stroke === true ? STROKE_STYLE_KEYS : []),
			...(features?.radius === true ? RADIUS_STYLE_KEYS : []),
		];
		applyKeys(object, style, shapeKeys).forEach((key) => appliedKeys.add(key));

		if (features?.text === "body") {
			applyKeys(object, style, TEXT_SLOT_STYLE_KEYS).forEach((key) =>
				appliedKeys.add(key),
			);
		} else if (features?.text === "slots") {
			// Typography is stored per slot, so styling the shape means styling all of them.
			for (const slot of readTextSlots(object)) {
				applyKeys(slot, style, TEXT_SLOT_STYLE_KEYS).forEach((key) =>
					appliedKeys.add(key),
				);
			}
		}
	}

	return requestedStyleKeys(style).filter((key) => !appliedKeys.has(key));
};

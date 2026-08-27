import type { ObjectDocDefinition } from "../plugin/ObjectDocDefinition";
import type { DocDefinitions } from "./utils/objectGeometry";

/** What one object type can be asked to do, read off its definition's `features`. */
export type ObjectTypeSummary = {
	/** The type name, as `addObject` takes it. */
	type: string;
	/**
	 * Whether `addObject` can create it: a definition with no factory is only ever parsed
	 * from a file, so `group` / `connector` / `svg` are false among the built-ins.
	 * A connector is drawn with `connect` rather than `addObject`
	 */
	creatable: boolean;
	/** Whether `connect` may put an endpoint on it; false for a connector itself. */
	connectable: boolean;
	/**
	 * "single" for one body of text, which `setText` writes with no slot named; "slots" for
	 * named parts, which it requires one for; null for a type `setText` refuses outright.
	 * A connector is null and still carries a label, which `setText` writes
	 */
	text: "single" | "slots" | null;
	/**
	 * How the shape is stored: "rect" (x/y/width/height), "ellipse" (cx/cy/rx/ry), "poly"
	 * (a `points` array, the only kind `setPoints` takes), "point" (a coordinate, the size
	 * coming from the content), or "none" for a type measured from its children.
	 */
	geometry: string;
	/**
	 * What the type is for, in one line, as its definition states it; absent for a type
	 * whose definition says nothing.
	 *
	 * The fields above say what a type *can* do and none of them says what it *means*,
	 * which is what a caller picking a shape is actually choosing on. Without this a
	 * pictogram is picked off its name alone — `browserWindow` reads like a frame to lay a
	 * screen out inside, which it is not.
	 */
	summary?: string;
};

/** The text shape a caller sees; `features.text` names the doc's shape rather than that. */
const textKindOf = (
	definition: ObjectDocDefinition,
): ObjectTypeSummary["text"] => {
	switch (definition.features.text) {
		case "body":
			return "single";
		case "slots":
			return "slots";
		default:
			return null;
	}
};

/**
 * Every object type an instance of these ops knows, built-ins first and then each plugin's
 * own, in the order `resolveDocDefinitions` merged them.
 *
 * The one op that takes no `doc`: it describes what may be put in one. A caller listing the
 * types on an AI tool schema derives that list from here rather than filtering the
 * definitions for itself, so what it offers cannot drift from what `addObject` and
 * `connect` go on to accept.
 *
 * @param definitions - Type table to describe; every entry yields exactly one summary, so
 *   an empty table yields an empty array
 * @returns One summary per type, in the table's own order
 */
export const listTypes = (definitions: DocDefinitions): ObjectTypeSummary[] =>
	[...definitions].map(([type, definition]) => ({
		type,
		creatable: definition.factory !== undefined,
		connectable: definition.features.connectable === true,
		text: textKindOf(definition),
		geometry: definition.features.geometry,
		...(definition.summary === undefined
			? {}
			: { summary: definition.summary }),
	}));

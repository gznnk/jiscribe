import type { ObjectDoc } from "@jiscribe/doc";
import {
	ARROW_STYLE_KEYS,
	FILL_STYLE_KEYS,
	isRichText,
	RADIUS_STYLE_KEYS,
	richTextToPlain,
	STROKE_STYLE_KEYS,
	TEXT_SLOT_STYLE_KEYS,
	TRANSFORM_STYLE_KEYS,
} from "@jiscribe/doc";
import {
	CONNECTOR_LABEL_DEFAULTS,
	DEFAULT_FONT_FAMILY,
} from "@jiscribe/doc/unstable";
import { standardObjectDocDefinitions } from "@jiscribe/standard-shapes/doc";

import { resolveConnectorLabel } from "./connectorLabelFit";
import type { Diagnostic } from "./Diagnostic";
import { isFontStackMeasured } from "./measure/fontSourcePackages";
import { FALLBACK_CHAR_WIDTH_RATIO } from "./measure/nodeTextMeasurer";

/**
 * Fields an object holds beside its own content: its descendants, which are
 * looked at in their own turn, and the host's data, which is drawn nowhere.
 */
const NON_CONTENT_FIELDS: ReadonlySet<string> = new Set(["children", "meta"]);

/**
 * Field names holding a string that is styling rather than text, wherever they
 * sit in an object of a slotted type: on the object, on a slot, on a run.
 */
const STYLE_FIELDS: ReadonlySet<string> = new Set<string>([
	...TEXT_SLOT_STYLE_KEYS,
	...STROKE_STYLE_KEYS,
	...FILL_STYLE_KEYS,
	...ARROW_STYLE_KEYS,
	...RADIUS_STYLE_KEYS,
	...TRANSFORM_STYLE_KEYS,
]);

/** How many ids a finding names before it counts the rest. */
const MAX_LISTED_IDS = 10;

/** The fields of an object worth walking: everything but {@link NON_CONTENT_FIELDS}. */
const readContentFields = (object: ObjectDoc): [string, unknown][] =>
	Object.entries(object).filter(([field]) => !NON_CONTENT_FIELDS.has(field));

/** Every `fontFamily` string anywhere under the value, added to `families`. */
const collectFontFamilies = (value: unknown, families: Set<string>): void => {
	if (Array.isArray(value)) {
		for (const item of value) {
			collectFontFamilies(item, families);
		}
		return;
	}
	if (typeof value !== "object" || value === null) {
		return;
	}
	for (const [field, fieldValue] of Object.entries(value)) {
		if (field === "fontFamily" && typeof fieldValue === "string") {
			families.add(fieldValue);
		} else {
			collectFontFamilies(fieldValue, families);
		}
	}
};

/**
 * Whether a value of a slotted object holds any character of text. The slots
 * are spelled out differently per type — a `text` map (`record`), a grid
 * (`table`), named fields (`erEntity`) — but each slot is a string or the runs
 * of one, possibly inside an object carrying its styling, so any non-empty
 * string not under a styling field is text.
 */
const holdsSlotText = (value: unknown): boolean => {
	if (typeof value === "string") {
		return value !== "";
	}
	if (Array.isArray(value)) {
		return value.some(holdsSlotText);
	}
	if (typeof value !== "object" || value === null) {
		return false;
	}
	return Object.entries(value).some(
		([field, fieldValue]) =>
			!STYLE_FIELDS.has(field) && holdsSlotText(fieldValue),
	);
};

/**
 * Whether the object has text the diagnosis measures: a single body (a caption
 * hung below the box included), any slot, or a connector's label holding a character. False for a type outside the
 * shipped set and for one whose body its own renderer lays out (`"source"`),
 * neither being measured at all.
 */
const holdsMeasuredText = (object: ObjectDoc): boolean => {
	if (object.type === "connector") {
		return resolveConnectorLabel(object) !== null;
	}
	const textType = standardObjectDocDefinitions.get(object.type)?.features.text;
	if (textType === "body" || textType === "label") {
		const text = (object as { text?: unknown }).text;
		return isRichText(text) && richTextToPlain(text) !== "";
	}
	if (textType === "slots") {
		// The object's own `id` and `type` are not slots (an entity column's `type`
		// is, which is why only the top-level pair is passed over).
		return readContentFields(object).some(
			([field, value]) =>
				field !== "id" &&
				field !== "type" &&
				!STYLE_FIELDS.has(field) &&
				holdsSlotText(value),
		);
	}
	return false;
};

/** The families an object's text is set in, as the font stacks the document spells. */
const readFontStacks = (object: ObjectDoc): ReadonlySet<string> => {
	const stacks = new Set<string>();
	collectFontFamilies(Object.fromEntries(readContentFields(object)), stacks);
	// A family stated nowhere — object, slot, run or label — is the default the
	// canvas draws it in.
	if (stacks.size === 0) {
		stacks.add(
			object.type === "connector"
				? CONNECTOR_LABEL_DEFAULTS.fontFamily
				: DEFAULT_FONT_FAMILY,
		);
	}
	return stacks;
};

const describeIds = (ids: readonly string[]): string =>
	ids.length > MAX_LISTED_IDS
		? `${ids.slice(0, MAX_LISTED_IDS).join(", ")} and ${ids.length - MAX_LISTED_IDS} more`
		: ids.join(", ");

/**
 * One warning per font stack the document's measured text is set in that this
 * check measures by estimate, so a caller does not read the other findings as
 * exact: a stack naming no family the canvas ships — or none whose font files
 * are installed here — is charged a flat width per character rather than
 * measured (see measure/nodeTextMeasurer.ts). Every `fontFamily` the text's
 * object holds is looked at, on the object, a slot, a run or a label; an object
 * stating none is counted under the default family it is drawn in, which is the
 * stack that reports an install without the font packages. Text a type lays out
 * itself (`"source"`, Markdown) and types outside the shipped set are not
 * measured, so they are not counted either. A character no family of a
 * measured stack covers is estimated too, which this does not report.
 * Package-internal.
 *
 * @param objects - The whole document flattened in drawing order (flattenObjects); a group's children are counted as themselves
 * @returns One document-wide warning (no `objectId`) per such stack, in the order the stacks first appear, naming the objects set in it — the first ten and how many more
 */
export const diagnoseUnmeasuredFonts = (
	objects: readonly ObjectDoc[],
): Diagnostic[] => {
	const idsByStack = new Map<string, string[]>();
	for (const object of objects) {
		if (!holdsMeasuredText(object)) {
			continue;
		}
		for (const stack of readFontStacks(object)) {
			const ids = idsByStack.get(stack) ?? [];
			ids.push(object.id);
			idsByStack.set(stack, ids);
		}
	}
	return [...idsByStack]
		.filter(([stack]) => !isFontStackMeasured(stack))
		.map(([stack, ids]) => ({
			severity: "warning",
			message: `fontFamily "${stack}" names no font the canvas ships (or none whose font files are installed here), so text set in it is measured at an estimated ${FALLBACK_CHAR_WIDTH_RATIO}em per character: ${describeIds(ids)}; overflow and line-break findings on this document are approximate`,
		}));
};

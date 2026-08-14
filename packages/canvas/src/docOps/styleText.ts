import { DocOperationError } from "./errors";
import { type ObjectRecord, requireObject } from "./objectAccess";
import { type DocDefinitions, isConnectorObject } from "./objectGeometry";
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
import type {
	InlineTextStyle,
	RichText,
} from "../schemas/objects/types/RichText";
import {
	isRichText,
	richTextToPlain,
	styleRichTextRange,
	TEXT_INLINE_STYLE_KEYS,
} from "../schemas/objects/types/RichText";
import { isTextRows } from "../schemas/objects/types/TextSlot";

/**
 * Which characters to style and how. The stretch is named by the text it holds
 * rather than by offsets: an offset is something a caller would have to count out
 * of the string it just wrote, and a miscount styles the wrong words without
 * failing.
 */
export type StyleTextParams = InlineTextStyle & {
	/**
	 * The text to style, matched literally against the object's own. Must occur in
	 * it; a stretch that does not is an error rather than a silent no-op.
	 */
	match: string;
	/**
	 * Which occurrence to style when the text holds several, counted from 1.
	 * Omitted styles every occurrence.
	 */
	occurrence?: number;
	/** Which slot to style, for a type whose text is keyed. Omitted takes the object's only slot. */
	slot?: string;
};

/** The occurrences of `match` in `plain`, as the offsets they start at. */
const findOccurrences = (plain: string, match: string): number[] => {
	const offsets: number[] = [];
	for (
		let found = plain.indexOf(match);
		found !== -1;
		found = plain.indexOf(match, found + match.length)
	) {
		offsets.push(found);
	}
	return offsets;
};

/** The styling fields the params actually ask for, `match` / `occurrence` / `slot` left out. */
const requestedStyle = (params: StyleTextParams): InlineTextStyle => {
	const style: Record<string, unknown> = {};
	for (const key of TEXT_INLINE_STYLE_KEYS) {
		const value = params[key];
		if (value !== undefined) {
			style[key] = value;
		}
	}
	return style;
};

/** Styles every requested occurrence, last one first so the earlier offsets still hold. */
const styleOccurrences = (
	content: RichText,
	offsets: readonly number[],
	length: number,
	style: InlineTextStyle,
): RichText =>
	[...offsets]
		.reverse()
		.reduce(
			(styled, offset) =>
				styleRichTextRange(styled, offset, offset + length, style),
			content,
		);

/**
 * Style a stretch of one object's text, leaving the rest of it as it is: the
 * programmatic counterpart of selecting a few words and pressing bold.
 *
 * Only the typography a stretch of characters can carry on its own is settable
 * (InlineTextStyle) — the alignment places the whole slot, and `setStyle` is
 * where it and the shape-wide typography live. Styling a stretch and then styling
 * the whole shape drops the overlap: a property set on the shape wins over the
 * ranges it was set on part of the text (see applyStyle).
 *
 * @param doc - Mutated in place
 * @param id - Id of the object to style; must exist in the root tree
 * @param params - The stretch to style and the styling to give it
 * @param definitions - Type table `features.text` is read from
 * @throws {@link DocOperationError} when the id is missing, when the type holds no
 *   text a stretch can be styled in (a connector label and a slot of rows are both
 *   styled as a whole, through `setStyle`), when `slot` is absent or unknown on a
 *   slotted type, when `match` does not occur in the text, or when `occurrence` is
 *   past the last one
 */
export const styleText = (
	doc: CanvasDoc,
	id: string,
	params: StyleTextParams,
	definitions: DocDefinitions,
): void => {
	const { object } = requireObject(doc, id);
	if (isConnectorObject(object)) {
		throw new DocOperationError(
			`${id} is a connector: a label carries one styling for the whole of it, so use setStyle`,
		);
	}

	const textFeature = definitions.get(object.type)?.features.text;
	const target: ObjectRecord = resolveTextTarget(
		object,
		id,
		textFeature,
		params.slot,
	);
	const content = target.text;
	if (isTextRows(content)) {
		throw new DocOperationError(
			`${id} ("${object.type}") holds rows in that slot, which are styled as a whole through setStyle`,
		);
	}
	const body: RichText = isRichText(content) ? content : "";

	const plain = richTextToPlain(body);
	if (params.match === "") {
		throw new DocOperationError(`${id}: match must not be empty`);
	}
	const offsets = findOccurrences(plain, params.match);
	if (offsets.length === 0) {
		throw new DocOperationError(
			`${id} does not contain ${JSON.stringify(params.match)}`,
		);
	}
	if (params.occurrence !== undefined) {
		if (params.occurrence < 1 || params.occurrence > offsets.length) {
			throw new DocOperationError(
				`${id} contains ${JSON.stringify(params.match)} ${offsets.length} time(s), so occurrence ${params.occurrence} does not exist`,
			);
		}
	}

	const styledOffsets =
		params.occurrence === undefined
			? offsets
			: [offsets[params.occurrence - 1]];
	target.text = styleOccurrences(
		body,
		styledOffsets,
		params.match.length,
		requestedStyle(params),
	);
};

/**
 * The record the text lives on: the object itself for a single body, one of its
 * slots for a keyed type.
 */
const resolveTextTarget = (
	object: ObjectRecord,
	id: string,
	textFeature: "body" | "slots" | undefined,
	slot: string | undefined,
): ObjectRecord => {
	if (textFeature === "body") {
		return object;
	}
	if (textFeature !== "slots") {
		throw new DocOperationError(
			`${id} ("${object.type}") holds no text that can be styled`,
		);
	}
	const slots = object.text;
	if (typeof slots !== "object" || slots === null) {
		throw new DocOperationError(`${id} ("${object.type}") has no text slot`);
	}
	const slotIds = Object.keys(slots);
	const targetSlotId = slot ?? (slotIds.length === 1 ? slotIds[0] : undefined);
	if (targetSlotId === undefined || !slotIds.includes(targetSlotId)) {
		throw new DocOperationError(
			`${id} ("${object.type}") needs the slot to style: ${slotIds.join(" / ")}`,
		);
	}
	return (slots as Record<string, ObjectRecord>)[targetSlotId];
};

import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";
import type {
	InlineTextStyle,
	RichText,
} from "../../schemas/objects/types/RichText";
import {
	isRichText,
	joinRichTextLines,
	remapRichText,
	richTextToPlain,
	splitRichTextLines,
	styleRichTextRange,
	TEXT_INLINE_STYLE_KEYS,
} from "../../schemas/objects/types/RichText";
import { isTextRows } from "../../schemas/objects/types/TextSlot";
import { DocOperationError } from "../errors";
import { batchItemError } from "../utils/batchErrors";
import { type ObjectRecord, requireObject } from "../utils/objectAccess";
import {
	type DocDefinitions,
	isConnectorObject,
} from "../utils/objectGeometry";

/**
 * The new text for a body that may be styled per range: the characters the
 * rewrite left in place keep the styling they had (remapRichText), the way an
 * edit in the canvas does. A body that was never styled stays the plain string
 * it is.
 */
const rewriteBody = (previous: unknown, text: string): RichText =>
	isRichText(previous) ? remapRichText(previous, text) : text;

/** Set a connector's label text; an empty string drops the label entirely. */
const setConnectorLabelText = (object: ObjectRecord, text: string): void => {
	if (text === "") {
		delete object.label;
		return;
	}
	const label = object.label;
	if (typeof label === "object" && label !== null) {
		(label as Record<string, unknown>).text = text;
		return;
	}
	object.label = { text };
};

/** Slot objects of a `text: "slots"` doc, keyed by slot id. */
const readSlots = (object: ObjectRecord): Record<string, unknown> | null => {
	const slots = object.text;
	return typeof slots === "object" && slots !== null
		? (slots as Record<string, unknown>)
		: null;
};

/**
 * Where one rewrite will be written, resolved while nothing has been mutated yet.
 * The new content is built at write time rather than here, so two rewrites of the
 * same object stack the way two separate calls would.
 */
type TextWrite =
	| {
			kind: "connectorLabel";
			/** The connector whose label the text becomes. */
			connector: ObjectRecord;
			/** The text to write; empty drops the label. */
			text: string;
	  }
	| {
			kind: "body";
			/** The object whose own `text` field is rewritten. */
			object: ObjectRecord;
			/** The text to write. */
			text: string;
	  }
	| {
			kind: "slot";
			/** The slot record whose `text` field is rewritten. */
			slot: Record<string, unknown>;
			/** The text to write. */
			text: string;
	  };

/** Resolve where one object's text lives, failing before any of it is written. */
const planTextWrite = (
	doc: CanvasDoc,
	id: string,
	text: string,
	slot: string | undefined,
	definitions: DocDefinitions,
): TextWrite => {
	const { object } = requireObject(doc, id);
	if (isConnectorObject(object)) {
		return { kind: "connectorLabel", connector: object, text };
	}

	const textFeature = definitions.get(object.type)?.features.text;
	if (textFeature === "body") {
		return { kind: "body", object, text };
	}
	if (textFeature !== "slots") {
		throw new DocOperationError(
			`${id} ("${object.type}") holds no text that can be set`,
		);
	}

	const slots = readSlots(object);
	const slotIds = slots === null ? [] : Object.keys(slots);
	if (slots === null || slotIds.length === 0) {
		throw new DocOperationError(`${id} ("${object.type}") has no text slot`);
	}
	const targetSlotId = slot ?? (slotIds.length === 1 ? slotIds[0] : undefined);
	if (targetSlotId === undefined || !slotIds.includes(targetSlotId)) {
		throw new DocOperationError(
			`${id} ("${object.type}") needs the slot to write: ${slotIds.join(" / ")}`,
		);
	}
	return {
		kind: "slot",
		slot: slots[targetSlotId] as Record<string, unknown>,
		text,
	};
};

/** Carry out a planned rewrite, reading the current content to keep its styling. */
const applyTextWrite = (write: TextWrite): void => {
	if (write.kind === "connectorLabel") {
		setConnectorLabelText(write.connector, write.text);
		return;
	}
	if (write.kind === "body") {
		write.object.text = rewriteBody(write.object.text, write.text);
		return;
	}
	const { slot } = write;
	// The slot's own content decides the shape: a rows slot rejects a plain string,
	// while an array of runs is one styled body and must not be split into rows.
	slot.text = isTextRows(slot.text)
		? splitRichTextLines(
				remapRichText(joinRichTextLines(slot.text), write.text),
			)
		: rewriteBody(slot.text, write.text);
};

/**
 * Rewrite one object's text, mutating `doc` in place.
 *
 * What "text" means follows the type: a single-body shape takes the string as it is, a
 * slotted shape rewrites one named slot, and a connector's text is its label — where an
 * empty string removes the label rather than leaving a blank one.
 *
 * @param doc - Mutated in place
 * @param id - Id of the object to retext; must exist in the root tree
 * @param text - The new text. Newlines are kept for a single body and split into one row
 *   each for a slot that holds rows. Styling applied to parts of the old text survives on
 *   the characters the rewrite kept (see {@link rewriteBody})
 * @param slot - Which slot to write, for a slotted type only. `undefined` is allowed when
 *   the object has exactly one slot; the slot must already exist, since its content shape
 *   (one string or a list of rows) is not inferable for a slot that is absent
 * @param definitions - Type table `features.text` is read from
 * @throws {@link DocOperationError} when the id is missing, when the type holds no text at
 *   all, or when `slot` is absent/unknown on a slotted type — the message lists the slots
 *   the object actually has
 */
export const setText = (
	doc: CanvasDoc,
	id: string,
	text: string,
	slot: string | undefined,
	definitions: DocDefinitions,
): void => {
	applyTextWrite(planTextWrite(doc, id, text, slot, definitions));
};

/** One object's new text in a {@link setTexts} call. */
export type SetTextEntry = {
	/** Id of the object to retext; must exist in the root tree. */
	id: string;
	/** The new text, read exactly as {@link setText} reads it. */
	text: string;
	/** Which slot to write, for a slotted type only; see {@link setText}. */
	slot?: string;
};

/**
 * Rewrite the text of several objects in one call, mutating `doc` in place.
 *
 * Every entry is resolved before any of them is written, so a call that throws leaves the
 * document exactly as it was — the point of using this over a loop of {@link setText},
 * which would stop half way through with the earlier rewrites already applied.
 *
 * @param doc - Mutated in place
 * @param entries - One entry per object, written in the order given; an empty array is a
 *   no-op. An id may appear more than once, and each entry rewrites what the one before
 *   it left, so the last text wins and styling survives across them exactly as it does
 *   across separate {@link setText} calls
 * @param definitions - Type table `features.text` is read from
 * @throws {@link DocOperationError} for any reason {@link setText} throws for, with the
 *   offending entry named as `entries[i] (id)` and the document still untouched
 */
export const setTexts = (
	doc: CanvasDoc,
	entries: readonly SetTextEntry[],
	definitions: DocDefinitions,
): void => {
	const writes = entries.map((entry, index) => {
		try {
			return planTextWrite(doc, entry.id, entry.text, entry.slot, definitions);
		} catch (error) {
			throw batchItemError("entries", index, entry.id, error);
		}
	});
	for (const write of writes) {
		applyTextWrite(write);
	}
};

/**
 * Which characters to style and how. The stretch is named by the text it holds
 * rather than by offsets: an offset is something a caller would have to count out
 * of the string it just wrote, and a miscount styles the wrong words without
 * failing.
 */
export type TextStyleParams = InlineTextStyle & {
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
const requestedStyle = (params: TextStyleParams): InlineTextStyle => {
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
 * One validated styling job: where the text lives, the offsets `match` was found
 * at, and the styling to lay over them. The content is read again at write time so
 * that two jobs on the same body stack — styling only splits runs and never changes
 * the characters, so the offsets stay valid in between.
 */
type TextStyleWrite = {
	/** The record holding the text: the object itself, or one of its slots. */
	target: ObjectRecord;
	/** Where each styled stretch starts, in characters of the plain text. */
	offsets: readonly number[];
	/** How many characters each stretch spans, i.e. `match.length`. */
	matchLength: number;
	/** The styling to apply to every one of those stretches. */
	style: InlineTextStyle;
};

/** Resolve and match one styling request, failing before any of it is written. */
const planTextStyle = (
	doc: CanvasDoc,
	id: string,
	params: TextStyleParams,
	definitions: DocDefinitions,
): TextStyleWrite => {
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

	return {
		target,
		offsets:
			params.occurrence === undefined
				? offsets
				: [offsets[params.occurrence - 1]],
		matchLength: params.match.length,
		style: requestedStyle(params),
	};
};

/** Carry out a planned styling job over the content as it stands now. */
const applyTextStyle = (write: TextStyleWrite): void => {
	const content = write.target.text;
	const body: RichText = isRichText(content) ? content : "";
	write.target.text = styleOccurrences(
		body,
		write.offsets,
		write.matchLength,
		write.style,
	);
};

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
export const setTextStyle = (
	doc: CanvasDoc,
	id: string,
	params: TextStyleParams,
	definitions: DocDefinitions,
): void => {
	applyTextStyle(planTextStyle(doc, id, params, definitions));
};

/** One stretch of text to style in a {@link setTextStyles} call. */
export type SetTextStyleEntry = {
	/** Id of the object to style; must exist in the root tree. */
	id: string;
} & TextStyleParams;

/**
 * Style a stretch of text on each of several objects in one call, mutating `doc` in place.
 *
 * Every entry is matched against the text it names before any styling is written, so a
 * call that throws leaves the document exactly as it was — a loop of {@link setTextStyle}
 * would stop half way through with the earlier stretches already styled.
 *
 * @param doc - Mutated in place
 * @param entries - One entry per stretch, styled in the order given; an empty array is a
 *   no-op. An id may appear more than once, which is how several stretches of one text
 *   get styled: the entries stack, and where two of them overlap the later one wins on
 *   the properties it sets
 * @param definitions - Type table `features.text` is read from
 * @throws {@link DocOperationError} for any reason {@link setTextStyle} throws for, with the
 *   offending entry named as `entries[i] (id)` and the document still untouched
 */
export const setTextStyles = (
	doc: CanvasDoc,
	entries: readonly SetTextStyleEntry[],
	definitions: DocDefinitions,
): void => {
	const writes = entries.map((entry, index) => {
		try {
			return planTextStyle(doc, entry.id, entry, definitions);
		} catch (error) {
			throw batchItemError("entries", index, entry.id, error);
		}
	});
	for (const write of writes) {
		applyTextStyle(write);
	}
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

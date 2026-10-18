import type { ObjectMapperType } from "@jiscribe/canvas";
import {
	mapTransformDocToState,
	mapTransformStateToDoc,
	ObjectMapper,
} from "@jiscribe/canvas-sdk";
import {
	collectStyleKeys,
	roundDocCoordinate,
	roundDocSize,
} from "@jiscribe/canvas-sdk/doc";
import { richTextToPlain, TEXT_SLOT_STYLE_KEYS } from "@jiscribe/doc";
import type { RichText, TextSlot } from "@jiscribe/doc";
import {
	calcFrameCenterFromTopLeft,
	calcFrameKeyPoint,
} from "@jiscribe/geometry";

import type { ErEntityState } from "./ErEntityState";
import { calcErEntityMinWidth } from "../layout/erEntitySlotWidths";
import { readCachedErEntityLayout } from "../layout/readCachedErEntityLayout";
import { readErEntityDocLayoutInput } from "../layout/readErEntityLayoutSource";
import {
	countErEntityColumns,
	erEntityColumnTextSlotId,
} from "../schema/erEntityColumnIds";
import {
	ER_ENTITY_NAME_TEXT_SLOT_ID,
	ErEntityFeatures,
} from "../schema/ErEntityDoc";
import type {
	ErEntityColumnDoc,
	ErEntityDoc,
	ErEntityTextDoc,
} from "../schema/ErEntityDoc";

/**
 * The fields that read the same on a doc and on a state: the stroke and fill
 * groups (`collectStyleKeys`). `name` and `columns` are converted rather than
 * carried — they move into `text`.
 */
const ER_ENTITY_PASSTHROUGH_KEYS = collectStyleKeys(ErEntityFeatures);

/** The passthrough fields `src` owns, by allow-list so nothing runtime-only (id / minWidth / derivedWidth) leaks into the document. */
const pickPassthrough = (
	src: Readonly<Record<string, unknown>>,
): Record<string, unknown> => {
	const picked: Record<string, unknown> = {};
	for (const key of ER_ENTITY_PASSTHROUGH_KEYS) {
		if (Object.prototype.hasOwnProperty.call(src, key)) {
			picked[key] = src[key];
		}
	}
	return picked;
};

/** Whether a slot sets no typography of its own, and so may be written back as its text alone. */
const isTextOnlySlot = (slot: TextSlot<RichText>): boolean =>
	TEXT_SLOT_STYLE_KEYS.every((key) => slot[key] === undefined);

/** One slot in the form a document writes it: the text alone when it sets no typography, the slot object otherwise. */
const mapTextSlotToDoc = (
	slot: TextSlot<RichText> | undefined,
): ErEntityTextDoc => {
	if (slot === undefined) {
		return "";
	}
	return isTextOnlySlot(slot) ? slot.text : { ...slot };
};

/** Whether a key or type slot may be left out of its column: empty and unstyled. */
const isOmissibleSlot = (slot: TextSlot<RichText> | undefined): boolean =>
	slot === undefined ||
	(richTextToPlain(slot.text) === "" && isTextOnlySlot(slot));

/** The inverse of mapErEntityDocToTextSlots's columns: an empty, unstyled key or type is omitted. */
const mapTextSlotsToColumns = (
	text: Readonly<Record<string, TextSlot<RichText>>>,
): ErEntityColumnDoc[] => {
	const columns: ErEntityColumnDoc[] = [];
	const columnCount = countErEntityColumns(text);
	for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
		const keySlot = text[erEntityColumnTextSlotId(columnIndex, "key")];
		const nameSlot = text[erEntityColumnTextSlotId(columnIndex, "name")];
		const typeSlot = text[erEntityColumnTextSlotId(columnIndex, "type")];
		columns.push({
			...(!isOmissibleSlot(keySlot) && { key: mapTextSlotToDoc(keySlot) }),
			name: mapTextSlotToDoc(nameSlot),
			...(!isOmissibleSlot(typeSlot) && { type: mapTextSlotToDoc(typeSlot) }),
		});
	}
	return columns;
};

/**
 * ErEntityDoc -> ErEntityState: the texts moved into the slot map, each keeping
 * the typography it states alone, the
 * stated widths read as the layout reads them (readErEntityDocLayoutInput: the
 * defaults filled in, a malformed one read as not stated) and kept as stated,
 * and the box measured from them. Written out rather than built from
 * `createFrameMapper`, which refuses a `geometry: "point"` type; the box is
 * measured here — by the same cached layout the content resizer keeps it at — so
 * a state that never reaches the derivation pass (doc ops, a headless
 * measurement) still has its extent, and one that does is handed back
 * untouched. A stated width narrower than its texts stays stated: the drawing
 * re-fits from the texts on every load.
 */
export const erEntityToState: ObjectMapperType<
	ErEntityDoc,
	ErEntityState
>["toState"] = (doc) => {
	const layoutInput = readErEntityDocLayoutInput(doc);
	const transform = mapTransformDocToState(doc);
	const layout = readCachedErEntityLayout(layoutInput);
	const { width, height } = layout;
	// The doc's (x, y) is the drawn top-left. Left unrounded: rounding both
	// directions would round the coordinate twice on a doc round trip.
	const center = calcFrameCenterFromTopLeft(
		{ x: doc.x, y: doc.y },
		{ width, height },
		transform,
	);

	return {
		...ObjectMapper.toState(doc),
		...pickPassthrough(doc),
		...transform,
		type: ErEntityFeatures.type,
		cx: center.x,
		cy: center.y,
		width,
		height,
		...(layoutInput.keyWidth !== undefined && {
			keyWidth: layoutInput.keyWidth,
		}),
		nameWidth: layoutInput.nameWidth,
		typeWidth: layoutInput.typeWidth,
		derivedWidth: width,
		minWidth: calcErEntityMinWidth(layout.keyWidth, layout.slotFloors),
		text: layoutInput.text,
	} as ErEntityState;
};

/**
 * ErEntityState -> ErEntityDoc: the slots folded back into `name` / `columns`,
 * each in its short form unless it states typography of its own, the stated name
 * and type widths always written (as the table writes every column's), the key
 * gutter width only where it is stated, and the box
 * dropped — the width being the slots summed and the height derived.
 */
export const erEntityToDoc: ObjectMapperType<
	ErEntityDoc,
	ErEntityState
>["toDoc"] = (state) => {
	const drawnTopLeft = calcFrameKeyPoint(state, "topLeft");

	return {
		...ObjectMapper.toDoc(state),
		...pickPassthrough(state),
		...mapTransformStateToDoc(state),
		type: ErEntityFeatures.type,
		// Rounded for the reason TableMapper gives: the transform makes the round
		// trip exact only to a float epsilon, and the doc is compared as an exact value.
		x: roundDocCoordinate(drawnTopLeft.x),
		y: roundDocCoordinate(drawnTopLeft.y),
		...(state.keyWidth !== undefined && {
			keyWidth: roundDocSize(state.keyWidth),
		}),
		nameWidth: roundDocSize(state.nameWidth),
		typeWidth: roundDocSize(state.typeWidth),
		name: mapTextSlotToDoc(state.text[ER_ENTITY_NAME_TEXT_SLOT_ID]),
		columns: mapTextSlotsToColumns(state.text),
	} as ErEntityDoc;
};

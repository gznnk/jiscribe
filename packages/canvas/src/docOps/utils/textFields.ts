import type { ObjectRecord } from "./objectAccess";
import { type DocDefinitions, isConnectorObject } from "./objectGeometry";
import {
	isRichText,
	richTextToPlain,
} from "../../schemas/objects/types/RichText";
import { isTextRows } from "../../schemas/objects/types/TextSlot";
import { DocOperationError } from "../errors";

/** Slot objects of a `text: "slots"` doc, keyed by slot id. */
export const readSlots = (
	object: ObjectRecord,
): Record<string, unknown> | null => {
	const slots = object.text;
	return typeof slots === "object" && slots !== null
		? (slots as Record<string, unknown>)
		: null;
};

/**
 * Which slot of a keyed type an op works on: the one named, or the object's only
 * slot when `slot` is omitted.
 *
 * @param action - The verb the failure message reads with ("write" / "style" / "read")
 */
export const requireSlotId = (
	object: ObjectRecord,
	id: string,
	slotIds: readonly string[],
	slot: string | undefined,
	action: string,
): string => {
	const targetSlotId = slot ?? (slotIds.length === 1 ? slotIds[0] : undefined);
	if (targetSlotId === undefined || !slotIds.includes(targetSlotId)) {
		throw new DocOperationError(
			`${id} ("${object.type}") needs the slot to ${action}: ${slotIds.join(" / ")}`,
		);
	}
	return targetSlotId;
};

/** A connector's label text; "" for a connector carrying no label. */
export const readConnectorLabelText = (object: ObjectRecord): string => {
	const label = object.label;
	if (typeof label !== "object" || label === null) {
		return "";
	}
	const text = (label as Record<string, unknown>).text;
	return typeof text === "string" ? text : "";
};

/**
 * The characters the `text` field of an object or of one of its slots holds, styling
 * dropped: a row-partitioned slot reads as its rows joined by newlines, which is the form
 * {@link setText} takes them back in. A record holding no readable text reads as "".
 */
export const readTextField = (record: unknown): string => {
	const content =
		typeof record === "object" && record !== null
			? (record as Record<string, unknown>).text
			: undefined;
	return isTextRows(content)
		? content.map(richTextToPlain).join("\n")
		: richTextToPlain(isRichText(content) ? content : "");
};

/**
 * The plain characters of one object's text, or null for a type holding none — the rule
 * `listObjects` summarizes text by, sharing {@link getText}'s reading of every form.
 *
 * @param object - Any doc object; a slotted type reads as all of its slots joined by
 *   newlines, there being no slot to single out where nothing named one
 * @param definitions - Type table `features.text` is read from
 * @returns The characters, or null for a type declaring no text at all
 */
export const readObjectText = (
	object: ObjectRecord,
	definitions: DocDefinitions,
): string | null => {
	if (isConnectorObject(object)) {
		return readConnectorLabelText(object);
	}
	const textFeature = definitions.get(object.type)?.features.text;
	if (textFeature === "body") {
		return readTextField(object);
	}
	if (textFeature !== "slots") {
		return null;
	}
	const slots = readSlots(object);
	return slots === null
		? ""
		: Object.values(slots).map(readTextField).join("\n");
};

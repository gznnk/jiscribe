import { defineObjectAiTool } from "@jiscribe/canvas-sdk/tools";
import type { TextSlot } from "@jiscribe/doc";
import { z } from "zod";

import { calcRecordDocFrameAtHeight } from "./calcRecordDocFrameAtHeight";
import {
	calcRecordContentHeight,
	listRecordPresentTextSlotIds,
} from "../schema/calcRecordContentHeight";
import {
	isRecordListTextSlotId,
	RECORD_ATTRIBUTES_TEXT_SLOT_ID,
	RECORD_NAME_TEXT_SLOT_ID,
	RECORD_OPERATIONS_TEXT_SLOT_ID,
	RECORD_STEREOTYPE_TEXT_SLOT_ID,
	RECORD_TEXT_SLOT_IDS,
	RECORD_TEXT_SLOT_STYLE_DEFAULTS_BY_ID,
} from "../schema/RecordDoc";
import type {
	RecordDoc,
	RecordTextDoc,
	RecordTextSlotId,
} from "../schema/RecordDoc";

/** The slots this tool sets; `name` is left to set_text. */
const RECORD_COMPARTMENT_ARG_IDS = [
	RECORD_STEREOTYPE_TEXT_SLOT_ID,
	RECORD_ATTRIBUTES_TEXT_SLOT_ID,
	RECORD_OPERATIONS_TEXT_SLOT_ID,
] as const;

/** What one compartment argument asks for: omitted keeps, null removes, a value writes. */
type RecordCompartmentArg = string | string[] | null | undefined;

/** How a call left one slot, as the result reports it. */
type RecordSlotChange = "added" | "replaced" | "removed";

/** The rows argument of one compartment; the wording differs only in what the rows are. */
const createRowsSchema = (rowKind: string) =>
	z
		.array(z.string())
		.nullable()
		.optional()
		.describe(
			`${rowKind}, one array entry per drawn row, replacing the compartment's rows wholesale; an entry must not contain a newline. [] keeps an empty compartment drawn, null removes the compartment, omit to leave it as it is.`,
		);

/** Refuses a row that would read as two: the record draws one entry per row. */
const requireSingleLineRows = (
	slotId: RecordTextSlotId,
	rows: readonly string[],
): void => {
	const multiLineIndex = rows.findIndex((row) => row.includes("\n"));
	if (multiLineIndex !== -1) {
		throw new Error(
			`${slotId}[${multiLineIndex}] contains a newline: give each row as its own array entry`,
		);
	}
};

/**
 * The slot as it stands after the argument: an existing slot keeps its
 * typography and takes the new content, a new one starts from the type's
 * per-slot defaults (the same values a freshly created record spells out).
 */
const resolveTextSlot = (
	slotId: RecordTextSlotId,
	currentSlot: TextSlot | undefined,
	arg: RecordCompartmentArg,
): TextSlot | undefined => {
	if (arg === undefined) {
		return currentSlot;
	}
	if (arg === null) {
		return undefined;
	}
	if (currentSlot !== undefined) {
		return { ...currentSlot, text: arg };
	}
	return { text: arg, ...RECORD_TEXT_SLOT_STYLE_DEFAULTS_BY_ID[slotId] };
};

/**
 * Whether two slots hold the same content in the same typography. Compared as
 * written, so rows held as styled runs differ from the same characters as plain
 * strings — writing those back would drop the runs' styling.
 */
const isSameTextSlot = (
	slotA: TextSlot | undefined,
	slotB: TextSlot | undefined,
): boolean => JSON.stringify(slotA) === JSON.stringify(slotB);

/** How the call left a slot, or null where it stands as it did. */
const classifySlotChange = (
	currentSlot: TextSlot | undefined,
	nextSlot: TextSlot | undefined,
): RecordSlotChange | null => {
	if (isSameTextSlot(currentSlot, nextSlot)) {
		return null;
	}
	if (currentSlot === undefined) {
		return "added";
	}
	return nextSlot === undefined ? "removed" : "replaced";
};

/** One compartment in the result: a band by its name, a row compartment with its row count. */
const describeCompartment = (
	slotId: RecordTextSlotId,
	slot: TextSlot | undefined,
): string => {
	if (!isRecordListTextSlotId(slotId) || !Array.isArray(slot?.text)) {
		return slotId;
	}
	const rowCount = slot.text.length;
	if (rowCount === 0) {
		return `${slotId} (empty)`;
	}
	return `${slotId} (${rowCount} row${rowCount === 1 ? "" : "s"})`;
};

/** The changes a call made, as the result opens with them: `: added operations, removed stereotype;`. */
const describeSlotChanges = (
	changes: ReadonlyMap<RecordTextSlotId, RecordSlotChange>,
): string => {
	if (changes.size === 0) {
		return "";
	}
	const changeList = [...changes]
		.map(([slotId, change]) => `${change} ${slotId}`)
		.join(", ");
	return `: ${changeList};`;
};

/** The height in the result: where it went from and to, or that it already fitted. */
const describeHeightChange = (
	currentHeight: number,
	nextHeight: number,
): string =>
	currentHeight === nextHeight
		? `height ${nextHeight} (unchanged)`
		: `height ${currentHeight} → ${nextHeight}`;

/**
 * record_set_compartments: which compartments a record has and what they hold,
 * with the height refitted to them.
 */
export const recordSetCompartmentsTool = defineObjectAiTool({
	name: "record_set_compartments",
	description: [
		"Set which compartments a record (a UML class / interface / ER entity box) has and what they hold: the stereotype line above the name, the attribute rows and the operation rows.",
		"The generic set_text writes only a compartment the record already has and cannot remove one, so this is how a class gains its operations, an interface its stereotype, or a DTO loses its attributes.",
		"A compartment that already exists keeps its typography; a new one starts with the record's defaults. Rename the record with set_text on its name slot.",
		"The record does not grow with its rows, so afterwards its height is set to exactly what the compartments need, taller or shorter, its top edge staying where it is — no resize_object is needed. Called with no compartment at all, it only refits the height.",
	].join(" "),
	objectType: "record",
	inputSchema: {
		stereotype: z
			.string()
			.nullable()
			.optional()
			.describe(
				'Stereotype line above the name, written as drawn ("<<interface>>"). "" keeps an empty band, null removes the band, omit to leave it as it is.',
			),
		attributes: createRowsSchema(
			'Attribute rows (fields, properties, ER columns, e.g. "- id: string")',
		),
		operations: createRowsSchema(
			'Operation rows (methods, e.g. "+ save(): void")',
		),
	},
	apply: (record: RecordDoc, args) => {
		for (const slotId of RECORD_COMPARTMENT_ARG_IDS) {
			const arg: RecordCompartmentArg = args[slotId];
			if (Array.isArray(arg)) {
				requireSingleLineRows(slotId, arg);
			}
		}

		// An absent `text` is a title-only box with an empty title, spelled out here
		// because a record that writes `text` has to write its name.
		const currentText: Partial<Record<RecordTextSlotId, TextSlot>> =
			record.text ?? {
				name: {
					text: "",
					...RECORD_TEXT_SLOT_STYLE_DEFAULTS_BY_ID[RECORD_NAME_TEXT_SLOT_ID],
				},
			};
		const nextText: Partial<Record<RecordTextSlotId, TextSlot>> = {};
		const changes = new Map<RecordTextSlotId, RecordSlotChange>();
		for (const slotId of RECORD_TEXT_SLOT_IDS) {
			const currentSlot = currentText[slotId];
			const nextSlot =
				slotId === RECORD_NAME_TEXT_SLOT_ID
					? currentSlot
					: resolveTextSlot(slotId, currentSlot, args[slotId]);
			if (nextSlot !== undefined) {
				nextText[slotId] = nextSlot;
			}
			const change = classifySlotChange(record.text?.[slotId], nextSlot);
			if (change !== null && slotId !== RECORD_NAME_TEXT_SLOT_ID) {
				changes.set(slotId, change);
			}
		}

		const contentHeight = calcRecordContentHeight({
			width: record.width,
			text: nextText as Record<string, TextSlot>,
		});
		const presentSlotIds = listRecordPresentTextSlotIds(
			nextText as Record<string, TextSlot>,
		);
		const compartmentsText = presentSlotIds
			.map((slotId) => describeCompartment(slotId, nextText[slotId]))
			.join(", ");
		// Refused rather than written back unchanged, which would leave an undo step
		// that takes back nothing
		if (changes.size === 0 && contentHeight === record.height) {
			throw new Error(
				`record "${record.id}" already has ${compartmentsText} and height ${record.height}, which fits them; nothing was changed`,
			);
		}

		return {
			doc: {
				...record,
				...calcRecordDocFrameAtHeight(record, contentHeight),
				text: nextText as RecordTextDoc,
			},
			text: `record "${record.id}"${describeSlotChanges(changes)} now has ${compartmentsText}; ${describeHeightChange(record.height, contentHeight)}`,
		};
	},
});

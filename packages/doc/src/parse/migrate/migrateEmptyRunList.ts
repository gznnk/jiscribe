import { isArray, isObject } from "@jiscribe/basic-validators";

import type { ObjectMigration, ObjectMigrationResult } from "./ObjectMigration";
import { isSingleBodyText } from "../../model/objects/types/text/TextType";
import type { SemanticDiagnostic } from "../../model/types/SemanticDiagnostic";
import type { ObjectTreeNode } from "../utils/mapObjectTree";

/** An empty text written as the runs it is styled in — `[]` where `""` is meant. */
const isEmptyRunList = (value: unknown): boolean =>
	isArray(value) && value.length === 0;

/** What the file says, told apart from what the rewrite does with it. */
const EMPTY_RUN_LIST_CAUSE = "text was an empty list of runs";

const droppedFieldWarning = (path: string): SemanticDiagnostic => ({
	path,
	message: `${EMPTY_RUN_LIST_CAUSE}: it is read as an empty text and the field is dropped on save.`,
	severity: "warning",
});

const emptiedRowWarning = (path: string): SemanticDiagnostic => ({
	path,
	message: `${EMPTY_RUN_LIST_CAUSE}: it is read as an empty text and rewritten as "" on save.`,
	severity: "warning",
});

/**
 * The single body: the whole field goes, an absent text being how the canvas
 * writes an empty one.
 */
const migrateSingleBody = (
	node: ObjectTreeNode,
	path: string,
): ObjectMigrationResult => {
	if (!isEmptyRunList(node.text)) {
		return { node, warnings: [] };
	}
	const { text: _emptied, ...withoutText } = node;
	return { node: withoutText, warnings: [droppedFieldWarning(`${path}.text`)] };
};

/**
 * The named slots: only a row of a slot's row list can be the empty run list, so
 * the field itself stays. A slot whose own `text` is `[]` is not touched — that is
 * the empty row list a row-partitioned slot holds (isTextRows), and whether the
 * slot may hold rows at all is the type's own validator's to say.
 */
const migrateTextSlots = (
	node: ObjectTreeNode,
	path: string,
): ObjectMigrationResult => {
	if (!isObject(node.text)) {
		return { node, warnings: [] };
	}
	const slots = node.text;
	const warnings: SemanticDiagnostic[] = [];
	let migratedSlots: Record<string, unknown> | undefined;
	Object.entries(slots).forEach(([slotId, slot]) => {
		if (!isObject(slot) || !isArray(slot.text)) {
			return;
		}
		const rows = slot.text;
		let migratedRows: unknown[] | undefined;
		rows.forEach((row, index) => {
			if (!isEmptyRunList(row)) {
				return;
			}
			migratedRows = migratedRows ?? [...rows];
			migratedRows[index] = "";
			warnings.push(emptiedRowWarning(`${path}.text.${slotId}.text[${index}]`));
		});
		if (migratedRows === undefined) {
			return;
		}
		migratedSlots = migratedSlots ?? { ...slots };
		migratedSlots[slotId] = { ...slot, text: migratedRows };
	});
	if (migratedSlots === undefined) {
		return { node, warnings: [] };
	}
	return { node: { ...node, text: migratedSlots }, warnings };
};

/**
 * A text written as `[]`, from before an empty run list was rejected
 * (validateRichTextContent): read as the empty text it stands for. The canonical
 * empty differs by where the text sits — an absent field for a body, `""` for one
 * row of a slot — so each form is rewritten to its own.
 */
export const migrateEmptyRunList: ObjectMigration = (node, path, features) => {
	if (isSingleBodyText(features.text)) {
		return migrateSingleBody(node, path);
	}
	if (features.text === "slots") {
		return migrateTextSlots(node, path);
	}
	return { node, warnings: [] };
};

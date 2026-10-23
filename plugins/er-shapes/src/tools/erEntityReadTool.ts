import { defineObjectAiTool } from "@jiscribe/canvas-sdk/tools";

import {
	describeErEntityText,
	ER_ENTITY_ADDRESSING_NOTE,
	formatErEntityColumnCount,
} from "./erEntityToolText";
import { calcErEntityLayout } from "../layout/calcErEntityLayout";
import type { ErEntityLayout } from "../layout/calcErEntityLayout";
import { readErEntityDocLayoutInput } from "../layout/readErEntityLayoutSource";
import { ER_ENTITY_SLOT_WIDTH_KEYS } from "../schema/ErEntityDoc";
import type { ErEntityDoc } from "../schema/ErEntityDoc";

/** One slot width as the listing writes it: stated (or how it is decided when not), then drawn. */
const describeSlotWidth = (
	entity: ErEntityDoc,
	layout: ErEntityLayout,
	widthKey: (typeof ER_ENTITY_SLOT_WIDTH_KEYS)[number],
): string => {
	const statedWidth = entity[widthKey];
	const unsetText =
		widthKey === "keyWidth" ? "unset (widest key)" : "unset (default)";
	const statedText =
		statedWidth !== undefined ? String(statedWidth) : unsetText;
	return `${widthKey} ${statedText}, drawn ${layout[widthKey]}`;
};

/** The listing er_entity_read answers with. */
const formatErEntityListing = (entity: ErEntityDoc): string => {
	const layout = calcErEntityLayout(readErEntityDocLayoutInput(entity));
	const columnCount = entity.columns.length;
	const indexRangeText =
		columnCount === 0 ? "" : ` (0-${columnCount - 1}), each key | name | type`;
	const columnLines = entity.columns.map(
		(column, columnIndex) =>
			`col ${columnIndex}: ${[
				describeErEntityText(column.key, "(no key)"),
				describeErEntityText(column.name, ""),
				describeErEntityText(column.type, "(no type)"),
			].join(" | ")}`,
	);
	return [
		`erEntity "${entity.id}": title ${describeErEntityText(entity.name, "")}`,
		`slot widths in px (stated, drawn): ${ER_ENTITY_SLOT_WIDTH_KEYS.map((widthKey) => describeSlotWidth(entity, layout, widthKey)).join("; ")}; box ${layout.width} x ${layout.height}`,
		`${formatErEntityColumnCount(columnCount)}${indexRangeText}${columnCount === 0 ? "" : ":"}`,
		...columnLines,
		'A relationship line attaches to column <index> through the connect point "col:<index>:left" or "col:<index>:right": pass it as sourceAnchor / targetAnchor to connect or update_connector.',
	].join("\n");
};

/** er_entity_read: the title, slot widths and every column of an entity, without writing anything. */
export const erEntityReadTool = defineObjectAiTool({
	name: "er_entity_read",
	description: [
		"Read an ER entity: its title, the stated and drawn widths of the key / name / type slots, and every column as key | name | type, a styled text followed by what it sets in {}.",
		"Call it before editing an entity you did not just build, to know its columns and their indices.",
		ER_ENTITY_ADDRESSING_NOTE,
	].join(" "),
	objectType: "erEntity",
	inputSchema: {},
	read: (entity: ErEntityDoc) => formatErEntityListing(entity),
});

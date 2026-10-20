import type { TableAxis } from "../../grid/tableTrack";

/**
 * The axis a trailing-edge strip's `data-action` names, or null when it names
 * none. The one control carries both edges, each appending the axis whose last
 * track it resizes (`selection:table:trailingEdge:column`), which comes back as
 * `SelectionControlEvent.subAction`.
 *
 * @param subAction - The `data-action` segment after `selection:table:<name>:`, or undefined when the handle carries none
 * @returns `"column"` for the edge across the table's last column, `"row"` for the one across its last row
 */
export const parseTableTrailingEdgeAxis = (
	subAction: string | undefined,
): TableAxis | null =>
	subAction === "row" || subAction === "column" ? subAction : null;

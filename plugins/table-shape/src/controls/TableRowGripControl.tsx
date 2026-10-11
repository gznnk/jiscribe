import type { SelectionControlProps } from "@jiscribe/canvas";
import { memo } from "react";

import { TableTrackGrips } from "./TableTrackGrips";
import type { TableState } from "../state/TableState";

/**
 * The grips for whole rows: one bar per row, down the outside of the table's left
 * edge. Clicking one selects that row as a `"row"` part
 * (createTableTrackGripHandler), which is what Delete then removes.
 */
const TableRowGripControlComponent: React.FC<
	SelectionControlProps<TableState>
> = (props) => <TableTrackGrips {...props} axis="row" />;

export const TableRowGripControl = memo(TableRowGripControlComponent);

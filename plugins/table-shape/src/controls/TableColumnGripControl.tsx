import type { SelectionControlProps } from "@jiscribe/canvas";
import { memo } from "react";

import { TableTrackGrips } from "./TableTrackGrips";
import type { TableState } from "../state/TableState";

/**
 * The grips for whole columns: one bar per column, across the outside of the
 * table's top edge. Clicking one selects that column as a `"column"` part
 * (createTableTrackGripHandler), which is what Delete then removes.
 */
const TableColumnGripControlComponent: React.FC<
	SelectionControlProps<TableState>
> = (props) => <TableTrackGrips {...props} axis="column" />;

export const TableColumnGripControl = memo(TableColumnGripControlComponent);

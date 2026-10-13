import type { SelectionControlProps } from "@jiscribe/canvas";
import { memo } from "react";

import { TableInsertBadges } from "./TableInsertBadges";
import type { TableState } from "../state/TableState";

/**
 * The `+` buttons for rows: one right of every horizontal rule and one right of
 * each of the table's own top and bottom edges. Clicking one inserts a row there
 * (createTableInsertHandler).
 */
const TableRowInsertControlComponent: React.FC<
	SelectionControlProps<TableState>
> = (props) => <TableInsertBadges {...props} axis="row" />;

export const TableRowInsertControl = memo(TableRowInsertControlComponent);

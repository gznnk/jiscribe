import type { SelectionControlProps } from "@jiscribe/canvas";
import { memo } from "react";

import { TableInsertBadges } from "./TableInsertBadges";
import type { TableState } from "../state/TableState";

/**
 * The `+` buttons for columns: one above every vertical rule and one above each
 * of the table's own left and right edges. Clicking one inserts a column there
 * (createTableInsertHandler).
 */
const TableColumnInsertControlComponent: React.FC<
	SelectionControlProps<TableState>
> = (props) => <TableInsertBadges {...props} axis="column" />;

export const TableColumnInsertControl = memo(TableColumnInsertControlComponent);

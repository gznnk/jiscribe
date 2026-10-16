import { resizeTableFromDrawnCorner } from "./resizeTableFromDrawnCorner";
import type { TableState } from "./TableState";
import { calcTableFrameSize } from "../layout/calcTableFrameSize";

/**
 * The table with its box re-derived from its grid, grown or shrunk from the corner
 * it is drawn from. What every grid operation on a state ends with: the box is
 * derived here rather than left to the type's `contentResizer`, because that resizer
 * reads a width the columns do not sum to as an outer resize and would squeeze a new
 * column back out of the table (see reconcileTableBoxWithGrid). The box having
 * already been set from the drawn corner, the pass the reducer runs next finds the
 * two agreeing and returns the state untouched.
 *
 * @param table - A table whose grid has just been rewritten but whose box is still the one it is drawn at, since the kept corner is read off that box
 * @returns A new state whose box matches the grid
 */
export const fitTableBoxToGrid = (table: TableState): TableState =>
	resizeTableFromDrawnCorner(table, calcTableFrameSize(table));

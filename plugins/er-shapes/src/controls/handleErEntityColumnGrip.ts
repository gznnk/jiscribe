import { createErEntityGripHandler } from "./createErEntityGripHandler";
import { ER_ENTITY_COLUMN_PART_KIND } from "../parts/erEntityColumnPartKind";
import {
	erEntityColumnPartId,
	parseErEntityColumnPartId,
	countErEntityColumns,
} from "../schema/erEntityColumnIds";

/**
 * A row grip's click: picks the whole column as an `"erEntityColumn"` part, or
 * with Shift or Ctrl / Meta extends or toggles a column pick
 * (createErEntityGripHandler). A Shift range runs over the rows between its ends
 * (ER_ENTITY_COLUMN_PART_DEFINITION's `list`); Delete then removes the picked
 * columns and Enter opens the active one's name.
 */
export const handleErEntityColumnGrip = createErEntityGripHandler({
	kind: ER_ENTITY_COLUMN_PART_KIND,
	toPartId: erEntityColumnPartId,
	parseIndex: parseErEntityColumnPartId,
	count: (object) => countErEntityColumns(object.text),
});

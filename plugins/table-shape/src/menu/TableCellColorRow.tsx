import type { PropertyPanelItemProps } from "@jiscribe/canvas";
import {
	isMixedSelectionValue,
	PropertyColorField,
	PropertyRow,
	selectionMixedValues,
	selectionValueOr,
	setPart,
} from "@jiscribe/canvas-sdk";
import { memo } from "react";

import { NoFillButton, NoFillRow } from "./TableCellColorMenuStyled";
import { useTableCellFill } from "./useTableCellFill";
import { useTableStrings } from "../messages/useTableStrings";
import { TABLE_CELL_FILL_PROPERTY } from "../schema/TableDoc";

/**
 * What the sidebar swatch is painted with for a cell carrying no background:
 * the checker PropertyColorSwatchBox draws for `transparent`, which says the
 * absence of a color where an opaque swatch would claim one.
 */
const UNFILLED_SWATCH = "transparent";

/**
 * Cell background in the properties sidebar — the same write as the floating
 * menu's {@link TableCellColorMenu}, drawn the way the sidebar's own color rows
 * are: a labelled row whose trigger states what the addressed cells carry and
 * opens the shared palette.
 *
 * Both controls read through {@link useTableCellFill} and write the same
 * `cellFill` property through the same `set:` grammar, so neither can address
 * cells the other does not: the picked cells — a picked row or column being its
 * own cells — else every cell of the table.
 *
 * The palette has no swatch for the absence of a color, so the button that takes
 * the background off again is passed as the field's `footer`, under the grid,
 * exactly as in the floating menu (see TABLE_EXTRA_STYLE_PROPERTIES for why an
 * empty value is what drops the field).
 */
const TableCellColorRowComponent: React.FC<PropertyPanelItemProps> = ({
	objects,
	selection,
	onPropertyUpdate,
}) => {
	const strings = useTableStrings();
	const cellFill = useTableCellFill({ objects, selection });
	const isMixed = isMixedSelectionValue(cellFill);
	const sharedFill = selectionValueOr(cellFill, undefined);
	const isNoFill = !isMixed && sharedFill === undefined;

	return (
		<PropertyRow label={strings.menuCellColor}>
			<PropertyColorField
				value={sharedFill ?? UNFILLED_SWATCH}
				mixedValues={selectionMixedValues(cellFill)?.map(
					(fill) => fill ?? UNFILLED_SWATCH,
				)}
				// Stated only while every addressed cell is unfilled; a stored color —
				// `"auto"` included — is the field's own business to word.
				unsetLabel={isNoFill ? strings.cellColorNone : undefined}
				// Not mixed means every cell the write would reach was read, so a pick
				// of the color they already carry is provably no change.
				currentColorIsShared={!isMixed}
				property={TABLE_CELL_FILL_PROPERTY}
				role="surface"
				title={strings.menuCellColor}
				onPropertyUpdate={onPropertyUpdate}
				footer={
					<NoFillRow>
						<NoFillButton
							type="button"
							selected={isNoFill}
							data-part={setPart(TABLE_CELL_FILL_PROPERTY, "")}
							// Already unfilled: the write would rebuild the same cells and
							// record a history entry that changes nothing, dropping the redo
							// stack with it (the grid drops a no-change pick the same way).
							data-gesture={isNoFill ? "none" : undefined}
							title={strings.cellColorNone}
						>
							{strings.cellColorNone}
						</NoFillButton>
					</NoFillRow>
				}
			/>
		</PropertyRow>
	);
};

export const TableCellColorRow = memo(TableCellColorRowComponent);

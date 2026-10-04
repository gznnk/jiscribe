import type { ObjectMenuItemProps } from "@jiscribe/canvas";
import {
	ColorPreviewIcon,
	isMixedSelectionValue,
	ObjectMenuButton,
	ObjectMenuColorPickerGrid,
	ObjectMenuDropdownPanel,
	ObjectMenuItemPositioner,
	selectionMixedValues,
	selectionValueOr,
	setPart,
	togglePart,
	useSubmenuPosition,
} from "@jiscribe/canvas-sdk";
import { memo, useRef } from "react";

import { NoFillButton, NoFillRow } from "./TableCellColorMenuStyled";
import { useTableCellFill } from "./useTableCellFill";
import { useTableStrings } from "../messages/useTableStrings";
import { resolveCellPaint } from "../presentation/resolveCellPaint";
import { TABLE_CELL_FILL_PROPERTY } from "../schema/TableDoc";

const SECTION_ID = "table-cell-color";

/**
 * Cell background menu (table only). Sets `cellFill` on the cells picked below
 * the table — a picked row or column being its own cells (tableTrackParts) — or
 * on every cell when the table alone is selected. Those are the targets the
 * write itself takes, which is why the swatch can be read off them
 * ({@link useTableCellFill}, shared with the sidebar's row so the two surfaces
 * cannot read different cells): cells that disagree draw the button's circle
 * split between their colors and highlight no swatch in the grid.
 *
 * The shared grid is used rather than a palette of this plugin's own (as sticky
 * has): a cell's background is an ordinary background color, and the grid is what
 * carries the 28 presets, the CSS text field and the theme-following "Auto".
 * What it has no swatch for is the absence of a color, so the button under it
 * writes the property empty — which drops the field (see
 * TABLE_EXTRA_STYLE_PROPERTIES) and leaves the cells showing what the table is
 * drawn over. The grid's own `transparent` swatch is a color still: it stores a
 * value that paints nothing.
 */
const TableCellColorMenuComponent: React.FC<ObjectMenuItemProps> = ({
	objects,
	selection,
	openSectionId,
	onPropertyUpdate,
}) => {
	const strings = useTableStrings();
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = openSectionId === SECTION_ID;
	const cellFill = useTableCellFill({ objects, selection });
	const isMixed = isMixedSelectionValue(cellFill);
	const sharedFill = selectionValueOr(cellFill, undefined);
	const isNoFill = !isMixed && sharedFill === undefined;
	const { submenuRef, placement, offsetX } = useSubmenuPosition(
		menuItemRef,
		isOpen,
	);

	return (
		<ObjectMenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-part={togglePart(SECTION_ID)}
				title={strings.menuCellColor}
			>
				<ColorPreviewIcon
					color={resolveCellPaint(sharedFill)}
					mixedColors={selectionMixedValues(cellFill)?.map(resolveCellPaint)}
					title={strings.menuCellColor}
				/>
			</ObjectMenuButton>
			{isOpen && (
				<ObjectMenuDropdownPanel
					ref={submenuRef}
					placement={placement}
					offsetX={offsetX}
				>
					<ObjectMenuColorPickerGrid
						// Empty leaves every swatch unselected, which is what both the
						// disagreeing cells and the unfilled ones state.
						currentColor={isMixed || sharedFill === undefined ? "" : sharedFill}
						// Not mixed means every cell the write would reach was read, so a
						// pick of the color they already carry is provably no change.
						currentColorIsShared={!isMixed}
						property={TABLE_CELL_FILL_PROPERTY}
						onPropertyUpdate={onPropertyUpdate}
					/>
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
				</ObjectMenuDropdownPanel>
			)}
		</ObjectMenuItemPositioner>
	);
};

export const TableCellColorMenu = memo(TableCellColorMenuComponent);

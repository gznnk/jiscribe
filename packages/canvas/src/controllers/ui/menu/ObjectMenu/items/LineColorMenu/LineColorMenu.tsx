import { SHAPE_STYLE_FALLBACK } from "@jiscribe/doc/model/objects/utils/shapeStyleFallback";
import { memo, useRef } from "react";

import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
import { getEffectiveSelectedIds } from "../../../../../../controllers/utils/getEffectiveSelectedIds";
import { resolveAutoColor } from "../../../../../../rendering/objects/utils/resolveAutoColor";
import { togglePart } from "../../../../../gestures/handlers/menu/utils/menuParts";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { useCanvasRegistries } from "../../../../../registries/CanvasRegistriesContext";
import { ColorPreviewIcon } from "../../../../icons/ColorPreviewIcon";
import { readSelectionShapeStyle } from "../../../utils/readSelectionShapeStyle";
import {
	isMixedSelectionValue,
	selectionMixedValues,
	selectionValueOr,
} from "../../../utils/SelectionValue";
import { ObjectMenuColorPickerGrid } from "../../common/ObjectMenuColorPickerGrid/ObjectMenuColorPickerGrid";
import { ObjectMenuDropdownPanel } from "../../common/ObjectMenuDropdownPanel";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import {
	ObjectMenuButton,
	ObjectMenuItemPositioner,
} from "../../ObjectMenuStyled";
import type { StylePropertyUpdater } from "../../ObjectMenuTypes";

const SECTION_ID = "line-color";

type LineColorMenuProps = {
	canvasState: CanvasControllerState;
	onPropertyUpdate: StylePropertyUpdater;
};

/**
 * Line color menu (for polyline / connector).
 * Uses a filled-circle icon.
 */
const LineColorMenuComponent: React.FC<LineColorMenuProps> = ({
	canvasState,
	onPropertyUpdate,
}) => {
	const messages = useCanvasMessages();
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = canvasState.objectMenuOpenId === SECTION_ID;
	const { objectShapeStyleDefaults } = useCanvasRegistries();
	const { stroke } = readSelectionShapeStyle(
		getEffectiveSelectedIds(canvasState),
		canvasState.objects,
		objectShapeStyleDefaults,
		"stroke",
	);
	const isMixed = isMixedSelectionValue(stroke);
	const currentColor = selectionValueOr(stroke, SHAPE_STYLE_FALLBACK.stroke);
	const { submenuRef, placement, offsetX } = useSubmenuPosition(
		menuItemRef,
		isOpen,
	);

	return (
		<ObjectMenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-kind="menu"
				data-id="object-menu"
				data-part={togglePart(SECTION_ID)}
				title={messages.menuLineColor}
			>
				<ColorPreviewIcon
					color={resolveAutoColor(currentColor, "ink")}
					mixedColors={selectionMixedValues(stroke)?.map((mixedColor) =>
						resolveAutoColor(mixedColor, "ink"),
					)}
					title={messages.menuLineColor}
				/>
			</ObjectMenuButton>
			{isOpen && (
				<ObjectMenuDropdownPanel
					ref={submenuRef}
					placement={placement}
					offsetX={offsetX}
				>
					<ObjectMenuColorPickerGrid
						currentColor={isMixed ? "" : currentColor}
						// Not mixed means every object of the selection was read, the
						// descendants of a selected group included.
						currentColorIsShared={!isMixed}
						property="stroke"
						onPropertyUpdate={onPropertyUpdate}
					/>
				</ObjectMenuDropdownPanel>
			)}
		</ObjectMenuItemPositioner>
	);
};

export const LineColorMenu = memo(LineColorMenuComponent);

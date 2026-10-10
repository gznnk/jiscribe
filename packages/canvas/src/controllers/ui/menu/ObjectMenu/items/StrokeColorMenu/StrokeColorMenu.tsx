import { SHAPE_STYLE_FALLBACK } from "@jiscribe/doc/model/objects/utils/shapeStyleFallback";
import { memo, useRef } from "react";

import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
import { resolveAutoColor } from "../../../../../../rendering/objects/utils/resolveAutoColor";
import { toggleAction } from "../../../../../gestures/handlers/menu/utils/menuActions";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { useSelectionStyle } from "../../../../../style/SelectionStyleReaderContext";
import {
	isMixedSelectionValue,
	selectionMixedValues,
	selectionValueOr,
} from "../../../../../style/SelectionValue";
import { BorderColorIcon } from "../../../../icons/BorderColorIcon";
import { ObjectMenuColorPickerGrid } from "../../common/ObjectMenuColorPickerGrid/ObjectMenuColorPickerGrid";
import { ObjectMenuDropdownPanel } from "../../common/ObjectMenuDropdownPanel";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import {
	ObjectMenuButton,
	ObjectMenuItemPositioner,
} from "../../ObjectMenuStyled";
import type { StyleIntentUpdater } from "../../ObjectMenuTypes";

const SECTION_ID = "stroke-color";

type StrokeColorMenuProps = {
	canvasState: CanvasControllerState;
	onStyleIntent: StyleIntentUpdater;
};

/**
 * Stroke color menu.
 * Changes the stroke property of the selected object via a color picker.
 */
const StrokeColorMenuComponent: React.FC<StrokeColorMenuProps> = ({
	canvasState,
	onStyleIntent,
}) => {
	const messages = useCanvasMessages();
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = canvasState.objectMenuOpenId === SECTION_ID;
	const stroke = useSelectionStyle("stroke");
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
				data-action={toggleAction(SECTION_ID)}
				title={messages.menuStrokeColor}
			>
				<BorderColorIcon
					color={resolveAutoColor(currentColor, "ink")}
					mixedColors={selectionMixedValues(stroke)?.map((mixedColor) =>
						resolveAutoColor(mixedColor, "ink"),
					)}
					title={messages.menuStrokeColor}
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
						onStyleIntent={onStyleIntent}
					/>
				</ObjectMenuDropdownPanel>
			)}
		</ObjectMenuItemPositioner>
	);
};

export const StrokeColorMenu = memo(StrokeColorMenuComponent);

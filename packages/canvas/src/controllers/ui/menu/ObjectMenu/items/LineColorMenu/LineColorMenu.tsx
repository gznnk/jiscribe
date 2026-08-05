import { memo, useRef } from "react";

import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
import { getEffectiveSelectedIds } from "../../../../../../controllers/utils/getEffectiveSelectedIds";
import { resolveAutoColor } from "../../../../../../presentations/objects/utils/resolveAutoColor";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { ColorPreviewIcon } from "../../../../icons/ColorPreviewIcon";
import { ObjectMenuColorPickerGrid } from "../../common/ObjectMenuColorPickerGrid/ObjectMenuColorPickerGrid";
import { ObjectMenuDropdownPanel } from "../../common/ObjectMenuDropdownPanel";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import {
	ObjectMenuButton,
	ObjectMenuItemPositioner,
} from "../../ObjectMenuStyled";
import type { ObjectMenuPropertyUpdater } from "../../ObjectMenuTypes";
import { getFirstSelectedWithProp } from "../../utils/getFirstSelectedWithProp";

const SECTION_ID = "line-color";

type LineColorMenuProps = {
	canvasState: CanvasControllerState;
	onPropertyUpdate: ObjectMenuPropertyUpdater;
};

const getSelectedStrokeColor = (state: CanvasControllerState): string => {
	const obj = getFirstSelectedWithProp(
		getEffectiveSelectedIds(state),
		state.objects,
		"stroke",
	);
	const stroke = (obj as Record<string, unknown>)?.stroke;
	return typeof stroke === "string" ? stroke : "#374151";
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
	const currentColor = getSelectedStrokeColor(canvasState);
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
				data-part={`toggle:${SECTION_ID}`}
				title={messages.menuLineColor}
			>
				<ColorPreviewIcon
					color={resolveAutoColor(currentColor, "ink")}
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
						currentColor={currentColor}
						property="stroke"
						onPropertyUpdate={onPropertyUpdate}
					/>
				</ObjectMenuDropdownPanel>
			)}
		</ObjectMenuItemPositioner>
	);
};

export const LineColorMenu = memo(LineColorMenuComponent);

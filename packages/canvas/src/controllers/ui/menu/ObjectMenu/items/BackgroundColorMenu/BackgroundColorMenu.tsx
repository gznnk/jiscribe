import { SHAPE_STYLE_FALLBACK } from "@jiscribe/doc/model/objects/utils/shapeStyleFallback";
import { memo, useRef } from "react";

import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
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

const SECTION_ID = "bg-color";

type BackgroundColorMenuProps = {
	canvasState: CanvasControllerState;
	onPropertyUpdate: StylePropertyUpdater;
};

/**
 * Background color menu.
 * Changes the fill property of the selected object via a color picker.
 */
const BackgroundColorMenuComponent: React.FC<BackgroundColorMenuProps> = ({
	canvasState,
	onPropertyUpdate,
}) => {
	const messages = useCanvasMessages();
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = canvasState.objectMenuOpenId === SECTION_ID;
	const { objectShapeStyleDefaults } = useCanvasRegistries();
	const { fill } = readSelectionShapeStyle(
		canvasState.selectedIds,
		canvasState.objects,
		objectShapeStyleDefaults,
		"fill",
	);
	const isMixed = isMixedSelectionValue(fill);
	const currentColor = selectionValueOr(fill, SHAPE_STYLE_FALLBACK.fill);
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
				title={messages.menuBackgroundColor}
			>
				<ColorPreviewIcon
					color={resolveAutoColor(currentColor, "surface")}
					mixedColors={selectionMixedValues(fill)?.map((mixedColor) =>
						resolveAutoColor(mixedColor, "surface"),
					)}
					title={messages.menuBackgroundColor}
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
						property="fill"
						onPropertyUpdate={onPropertyUpdate}
					/>
				</ObjectMenuDropdownPanel>
			)}
		</ObjectMenuItemPositioner>
	);
};

export const BackgroundColorMenu = memo(BackgroundColorMenuComponent);

import { SHAPE_STYLE_FALLBACK } from "@jiscribe/doc/model/objects/utils/shapeStyleFallback";
import type { ObjectShapeStyleDefaultsRegistry } from "@jiscribe/doc/plugin/ObjectShapeStyleDefaultsRegistry";
import { memo, useRef } from "react";

import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
import { resolveAutoColor } from "../../../../../../rendering/objects/utils/resolveAutoColor";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { useCanvasRegistries } from "../../../../../registries/CanvasRegistriesContext";
import { ColorPreviewIcon } from "../../../../icons/ColorPreviewIcon";
import { ObjectMenuColorPickerGrid } from "../../common/ObjectMenuColorPickerGrid/ObjectMenuColorPickerGrid";
import { ObjectMenuDropdownPanel } from "../../common/ObjectMenuDropdownPanel";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import {
	ObjectMenuButton,
	ObjectMenuItemPositioner,
} from "../../ObjectMenuStyled";
import type { ObjectMenuPropertyUpdater } from "../../ObjectMenuTypes";
import { getFirstSelectedWithFeature } from "../../utils/getFirstSelectedWithFeature";

const SECTION_ID = "bg-color";

type BackgroundColorMenuProps = {
	canvasState: CanvasControllerState;
	onPropertyUpdate: ObjectMenuPropertyUpdater;
};

/**
 * The fill the menu shows: the selected object's own, resolved through its
 * type's own defaults (ObjectShapeStyleDefaultsRegistry) so the swatch matches
 * the face the shape draws. The object is found by its declared fill, so one
 * whose document never wrote the field still shows its type's answer.
 */
const getSelectedFillColor = (
	state: CanvasControllerState,
	shapeStyleDefaults: ObjectShapeStyleDefaultsRegistry,
): string => {
	const selected = getFirstSelectedWithFeature(
		state.selectedIds,
		state.objects,
		"fill",
	);
	if (selected === undefined) {
		return SHAPE_STYLE_FALLBACK.fill;
	}
	const ownFill = (selected as Record<string, unknown>).fill;
	return shapeStyleDefaults.resolveShapeStyle(selected.type, {
		fill: typeof ownFill === "string" ? ownFill : undefined,
	}).fill;
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
	const currentColor = getSelectedFillColor(
		canvasState,
		objectShapeStyleDefaults,
	);
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
				title={messages.menuBackgroundColor}
			>
				<ColorPreviewIcon
					color={resolveAutoColor(currentColor, "surface")}
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
						currentColor={currentColor}
						property="fill"
						onPropertyUpdate={onPropertyUpdate}
					/>
				</ObjectMenuDropdownPanel>
			)}
		</ObjectMenuItemPositioner>
	);
};

export const BackgroundColorMenu = memo(BackgroundColorMenuComponent);

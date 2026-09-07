import { SHAPE_STYLE_FALLBACK } from "@jiscribe/doc/model/objects/utils/shapeStyleFallback";
import type { ObjectShapeStyleDefaultsRegistry } from "@jiscribe/doc/plugin/ObjectShapeStyleDefaultsRegistry";
import { memo, useRef } from "react";

import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
import { getEffectiveSelectedIds } from "../../../../../../controllers/utils/getEffectiveSelectedIds";
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

const SECTION_ID = "line-color";

type LineColorMenuProps = {
	canvasState: CanvasControllerState;
	onPropertyUpdate: ObjectMenuPropertyUpdater;
};

/**
 * The stroke color the menu shows — the selection's, or the connector's when one
 * is selected — resolved through the object type's own defaults
 * (ObjectShapeStyleDefaultsRegistry) so the swatch matches the line drawn. The
 * object is found by its declared stroke, so one whose document never wrote the
 * field still shows its type's answer.
 */
const getSelectedStrokeColor = (
	state: CanvasControllerState,
	shapeStyleDefaults: ObjectShapeStyleDefaultsRegistry,
): string => {
	const selected = getFirstSelectedWithFeature(
		getEffectiveSelectedIds(state),
		state.objects,
		"stroke",
	);
	if (selected === undefined) {
		return SHAPE_STYLE_FALLBACK.stroke;
	}
	const ownStroke = (selected as Record<string, unknown>).stroke;
	return shapeStyleDefaults.resolveShapeStyle(selected.type, {
		stroke: typeof ownStroke === "string" ? ownStroke : undefined,
	}).stroke;
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
	const currentColor = getSelectedStrokeColor(
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

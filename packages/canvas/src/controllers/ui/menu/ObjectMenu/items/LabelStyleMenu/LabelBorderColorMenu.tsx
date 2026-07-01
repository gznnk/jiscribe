import { memo, useRef } from "react";

import { getSelectedConnectorLabel } from "./utils/getSelectedConnectorLabel";
import { resolveAutoColor } from "../../../../../../presentations/objects/utils/resolveAutoColor";
import { AUTO_COLOR } from "../../../../../../schemas/objects/utils/autoColor";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { BorderColorIcon } from "../../../../icons/BorderColorIcon";
import { ColorPickerGrid } from "../../common/ColorPickerGrid/ColorPickerGrid";
import { DropdownPanel } from "../../common/DropdownPanel";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import { ObjectMenuButton, MenuItemPositioner } from "../../ObjectMenuStyled";

const SECTION_ID = "label-border-color";

type Props = {
	canvasState: CanvasControllerState;
	onPropertyUpdate: (property: string, value: string, commit: boolean) => void;
};

/**
 * ラベルの枠線色メニュー（図形の Border Color と同じ並び）。
 * 値はネストの `label.stroke`。枠線は `label.strokeWidth > 0` のときだけ見える。
 */
const LabelBorderColorMenuComponent: React.FC<Props> = ({
	canvasState,
	onPropertyUpdate,
}) => {
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = canvasState.objectMenuOpenId === SECTION_ID;
	const { submenuRef, placement, offsetX } = useSubmenuPosition(
		menuItemRef,
		isOpen,
	);

	const stroke = getSelectedConnectorLabel(canvasState)?.stroke ?? AUTO_COLOR;

	return (
		<MenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-kind="object-menu"
				data-id={`object-menu:toggle:${SECTION_ID}`}
				title="Label Border Color"
			>
				<BorderColorIcon
					color={resolveAutoColor(stroke, "ink")}
					title="Label Border Color"
				/>
			</ObjectMenuButton>
			{isOpen && (
				<DropdownPanel ref={submenuRef} placement={placement} offsetX={offsetX}>
					<ColorPickerGrid
						currentColor={stroke}
						property="label.stroke"
						onPropertyUpdate={onPropertyUpdate}
					/>
				</DropdownPanel>
			)}
		</MenuItemPositioner>
	);
};

export const LabelBorderColorMenu = memo(LabelBorderColorMenuComponent);

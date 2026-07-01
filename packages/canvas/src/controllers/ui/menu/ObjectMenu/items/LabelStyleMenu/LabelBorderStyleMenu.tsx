import { memo, useRef } from "react";

import { getSelectedConnectorLabel } from "./utils/getSelectedConnectorLabel";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { DashedCircleIcon } from "../../../../icons/DashedCircleIcon";
import { DashedLineIcon } from "../../../../icons/DashedLineIcon";
import { DottedLineIcon } from "../../../../icons/DottedLineIcon";
import { SolidLineIcon } from "../../../../icons/SolidLineIcon";
import { DropdownPanel } from "../../common/DropdownPanel";
import { MenuSlider } from "../../common/MenuSlider";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import { ObjectMenuButton, MenuItemPositioner } from "../../ObjectMenuStyled";
import {
	BorderStyleMenuWrapper,
	BorderStyleSection,
} from "../BorderStyleMenu/BorderStyleMenuStyled";

const SECTION_ID = "label-border-style";

const MIN_BORDER_WIDTH = 0;
const MAX_BORDER_WIDTH = 12;

type Props = {
	canvasState: CanvasControllerState;
	onPropertyUpdate: (property: string, value: string, commit: boolean) => void;
};

/**
 * Label border style menu (same layout as the shape's Border Style).
 * Handles solid/dashed/dotted (`label.strokeDashType`) and border width (`label.strokeWidth`).
 * Labels have no corner radius `rx`, so Corner Radius is not shown.
 */
const LabelBorderStyleMenuComponent: React.FC<Props> = ({
	canvasState,
	onPropertyUpdate,
}) => {
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = canvasState.objectMenuOpenId === SECTION_ID;
	const { submenuRef, placement, offsetX } = useSubmenuPosition(
		menuItemRef,
		isOpen,
	);

	const label = getSelectedConnectorLabel(canvasState);
	const strokeWidth = label?.strokeWidth ?? 0;
	const strokeDashType = label?.strokeDashType;

	return (
		<MenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-kind="object-menu"
				data-id={`object-menu:toggle:${SECTION_ID}`}
				title="Label Border Style"
			>
				<DashedCircleIcon title="Label Border Style" />
			</ObjectMenuButton>
			{isOpen && (
				<DropdownPanel ref={submenuRef} placement={placement} offsetX={offsetX}>
					<BorderStyleMenuWrapper>
						<BorderStyleSection>
							<ObjectMenuButton
								isActive={!strokeDashType || strokeDashType === "solid"}
								data-kind="object-menu"
								data-id="object-menu:set:label.strokeDashType:solid"
								title="Solid line"
							>
								<SolidLineIcon title="Solid line" />
							</ObjectMenuButton>
							<ObjectMenuButton
								isActive={strokeDashType === "dashed"}
								data-kind="object-menu"
								data-id="object-menu:set:label.strokeDashType:dashed"
								title="Dashed line"
							>
								<DashedLineIcon title="Dashed line" />
							</ObjectMenuButton>
							<ObjectMenuButton
								isActive={strokeDashType === "dotted"}
								data-kind="object-menu"
								data-id="object-menu:set:label.strokeDashType:dotted"
								title="Dotted line"
							>
								<DottedLineIcon title="Dotted line" />
							</ObjectMenuButton>
						</BorderStyleSection>

						<MenuSlider
							label="Border Width"
							value={strokeWidth}
							min={MIN_BORDER_WIDTH}
							max={MAX_BORDER_WIDTH}
							property="label.strokeWidth"
							onPropertyUpdate={onPropertyUpdate}
						/>
					</BorderStyleMenuWrapper>
				</DropdownPanel>
			)}
		</MenuItemPositioner>
	);
};

export const LabelBorderStyleMenu = memo(LabelBorderStyleMenuComponent);

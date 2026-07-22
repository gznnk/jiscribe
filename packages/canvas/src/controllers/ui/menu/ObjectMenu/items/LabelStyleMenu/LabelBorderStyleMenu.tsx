import { memo, useRef } from "react";

import { getSelectedConnectorLabel } from "./utils/getSelectedConnectorLabel";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { DashedCircleIcon } from "../../../../icons/DashedCircleIcon";
import { DashedLineIcon } from "../../../../icons/DashedLineIcon";
import { DottedLineIcon } from "../../../../icons/DottedLineIcon";
import { SolidLineIcon } from "../../../../icons/SolidLineIcon";
import { ObjectMenuDropdownPanel } from "../../common/ObjectMenuDropdownPanel";
import { ObjectMenuSlider } from "../../common/ObjectMenuSlider";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import {
	ObjectMenuButton,
	ObjectMenuItemPositioner,
} from "../../ObjectMenuStyled";
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
	const messages = useCanvasMessages();
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = canvasState.objectMenuOpenId === SECTION_ID;
	const { submenuRef, placement, offsetX } = useSubmenuPosition(
		menuItemRef,
		isOpen,
	);

	const label = getSelectedConnectorLabel(canvasState);

	// Early-return only after all hooks have been called (to keep hook order stable).
	// No label text: render nothing, and the emptied section collapses via `:empty`.
	if (!label?.text) {
		return null;
	}

	const strokeWidth = label.strokeWidth ?? 0;
	const strokeDashType = label.strokeDashType;

	return (
		<ObjectMenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-kind="menu"
				data-id="object-menu"
				data-part={`toggle:${SECTION_ID}`}
				title={messages.menuLabelBorderStyle}
			>
				<DashedCircleIcon title={messages.menuLabelBorderStyle} />
			</ObjectMenuButton>
			{isOpen && (
				<ObjectMenuDropdownPanel
					ref={submenuRef}
					placement={placement}
					offsetX={offsetX}
				>
					<BorderStyleMenuWrapper>
						<BorderStyleSection>
							<ObjectMenuButton
								isActive={!strokeDashType || strokeDashType === "solid"}
								data-kind="menu"
								data-id="object-menu"
								data-part="set:label.strokeDashType:solid"
								title={messages.menuSolidLine}
							>
								<SolidLineIcon title={messages.menuSolidLine} />
							</ObjectMenuButton>
							<ObjectMenuButton
								isActive={strokeDashType === "dashed"}
								data-kind="menu"
								data-id="object-menu"
								data-part="set:label.strokeDashType:dashed"
								title={messages.menuDashedLine}
							>
								<DashedLineIcon title={messages.menuDashedLine} />
							</ObjectMenuButton>
							<ObjectMenuButton
								isActive={strokeDashType === "dotted"}
								data-kind="menu"
								data-id="object-menu"
								data-part="set:label.strokeDashType:dotted"
								title={messages.menuDottedLine}
							>
								<DottedLineIcon title={messages.menuDottedLine} />
							</ObjectMenuButton>
						</BorderStyleSection>

						<ObjectMenuSlider
							label={messages.menuBorderWidth}
							value={strokeWidth}
							min={MIN_BORDER_WIDTH}
							max={MAX_BORDER_WIDTH}
							property="label.strokeWidth"
							onPropertyUpdate={onPropertyUpdate}
						/>
					</BorderStyleMenuWrapper>
				</ObjectMenuDropdownPanel>
			)}
		</ObjectMenuItemPositioner>
	);
};

export const LabelBorderStyleMenu = memo(LabelBorderStyleMenuComponent);

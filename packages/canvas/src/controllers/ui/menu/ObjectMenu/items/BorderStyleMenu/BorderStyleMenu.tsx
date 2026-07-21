import { memo, useRef } from "react";

import {
	BorderStyleMenuWrapper,
	BorderStyleSection,
} from "./BorderStyleMenuStyled";
import { getSelectedCornerRadius } from "./utils/getSelectedCornerRadius";
import { getSelectedStrokeDashType } from "./utils/getSelectedStrokeDashType";
import { getSelectedStrokeWidth } from "./utils/getSelectedStrokeWidth";
import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
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

const SECTION_ID = "border-style";

// Valid range for border styling (number input clamp)
const MIN_STROKE_WIDTH = 0;
const MAX_STROKE_WIDTH = 100;
// Slider covers the common range (from 0 = no border); thicker borders via the number input.
const SLIDER_MAX_STROKE_WIDTH = 20;

const MIN_CORNER_RADIUS = 0;
const MAX_CORNER_RADIUS = 999;
// Slider covers the common range; larger radii via the number input.
const SLIDER_MAX_CORNER_RADIUS = 20;

type BorderStyleMenuProps = {
	canvasState: CanvasControllerState;
	/** Whether to show corner radius control */
	showRadius?: boolean;
	onPropertyUpdate: (property: string, value: string, commit: boolean) => void;
};

/**
 * Border style menu component.
 * Controls stroke width, stroke dash type, and corner radius.
 */
const BorderStyleMenuComponent: React.FC<BorderStyleMenuProps> = ({
	canvasState,
	showRadius = true,
	onPropertyUpdate,
}) => {
	const messages = useCanvasMessages();
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = canvasState.objectMenuOpenId === SECTION_ID;
	const strokeWidth = getSelectedStrokeWidth(canvasState);
	const strokeDashType = getSelectedStrokeDashType(canvasState);
	const cornerRadius = getSelectedCornerRadius(canvasState);
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
				title={messages.menuBorderStyle}
			>
				<DashedCircleIcon title={messages.menuBorderStyle} />
			</ObjectMenuButton>
			{isOpen && (
				<ObjectMenuDropdownPanel
					ref={submenuRef}
					placement={placement}
					offsetX={offsetX}
				>
					<BorderStyleMenuWrapper>
						{/* Stroke Dash Type */}
						<BorderStyleSection>
							<ObjectMenuButton
								isActive={!strokeDashType || strokeDashType === "solid"}
								data-kind="menu"
								data-id="object-menu"
								data-part="set:strokeDashType:solid"
								title={messages.menuSolidLine}
							>
								<SolidLineIcon title={messages.menuSolidLine} />
							</ObjectMenuButton>
							<ObjectMenuButton
								isActive={strokeDashType === "dashed"}
								data-kind="menu"
								data-id="object-menu"
								data-part="set:strokeDashType:dashed"
								title={messages.menuDashedLine}
							>
								<DashedLineIcon title={messages.menuDashedLine} />
							</ObjectMenuButton>
							<ObjectMenuButton
								isActive={strokeDashType === "dotted"}
								data-kind="menu"
								data-id="object-menu"
								data-part="set:strokeDashType:dotted"
								title={messages.menuDottedLine}
							>
								<DottedLineIcon title={messages.menuDottedLine} />
							</ObjectMenuButton>
						</BorderStyleSection>

						<ObjectMenuSlider
							label={messages.menuBorderWidth}
							value={strokeWidth}
							min={MIN_STROKE_WIDTH}
							max={MAX_STROKE_WIDTH}
							sliderMax={SLIDER_MAX_STROKE_WIDTH}
							property="strokeWidth"
							onPropertyUpdate={onPropertyUpdate}
						/>

						{showRadius && (
							<ObjectMenuSlider
								label={messages.menuCornerRadius}
								value={cornerRadius}
								min={MIN_CORNER_RADIUS}
								max={MAX_CORNER_RADIUS}
								sliderMax={SLIDER_MAX_CORNER_RADIUS}
								property="rx"
								onPropertyUpdate={onPropertyUpdate}
							/>
						)}
					</BorderStyleMenuWrapper>
				</ObjectMenuDropdownPanel>
			)}
		</ObjectMenuItemPositioner>
	);
};

export const BorderStyleMenu = memo(BorderStyleMenuComponent);

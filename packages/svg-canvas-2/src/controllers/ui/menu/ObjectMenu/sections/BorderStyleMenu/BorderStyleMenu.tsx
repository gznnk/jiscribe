import { memo, useRef } from "react";

import {
	BorderStyleMenuWrapper,
	BorderStyleSection,
} from "./BorderStyleMenuStyled";
import type { StrokeDashType } from "../../../../../../schemas/objects/types/StrokeDashType";
import type { CanvasState } from "../../../../../../states/canvas/CanvasState";
import { DashedCircleIcon } from "../../../../icons/DashedCircleIcon";
import { DashedLineIcon } from "../../../../icons/DashedLineIcon";
import { DottedLineIcon } from "../../../../icons/DottedLineIcon";
import { SolidLineIcon } from "../../../../icons/SolidLineIcon";
import { MenuSlider } from "../../common/MenuSlider";
import {
	ObjectMenuButton,
	DropdownPanel,
	MenuItemPositioner,
} from "../../ObjectMenuStyled";
import { useSubmenuPosition } from "../../useSubmenuPosition";

const SECTION_ID = "border-style";

// Constants for border styling
const MIN_STROKE_WIDTH = 0;
const MAX_STROKE_WIDTH = 100;
const DEFAULT_STROKE_WIDTH = 2;

const MIN_CORNER_RADIUS = 0;
const MAX_CORNER_RADIUS = 999;
const DEFAULT_CORNER_RADIUS = 0;

type BorderStyleMenuProps = {
	canvasState: CanvasState;
	/** Whether to show corner radius control */
	showRadius?: boolean;
	onPropertyUpdate: (property: string, value: string, commit: boolean) => void;
};

/**
 * Get first selected object's stroke width.
 */
const getSelectedStrokeWidth = (state: CanvasState): number => {
	for (const id of state.selectedIds) {
		const obj = state.objects[id];
		if (obj && "strokeWidth" in obj && typeof obj.strokeWidth === "number") {
			return obj.strokeWidth;
		}
	}
	return DEFAULT_STROKE_WIDTH;
};

/**
 * Get first selected object's stroke dash type.
 */
const getSelectedStrokeDashType = (
	state: CanvasState,
): StrokeDashType | undefined => {
	for (const id of state.selectedIds) {
		const obj = state.objects[id];
		if (
			obj &&
			"strokeDashType" in obj &&
			typeof obj.strokeDashType === "string"
		) {
			return obj.strokeDashType as StrokeDashType;
		}
	}
	return undefined;
};

/**
 * Get first selected object's corner radius (rx).
 */
const getSelectedCornerRadius = (state: CanvasState): number => {
	for (const id of state.selectedIds) {
		const obj = state.objects[id];
		if (obj && "rx" in obj && typeof obj.rx === "number") {
			return obj.rx;
		}
	}
	return DEFAULT_CORNER_RADIUS;
};

/**
 * Border style menu component.
 * Controls stroke width, stroke dash type, and corner radius.
 *
 * Based on svg-canvas's BorderStyleMenu but adapted for svg-canvas-2 architecture.
 */
const BorderStyleMenuComponent: React.FC<BorderStyleMenuProps> = ({
	canvasState,
	showRadius = true,
	onPropertyUpdate,
}) => {
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = canvasState.objectMenuOpenId === SECTION_ID;
	const strokeWidth = getSelectedStrokeWidth(canvasState);
	const strokeDashType = getSelectedStrokeDashType(canvasState);
	const cornerRadius = getSelectedCornerRadius(canvasState);
	const { placement } = useSubmenuPosition(menuItemRef, "borderStyle", isOpen);

	return (
		<MenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-kind="object-menu"
				data-id={`object-menu:toggle:${SECTION_ID}`}
				title="Border Style"
			>
				<DashedCircleIcon title="Border Style" />
			</ObjectMenuButton>
			{isOpen && (
				<DropdownPanel placement={placement}>
					<BorderStyleMenuWrapper>
						{/* Stroke Dash Type */}
						<BorderStyleSection>
							<ObjectMenuButton
								isActive={!strokeDashType || strokeDashType === "solid"}
								data-kind="object-menu"
								data-id="object-menu:set:strokeDashType:solid"
								title="Solid line"
							>
								<SolidLineIcon title="Solid line" />
							</ObjectMenuButton>
							<ObjectMenuButton
								isActive={strokeDashType === "dashed"}
								data-kind="object-menu"
								data-id="object-menu:set:strokeDashType:dashed"
								title="Dashed line"
							>
								<DashedLineIcon title="Dashed line" />
							</ObjectMenuButton>
							<ObjectMenuButton
								isActive={strokeDashType === "dotted"}
								data-kind="object-menu"
								data-id="object-menu:set:strokeDashType:dotted"
								title="Dotted line"
							>
								<DottedLineIcon title="Dotted line" />
							</ObjectMenuButton>
						</BorderStyleSection>

						<MenuSlider
							label="Border Width"
							value={strokeWidth}
							min={MIN_STROKE_WIDTH}
							max={MAX_STROKE_WIDTH}
							property="strokeWidth"
							onPropertyUpdate={onPropertyUpdate}
						/>

						{showRadius && (
							<MenuSlider
								label="Corner Radius"
								value={cornerRadius}
								min={MIN_CORNER_RADIUS}
								max={MAX_CORNER_RADIUS}
								property="rx"
								onPropertyUpdate={onPropertyUpdate}
							/>
						)}
					</BorderStyleMenuWrapper>
				</DropdownPanel>
			)}
		</MenuItemPositioner>
	);
};

export const BorderStyleMenu = memo(BorderStyleMenuComponent);

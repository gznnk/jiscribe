import { memo, useRef } from "react";

import {
	BorderStyleMenuWrapper,
	BorderStyleSection,
} from "./BorderStyleMenuStyled";
import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
import { getFirstSelectedWithProp } from "../../../../../../controllers/utils/getFirstSelectedWithProp";
import type { StrokeDashType } from "../../../../../../schemas/objects/types/StrokeDashType";
import { DashedCircleIcon } from "../../../../icons/DashedCircleIcon";
import { DashedLineIcon } from "../../../../icons/DashedLineIcon";
import { DottedLineIcon } from "../../../../icons/DottedLineIcon";
import { SolidLineIcon } from "../../../../icons/SolidLineIcon";
import { MenuSlider } from "../../common/MenuSlider";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import {
	ObjectMenuButton,
	DropdownPanel,
	MenuItemPositioner,
} from "../../ObjectMenuStyled";

const SECTION_ID = "border-style";
const SUBMENU_SIZE = { width: 220, height: 162 } as const;

// Constants for border styling
const MIN_STROKE_WIDTH = 0;
const MAX_STROKE_WIDTH = 100;
const DEFAULT_STROKE_WIDTH = 2;

const MIN_CORNER_RADIUS = 0;
const MAX_CORNER_RADIUS = 999;
const DEFAULT_CORNER_RADIUS = 0;

type BorderStyleMenuProps = {
	canvasState: CanvasControllerState;
	/** Whether to show corner radius control */
	showRadius?: boolean;
	onPropertyUpdate: (property: string, value: string, commit: boolean) => void;
};

const getSelectedStrokeWidth = (state: CanvasControllerState): number => {
	const obj = getFirstSelectedWithProp(
		state.selectedIds,
		state.objects,
		"strokeWidth",
	);
	const v = (obj as Record<string, unknown>)?.strokeWidth;
	return typeof v === "number" ? v : DEFAULT_STROKE_WIDTH;
};

const getSelectedStrokeDashType = (
	state: CanvasControllerState,
): StrokeDashType | undefined => {
	const obj = getFirstSelectedWithProp(
		state.selectedIds,
		state.objects,
		"strokeDashType",
	);
	const v = (obj as Record<string, unknown>)?.strokeDashType;
	return typeof v === "string" ? (v as StrokeDashType) : undefined;
};

const getSelectedCornerRadius = (state: CanvasControllerState): number => {
	const obj = getFirstSelectedWithProp(state.selectedIds, state.objects, "rx");
	const v = (obj as Record<string, unknown>)?.rx;
	return typeof v === "number" ? v : DEFAULT_CORNER_RADIUS;
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
	const { placement } = useSubmenuPosition(menuItemRef, SUBMENU_SIZE, isOpen);

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

import { memo, useRef } from "react";

import { LineStyleMenuWrapper, LineStyleSection } from "./LineStyleMenuStyled";
import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
import type { StrokeDashType } from "../../../../../../schemas/objects/types/StrokeDashType";
import { DashedLineIcon } from "../../../../icons/DashedLineIcon";
import { DottedLineIcon } from "../../../../icons/DottedLineIcon";
import { LineStyleIcon } from "../../../../icons/LineStyleIcon";
import { SolidLineIcon } from "../../../../icons/SolidLineIcon";
import { MenuSlider } from "../../common/MenuSlider";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import {
	DropdownPanel,
	MenuItemPositioner,
	ObjectMenuButton,
} from "../../ObjectMenuStyled";

const SECTION_ID = "line-style";
const SUBMENU_SIZE = { width: 220, height: 120 } as const;

const MIN_STROKE_WIDTH = 1;
const MAX_STROKE_WIDTH = 100;
const DEFAULT_STROKE_WIDTH = 2;

const getSelectedStrokeWidth = (state: CanvasControllerState): number => {
	for (const id of state.selectedIds) {
		const obj = state.objects[id];
		if (obj && "strokeWidth" in obj && typeof obj.strokeWidth === "number") {
			return obj.strokeWidth;
		}
	}
	return DEFAULT_STROKE_WIDTH;
};

const getSelectedStrokeDashType = (
	state: CanvasControllerState,
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

type LineStyleMenuProps = {
	canvasState: CanvasControllerState;
	onPropertyUpdate: (property: string, value: string, commit: boolean) => void;
};

const LineStyleMenuComponent: React.FC<LineStyleMenuProps> = ({
	canvasState,
	onPropertyUpdate,
}) => {
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = canvasState.objectMenuOpenId === SECTION_ID;
	const strokeWidth = getSelectedStrokeWidth(canvasState);
	const strokeDashType = getSelectedStrokeDashType(canvasState);
	const { placement } = useSubmenuPosition(menuItemRef, SUBMENU_SIZE, isOpen);

	return (
		<MenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-kind="object-menu"
				data-id={`object-menu:toggle:${SECTION_ID}`}
				title="Line Style"
			>
				<LineStyleIcon title="Line Style" />
			</ObjectMenuButton>
			{isOpen && (
				<DropdownPanel placement={placement}>
					<LineStyleMenuWrapper>
						<LineStyleSection>
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
						</LineStyleSection>

						<MenuSlider
							label="Line Width"
							value={strokeWidth}
							min={MIN_STROKE_WIDTH}
							max={MAX_STROKE_WIDTH}
							property="strokeWidth"
							onPropertyUpdate={onPropertyUpdate}
						/>
					</LineStyleMenuWrapper>
				</DropdownPanel>
			)}
		</MenuItemPositioner>
	);
};

export const LineStyleMenu = memo(LineStyleMenuComponent);

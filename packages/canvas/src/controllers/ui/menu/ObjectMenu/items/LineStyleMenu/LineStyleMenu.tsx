import { memo, useRef } from "react";

import { LineStyleMenuWrapper, LineStyleSection } from "./LineStyleMenuStyled";
import { getSelectedStrokeDashType } from "./utils/getSelectedStrokeDashType";
import { getSelectedStrokeWidth } from "./utils/getSelectedStrokeWidth";
import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { DashedLineIcon } from "../../../../icons/DashedLineIcon";
import { DottedLineIcon } from "../../../../icons/DottedLineIcon";
import { LineStyleIcon } from "../../../../icons/LineStyleIcon";
import { SolidLineIcon } from "../../../../icons/SolidLineIcon";
import { DropdownPanel } from "../../common/DropdownPanel";
import { MenuSlider } from "../../common/MenuSlider";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import { MenuItemPositioner, ObjectMenuButton } from "../../ObjectMenuStyled";

const SECTION_ID = "line-style";

const MIN_STROKE_WIDTH = 1;
const MAX_STROKE_WIDTH = 100;

type LineStyleMenuProps = {
	canvasState: CanvasControllerState;
	onPropertyUpdate: (property: string, value: string, commit: boolean) => void;
};

const LineStyleMenuComponent: React.FC<LineStyleMenuProps> = ({
	canvasState,
	onPropertyUpdate,
}) => {
	const messages = useCanvasMessages();
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = canvasState.objectMenuOpenId === SECTION_ID;
	const strokeWidth = getSelectedStrokeWidth(canvasState);
	const strokeDashType = getSelectedStrokeDashType(canvasState);
	const { submenuRef, placement, offsetX } = useSubmenuPosition(
		menuItemRef,
		isOpen,
	);

	return (
		<MenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-kind="menu"
				data-id="object-menu"
				data-part={`toggle:${SECTION_ID}`}
				title={messages.menuLineStyle}
			>
				<LineStyleIcon title={messages.menuLineStyle} />
			</ObjectMenuButton>
			{isOpen && (
				<DropdownPanel ref={submenuRef} placement={placement} offsetX={offsetX}>
					<LineStyleMenuWrapper>
						<LineStyleSection>
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
						</LineStyleSection>

						<MenuSlider
							label={messages.menuLineWidth}
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

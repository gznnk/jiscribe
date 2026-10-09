import { SHAPE_STYLE_FALLBACK } from "@jiscribe/doc/model/objects/utils/shapeStyleFallback";
import { memo, useRef } from "react";

import { LineStyleMenuWrapper, LineStyleSection } from "./LineStyleMenuStyled";
import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
import {
	setPart,
	togglePart,
} from "../../../../../gestures/handlers/menu/utils/menuParts";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { useSelectionStyle } from "../../../../../style/SelectionStyleReaderContext";
import {
	isMixedSelectionValue,
	selectionValueOr,
	selectionValueOrFirst,
} from "../../../../../style/SelectionValue";
import { DashedLineIcon } from "../../../../icons/DashedLineIcon";
import { DottedLineIcon } from "../../../../icons/DottedLineIcon";
import { LineStyleIcon } from "../../../../icons/LineStyleIcon";
import { SolidLineIcon } from "../../../../icons/SolidLineIcon";
import { ObjectMenuDropdownPanel } from "../../common/ObjectMenuDropdownPanel";
import { ObjectMenuSlider } from "../../common/ObjectMenuSlider";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import {
	ObjectMenuItemPositioner,
	ObjectMenuButton,
} from "../../ObjectMenuStyled";
import type { StyleIntentUpdater } from "../../ObjectMenuTypes";

const SECTION_ID = "line-style";

const MIN_STROKE_WIDTH = 1;
const MAX_STROKE_WIDTH = 100;
// Slider covers the common range; thicker lines via the number input.
const SLIDER_MAX_STROKE_WIDTH = 20;

type LineStyleMenuProps = {
	canvasState: CanvasControllerState;
	onStyleIntent: StyleIntentUpdater;
};

const LineStyleMenuComponent: React.FC<LineStyleMenuProps> = ({
	canvasState,
	onStyleIntent,
}) => {
	const messages = useCanvasMessages();
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = canvasState.objectMenuOpenId === SECTION_ID;
	const strokeWidth = useSelectionStyle("strokeWidth");
	const strokeDashType = useSelectionStyle("strokeDashType");
	const isDashMixed = isMixedSelectionValue(strokeDashType);
	const dashType = selectionValueOr(
		strokeDashType,
		SHAPE_STYLE_FALLBACK.strokeDashType,
	);
	const { submenuRef, placement, offsetX } = useSubmenuPosition(
		menuItemRef,
		isOpen,
	);

	return (
		<ObjectMenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-part={togglePart(SECTION_ID)}
				title={messages.menuLineStyle}
			>
				<LineStyleIcon title={messages.menuLineStyle} />
			</ObjectMenuButton>
			{isOpen && (
				<ObjectMenuDropdownPanel
					ref={submenuRef}
					placement={placement}
					offsetX={offsetX}
				>
					<LineStyleMenuWrapper>
						<LineStyleSection>
							<ObjectMenuButton
								isActive={!isDashMixed && dashType === "solid"}
								data-part={setPart("strokeDashType", "solid")}
								title={messages.menuSolidLine}
							>
								<SolidLineIcon title={messages.menuSolidLine} />
							</ObjectMenuButton>
							<ObjectMenuButton
								isActive={!isDashMixed && dashType === "dashed"}
								data-part={setPart("strokeDashType", "dashed")}
								title={messages.menuDashedLine}
							>
								<DashedLineIcon title={messages.menuDashedLine} />
							</ObjectMenuButton>
							<ObjectMenuButton
								isActive={!isDashMixed && dashType === "dotted"}
								data-part={setPart("strokeDashType", "dotted")}
								title={messages.menuDottedLine}
							>
								<DottedLineIcon title={messages.menuDottedLine} />
							</ObjectMenuButton>
						</LineStyleSection>

						<ObjectMenuSlider
							label={messages.menuLineWidth}
							value={selectionValueOrFirst(
								strokeWidth,
								SHAPE_STYLE_FALLBACK.strokeWidth,
							)}
							isMixed={isMixedSelectionValue(strokeWidth)}
							min={MIN_STROKE_WIDTH}
							max={MAX_STROKE_WIDTH}
							sliderMax={SLIDER_MAX_STROKE_WIDTH}
							property="strokeWidth"
							onStyleIntent={onStyleIntent}
						/>
					</LineStyleMenuWrapper>
				</ObjectMenuDropdownPanel>
			)}
		</ObjectMenuItemPositioner>
	);
};

export const LineStyleMenu = memo(LineStyleMenuComponent);

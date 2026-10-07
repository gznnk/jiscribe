import { memo, useRef } from "react";

import {
	setPart,
	togglePart,
} from "../../../../../gestures/handlers/menu/utils/menuParts";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { CONNECTOR_STYLE } from "../../../../../style/connectorStyle";
import { useSelectionStyle } from "../../../../../style/SelectionStyleReaderContext";
import { selectionValueOr } from "../../../../../style/SelectionValue";
import { hasSelectedConnectorLabelText } from "../../../../../utils/hasSelectedConnectorLabelText";
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
import type { ObjectMenuItemProps } from "../../ObjectMenuTypes";
import {
	BorderStyleMenuWrapper,
	BorderStyleSection,
} from "../BorderStyleMenu/BorderStyleMenuStyled";

const SECTION_ID = "label-border-style";

const MIN_BORDER_WIDTH = 0;
const MAX_BORDER_WIDTH = 12;

/** What a label with no `strokeWidth` of its own is drawn with: no border. */
const UNSET_BORDER_WIDTH = 0;

/**
 * Label border style menu (same layout as the shape's Border Style).
 * Handles solid/dashed/dotted (`label.strokeDashType`) and border width (`label.strokeWidth`).
 * Labels have no corner radius `rx`, so Corner Radius is not shown.
 */
const LabelBorderStyleMenuComponent: React.FC<ObjectMenuItemProps> = ({
	objects,
	selection,
	openSectionId,
	onStyleIntent,
}) => {
	const messages = useCanvasMessages();
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = openSectionId === SECTION_ID;
	const { submenuRef, placement, offsetX } = useSubmenuPosition(
		menuItemRef,
		isOpen,
	);

	// An unset width draws no border, which is the value the slider starts from.
	const strokeWidth = selectionValueOr(
		useSelectionStyle(CONNECTOR_STYLE, "label.strokeWidth"),
		UNSET_BORDER_WIDTH,
	);
	const strokeDashType = selectionValueOr(
		useSelectionStyle(CONNECTOR_STYLE, "label.strokeDashType"),
		undefined,
	);

	// Early-return only after all hooks have been called (to keep hook order stable).
	// No label text: render nothing, and the emptied section collapses via `:empty`.
	if (!hasSelectedConnectorLabelText({ objects, selection })) {
		return null;
	}

	return (
		<ObjectMenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-part={togglePart(SECTION_ID)}
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
								data-part={setPart("label.strokeDashType", "solid")}
								title={messages.menuSolidLine}
							>
								<SolidLineIcon title={messages.menuSolidLine} />
							</ObjectMenuButton>
							<ObjectMenuButton
								isActive={strokeDashType === "dashed"}
								data-part={setPart("label.strokeDashType", "dashed")}
								title={messages.menuDashedLine}
							>
								<DashedLineIcon title={messages.menuDashedLine} />
							</ObjectMenuButton>
							<ObjectMenuButton
								isActive={strokeDashType === "dotted"}
								data-part={setPart("label.strokeDashType", "dotted")}
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
							onStyleIntent={onStyleIntent}
						/>
					</BorderStyleMenuWrapper>
				</ObjectMenuDropdownPanel>
			)}
		</ObjectMenuItemPositioner>
	);
};

export const LabelBorderStyleMenu = memo(LabelBorderStyleMenuComponent);

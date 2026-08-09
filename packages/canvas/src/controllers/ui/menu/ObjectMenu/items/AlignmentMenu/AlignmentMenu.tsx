import { memo, useRef } from "react";

import { AlignmentMenuContent, AlignmentRow } from "./AlignmentMenuStyled";
import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import type { CanvasMessageStrings } from "../../../../../messages/CanvasMessagesTypes";
import { AlignBottomIcon } from "../../../../icons/AlignBottomIcon";
import { AlignCenterIcon } from "../../../../icons/AlignCenterIcon";
import { AlignLeftIcon } from "../../../../icons/AlignLeftIcon";
import { AlignMiddleIcon } from "../../../../icons/AlignMiddleIcon";
import { AlignRightIcon } from "../../../../icons/AlignRightIcon";
import { AlignTopIcon } from "../../../../icons/AlignTopIcon";
import { ObjectMenuDropdownPanel } from "../../common/ObjectMenuDropdownPanel";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import {
	ObjectMenuButton,
	ObjectMenuItemPositioner,
} from "../../ObjectMenuStyled";
import { getSelectedOrFirstTextSlot } from "../../utils/getSelectedOrFirstTextSlot";

const SECTION_ID = "alignment";

type AlignmentMenuProps = {
	canvasState: CanvasControllerState;
	/** Whether the vertical row is drawn. Omitted = drawn (see BuiltinItem). */
	vertical?: boolean;
};

const horizontalAlignments = [
	{ value: "left", Icon: AlignLeftIcon, messageKey: "menuAlignLeft" },
	{ value: "center", Icon: AlignCenterIcon, messageKey: "menuAlignCenter" },
	{ value: "right", Icon: AlignRightIcon, messageKey: "menuAlignRight" },
] as const satisfies readonly {
	value: string;
	Icon: React.FC;
	messageKey: keyof CanvasMessageStrings;
}[];

const verticalAlignments = [
	{ value: "top", Icon: AlignTopIcon, messageKey: "menuAlignTop" },
	{ value: "middle", Icon: AlignMiddleIcon, messageKey: "menuAlignMiddle" },
	{ value: "bottom", Icon: AlignBottomIcon, messageKey: "menuAlignBottom" },
] as const satisfies readonly {
	value: string;
	Icon: React.FC;
	messageKey: keyof CanvasMessageStrings;
}[];

/**
 * Text alignment menu.
 * Changes textAlign, and verticalAlign unless the type opted the row out.
 * Each button coordinates with the gesture system via data attributes.
 */
const AlignmentMenuComponent: React.FC<AlignmentMenuProps> = ({
	canvasState,
	vertical = true,
}) => {
	const messages = useCanvasMessages();
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = canvasState.objectMenuOpenId === SECTION_ID;
	const { submenuRef, placement, offsetX } = useSubmenuPosition(
		menuItemRef,
		isOpen,
	);

	const slot = getSelectedOrFirstTextSlot(canvasState);
	const textAlign = slot?.textAlign ?? "left";
	const verticalAlign = slot?.verticalAlign ?? "middle";

	return (
		<ObjectMenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-kind="menu"
				data-id="object-menu"
				data-part={`toggle:${SECTION_ID}`}
				title={messages.menuTextAlignment}
			>
				<AlignLeftIcon />
			</ObjectMenuButton>
			{isOpen && (
				<ObjectMenuDropdownPanel
					ref={submenuRef}
					placement={placement}
					offsetX={offsetX}
				>
					<AlignmentMenuContent>
						<AlignmentRow>
							{horizontalAlignments.map(({ value, Icon, messageKey }) => (
								<ObjectMenuButton
									key={value}
									isActive={textAlign === value}
									data-kind="menu"
									data-id="object-menu"
									data-part={`set:textAlign:${value}`}
									title={messages[messageKey]}
								>
									<Icon />
								</ObjectMenuButton>
							))}
						</AlignmentRow>
						{vertical && (
							<AlignmentRow>
								{verticalAlignments.map(({ value, Icon, messageKey }) => (
									<ObjectMenuButton
										key={value}
										isActive={verticalAlign === value}
										data-kind="menu"
										data-id="object-menu"
										data-part={`set:verticalAlign:${value}`}
										title={messages[messageKey]}
									>
										<Icon />
									</ObjectMenuButton>
								))}
							</AlignmentRow>
						)}
					</AlignmentMenuContent>
				</ObjectMenuDropdownPanel>
			)}
		</ObjectMenuItemPositioner>
	);
};

export const AlignmentMenu = memo(AlignmentMenuComponent);

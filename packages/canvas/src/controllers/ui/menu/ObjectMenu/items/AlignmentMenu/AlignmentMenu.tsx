import { memo, useRef } from "react";

import { AlignmentMenuContent, AlignmentRow } from "./AlignmentMenuStyled";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import {
	setAction,
	toggleAction,
} from "../../../../../gestures/handlers/menu/utils/menuActions";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import type { CanvasMessageStrings } from "../../../../../messages/CanvasMessagesTypes";
import { AlignBottomIcon } from "../../../../icons/AlignBottomIcon";
import { AlignCenterIcon } from "../../../../icons/AlignCenterIcon";
import { AlignLeftIcon } from "../../../../icons/AlignLeftIcon";
import { AlignMiddleIcon } from "../../../../icons/AlignMiddleIcon";
import { AlignRightIcon } from "../../../../icons/AlignRightIcon";
import { AlignTopIcon } from "../../../../icons/AlignTopIcon";
import {
	useSelectedTextAlign,
	useSelectedVerticalAlign,
} from "../../../hooks/useSelectedAlign";
import { ObjectMenuDropdownPanel } from "../../common/ObjectMenuDropdownPanel";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import {
	ObjectMenuButton,
	ObjectMenuItemPositioner,
} from "../../ObjectMenuStyled";

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

	const textAlign = useSelectedTextAlign();
	const verticalAlign = useSelectedVerticalAlign();

	return (
		<ObjectMenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-action={toggleAction(SECTION_ID)}
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
									isActive={!textAlign.isMixed && textAlign.value === value}
									data-action={setAction("textAlign", value)}
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
										isActive={
											!verticalAlign.isMixed && verticalAlign.value === value
										}
										data-action={setAction("verticalAlign", value)}
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

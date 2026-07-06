import { memo, useRef } from "react";

import { ArrowHeadIconPreview } from "./ArrowHeadIconPreview";
import { ArrowSelectorGrid, ArrowTypeButton } from "./ArrowHeadMenuStyled";
import { getSelectedArrowType } from "./utils/getSelectedArrowType";
import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
import { ArrowTypes } from "../../../../../../schemas/objects/types/ArrowType";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { ArrowSwapIcon } from "../../../../icons/ArrowSwapIcon";
import { DropdownPanel } from "../../common/DropdownPanel";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import { ObjectMenuButton, MenuItemPositioner } from "../../ObjectMenuStyled";

const SECTION_ID_START = "arrow-head-start";
const SECTION_ID_END = "arrow-head-end";

type ArrowHeadMenuProps = {
	canvasState: CanvasControllerState;
};

/**
 * Arrow head menu.
 * Lays out three inline elements: Start arrow button -> swap button -> End arrow button.
 * Clicking each button expands its respective arrow selector.
 */
const ArrowHeadMenuComponent: React.FC<ArrowHeadMenuProps> = ({
	canvasState,
}) => {
	const messages = useCanvasMessages();
	const startRef = useRef<HTMLDivElement>(null);
	const endRef = useRef<HTMLDivElement>(null);

	const isStartOpen = canvasState.objectMenuOpenId === SECTION_ID_START;
	const isEndOpen = canvasState.objectMenuOpenId === SECTION_ID_END;

	const currentStart = getSelectedArrowType(canvasState, "startArrow");
	const currentEnd = getSelectedArrowType(canvasState, "endArrow");

	const {
		submenuRef: startSubmenuRef,
		placement: startPlacement,
		offsetX: startOffsetX,
	} = useSubmenuPosition(startRef, isStartOpen);
	const {
		submenuRef: endSubmenuRef,
		placement: endPlacement,
		offsetX: endOffsetX,
	} = useSubmenuPosition(endRef, isEndOpen);

	return (
		<>
			{/* Start Arrow Button */}
			<MenuItemPositioner ref={startRef}>
				<ObjectMenuButton
					isActive={isStartOpen}
					data-kind="menu"
					data-id="object-menu"
					data-part={`toggle:${SECTION_ID_START}`}
					title={messages.menuStartArrow}
				>
					<ArrowHeadIconPreview arrowType={currentStart} direction="start" />
				</ObjectMenuButton>
				{isStartOpen && (
					<DropdownPanel
						ref={startSubmenuRef}
						placement={startPlacement}
						offsetX={startOffsetX}
					>
						<ArrowSelectorGrid>
							{ArrowTypes.map((type) => (
								<ArrowTypeButton
									key={`start-${type}`}
									isActive={currentStart === type}
									data-kind="menu"
									data-id="object-menu"
									data-part={`set:startArrow:${type}`}
									title={messages.arrowTypeNames[type] ?? type}
								>
									<ArrowHeadIconPreview arrowType={type} direction="start" />
								</ArrowTypeButton>
							))}
						</ArrowSelectorGrid>
					</DropdownPanel>
				)}
			</MenuItemPositioner>

			{/* Swap Button */}
			<ObjectMenuButton
				data-kind="menu"
				data-id="object-menu"
				data-part="command:swapArrows"
				title={messages.menuSwapArrows}
			>
				<ArrowSwapIcon fill="currentColor" width={24} height={24} />
			</ObjectMenuButton>

			{/* End Arrow Button */}
			<MenuItemPositioner ref={endRef}>
				<ObjectMenuButton
					isActive={isEndOpen}
					data-kind="menu"
					data-id="object-menu"
					data-part={`toggle:${SECTION_ID_END}`}
					title={messages.menuEndArrow}
				>
					<ArrowHeadIconPreview arrowType={currentEnd} direction="end" />
				</ObjectMenuButton>
				{isEndOpen && (
					<DropdownPanel
						ref={endSubmenuRef}
						placement={endPlacement}
						offsetX={endOffsetX}
					>
						<ArrowSelectorGrid>
							{ArrowTypes.map((type) => (
								<ArrowTypeButton
									key={`end-${type}`}
									isActive={currentEnd === type}
									data-kind="menu"
									data-id="object-menu"
									data-part={`set:endArrow:${type}`}
									title={messages.arrowTypeNames[type] ?? type}
								>
									<ArrowHeadIconPreview arrowType={type} direction="end" />
								</ArrowTypeButton>
							))}
						</ArrowSelectorGrid>
					</DropdownPanel>
				)}
			</MenuItemPositioner>
		</>
	);
};

export const ArrowHeadMenu = memo(ArrowHeadMenuComponent);

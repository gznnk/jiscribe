import { ArrowTypes } from "@jiscribe/doc/model/objects/types/ArrowType";
import { SHAPE_STYLE_FALLBACK } from "@jiscribe/doc/model/objects/utils/shapeStyleFallback";
import { memo, useRef } from "react";

import { ArrowHeadIconPreview } from "./ArrowHeadIconPreview";
import { ArrowSelectorGrid, ArrowTypeButton } from "./ArrowHeadMenuStyled";
import { MixedArrowHeadIcon } from "./MixedArrowHeadIcon";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import {
	commandAction,
	setAction,
	toggleAction,
} from "../../../../../gestures/handlers/menu/utils/menuActions";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import {
	isMixedSelectionValue,
	selectionValueOr,
} from "../../../../../style/SelectionValue";
import { ArrowSwapIcon } from "../../../../icons/ArrowSwapIcon";
import { useSelectionStyle } from "../../../SelectionStyleReaderContext";
import { ObjectMenuDropdownPanel } from "../../common/ObjectMenuDropdownPanel";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import {
	ObjectMenuButton,
	ObjectMenuItemPositioner,
} from "../../ObjectMenuStyled";

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

	const startArrow = useSelectionStyle("startArrow");
	const endArrow = useSelectionStyle("endArrow");
	const isStartMixed = isMixedSelectionValue(startArrow);
	const isEndMixed = isMixedSelectionValue(endArrow);
	const currentStart = selectionValueOr(
		startArrow,
		SHAPE_STYLE_FALLBACK.startArrow,
	);
	const currentEnd = selectionValueOr(endArrow, SHAPE_STYLE_FALLBACK.endArrow);

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
			<ObjectMenuItemPositioner ref={startRef}>
				<ObjectMenuButton
					isActive={isStartOpen}
					data-action={toggleAction(SECTION_ID_START)}
					title={messages.menuStartArrow}
				>
					{isStartMixed ? (
						<MixedArrowHeadIcon />
					) : (
						<ArrowHeadIconPreview arrowType={currentStart} direction="start" />
					)}
				</ObjectMenuButton>
				{isStartOpen && (
					<ObjectMenuDropdownPanel
						ref={startSubmenuRef}
						placement={startPlacement}
						offsetX={startOffsetX}
					>
						<ArrowSelectorGrid>
							{ArrowTypes.map((type) => (
								<ArrowTypeButton
									key={`start-${type}`}
									isActive={!isStartMixed && currentStart === type}
									data-action={setAction("startArrow", type)}
									title={messages.arrowTypeNames[type] ?? type}
								>
									<ArrowHeadIconPreview arrowType={type} direction="start" />
								</ArrowTypeButton>
							))}
						</ArrowSelectorGrid>
					</ObjectMenuDropdownPanel>
				)}
			</ObjectMenuItemPositioner>

			{/* Swap Button */}
			<ObjectMenuButton
				data-action={commandAction("swapArrows")}
				title={messages.menuSwapArrows}
			>
				<ArrowSwapIcon fill="currentColor" width={24} height={24} />
			</ObjectMenuButton>

			{/* End Arrow Button */}
			<ObjectMenuItemPositioner ref={endRef}>
				<ObjectMenuButton
					isActive={isEndOpen}
					data-action={toggleAction(SECTION_ID_END)}
					title={messages.menuEndArrow}
				>
					{isEndMixed ? (
						<MixedArrowHeadIcon />
					) : (
						<ArrowHeadIconPreview arrowType={currentEnd} direction="end" />
					)}
				</ObjectMenuButton>
				{isEndOpen && (
					<ObjectMenuDropdownPanel
						ref={endSubmenuRef}
						placement={endPlacement}
						offsetX={endOffsetX}
					>
						<ArrowSelectorGrid>
							{ArrowTypes.map((type) => (
								<ArrowTypeButton
									key={`end-${type}`}
									isActive={!isEndMixed && currentEnd === type}
									data-action={setAction("endArrow", type)}
									title={messages.arrowTypeNames[type] ?? type}
								>
									<ArrowHeadIconPreview arrowType={type} direction="end" />
								</ArrowTypeButton>
							))}
						</ArrowSelectorGrid>
					</ObjectMenuDropdownPanel>
				)}
			</ObjectMenuItemPositioner>
		</>
	);
};

export const ArrowHeadMenu = memo(ArrowHeadMenuComponent);

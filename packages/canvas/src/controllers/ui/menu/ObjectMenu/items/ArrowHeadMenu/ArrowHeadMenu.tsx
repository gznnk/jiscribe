import { memo, useRef } from "react";

import { ArrowHeadIconPreview } from "./ArrowHeadIconPreview";
import { ArrowSelectorGrid, ArrowTypeButton } from "./ArrowHeadMenuStyled";
import { getSelectedArrowType } from "./utils/getSelectedArrowType";
import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
import { ArrowTypes } from "../../../../../../schemas/objects/types/ArrowType";
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
 * 矢印メニュー。
 * Start 矢印ボタン → 入れ替えボタン → End 矢印ボタン の3要素をインラインに並べる。
 * 各ボタンをクリックするとそれぞれの矢印セレクターが展開する。
 */
const ArrowHeadMenuComponent: React.FC<ArrowHeadMenuProps> = ({
	canvasState,
}) => {
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
					data-kind="object-menu"
					data-id={`object-menu:toggle:${SECTION_ID_START}`}
					title="Start Arrow"
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
									data-kind="object-menu"
									data-id={`object-menu:set:startArrow:${type}`}
									title={type}
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
				data-kind="object-menu"
				data-id="object-menu:command:swapArrows"
				title="Swap arrows"
			>
				<ArrowSwapIcon fill="currentColor" width={24} height={24} />
			</ObjectMenuButton>

			{/* End Arrow Button */}
			<MenuItemPositioner ref={endRef}>
				<ObjectMenuButton
					isActive={isEndOpen}
					data-kind="object-menu"
					data-id={`object-menu:toggle:${SECTION_ID_END}`}
					title="End Arrow"
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
									data-kind="object-menu"
									data-id={`object-menu:set:endArrow:${type}`}
									title={type}
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

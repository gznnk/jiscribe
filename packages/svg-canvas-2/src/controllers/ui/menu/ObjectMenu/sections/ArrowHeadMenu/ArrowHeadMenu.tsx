import { memo, useRef } from "react";

import { ArrowHeadIconPreview } from "./ArrowHeadIconPreview";
import { ArrowSelectorGrid, ArrowTypeButton } from "./ArrowHeadMenuStyled";
import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
import { ArrowTypes } from "../../../../../../schemas/objects/types/ArrowType";
import type { ArrowType } from "../../../../../../schemas/objects/types/ArrowType";
import { ArrowSwapIcon } from "../../../../icons/ArrowSwapIcon";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import {
	ObjectMenuButton,
	DropdownPanel,
	MenuItemPositioner,
} from "../../ObjectMenuStyled";

const SECTION_ID_START = "arrow-head-start";
const SECTION_ID_END = "arrow-head-end";

type ArrowHeadMenuProps = {
	canvasState: CanvasControllerState;
};

/**
 * 選択中オブジェクトの矢印タイプを取得する。
 */
const getSelectedArrowType = (
	state: CanvasControllerState,
	property: "startArrow" | "endArrow",
): ArrowType => {
	for (const id of state.selectedIds) {
		const obj = state.objects[id];
		if (obj && property in obj) {
			const value = (obj as Record<string, unknown>)[property];
			if (typeof value === "string") return value as ArrowType;
		}
	}
	return "None";
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

	const { placement: startPlacement } = useSubmenuPosition(
		startRef,
		"arrowHead",
		isStartOpen,
	);
	const { placement: endPlacement } = useSubmenuPosition(
		endRef,
		"arrowHead",
		isEndOpen,
	);

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
					<DropdownPanel placement={startPlacement}>
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
				data-id="object-menu:swap:arrows"
				title="Swap arrows"
			>
				<ArrowSwapIcon fill="#333333" width={24} height={24} />
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
					<DropdownPanel placement={endPlacement}>
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

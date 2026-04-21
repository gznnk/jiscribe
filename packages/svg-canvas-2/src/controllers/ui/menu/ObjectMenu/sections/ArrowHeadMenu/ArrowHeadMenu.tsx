import { memo, useRef } from "react";

import {
	ArrowGrid,
	ArrowSection,
	ArrowSectionLabel,
	ArrowTypeButton,
	ArrowTypeRow,
} from "./ArrowHeadMenuStyled";
import { ArrowTypes } from "../../../../../../schemas/objects/types/ArrowType";
import type { CanvasState } from "../../../../../../states/canvas/CanvasState";
import { ArrowHeadIcon } from "../../../../icons/ArrowHeadIcon";
import {
	ObjectMenuButton,
	DropdownPanel,
	MenuItemPositioner,
} from "../../ObjectMenuStyled";
import { useSubmenuPosition } from "../../useSubmenuPosition";

const SECTION_ID = "arrow-head";

type ArrowHeadMenuProps = {
	canvasState: CanvasState;
};

/**
 * 選択中オブジェクトの矢印タイプを取得する。
 */
const getSelectedArrowType = (
	state: CanvasState,
	property: "startArrow" | "endArrow",
): string => {
	for (const id of state.selectedIds) {
		const obj = state.objects[id];
		if (obj && property in obj) {
			const value = (obj as Record<string, unknown>)[property];
			if (typeof value === "string") return value;
		}
	}
	return "None";
};

/**
 * 矢印タイプ表示用の短いラベルを返す。
 */
const getArrowLabel = (type: string): string => {
	const labels: Record<string, string> = {
		FilledTriangle: "▶",
		ConcaveTriangle: "►",
		OpenArrow: "➤",
		HollowTriangle: "△",
		FilledDiamond: "◆",
		HollowDiamond: "◇",
		Circle: "●",
		None: "—",
	};
	return labels[type] ?? type;
};

/**
 * 矢印メニュー。
 * 選択中オブジェクトの startArrow / endArrow を変更する。
 */
const ArrowHeadMenuComponent: React.FC<ArrowHeadMenuProps> = ({
	canvasState,
}) => {
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = canvasState.objectMenuOpenId === SECTION_ID;
	const currentStart = getSelectedArrowType(canvasState, "startArrow");
	const currentEnd = getSelectedArrowType(canvasState, "endArrow");
	const { placement } = useSubmenuPosition(menuItemRef, "arrowHead", isOpen);

	return (
		<MenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-kind="object-menu"
				data-id={`object-menu:toggle:${SECTION_ID}`}
				title="Arrow Head"
			>
				<ArrowHeadIcon />
			</ObjectMenuButton>
			{isOpen && (
				<DropdownPanel
					placement={placement}
					style={{ flexDirection: "column", width: "auto" }}
				>
					<ArrowGrid>
						<ArrowSection>
							<ArrowSectionLabel>Start</ArrowSectionLabel>
							<ArrowTypeRow>
								{ArrowTypes.map((type) => (
									<ArrowTypeButton
										key={`start-${type}`}
										isActive={currentStart === type}
										data-kind="object-menu"
										data-id={`object-menu:set:startArrow:${type}`}
										title={type}
									>
										{getArrowLabel(type)}
									</ArrowTypeButton>
								))}
							</ArrowTypeRow>
						</ArrowSection>
						<ArrowSection>
							<ArrowSectionLabel>End</ArrowSectionLabel>
							<ArrowTypeRow>
								{ArrowTypes.map((type) => (
									<ArrowTypeButton
										key={`end-${type}`}
										isActive={currentEnd === type}
										data-kind="object-menu"
										data-id={`object-menu:set:endArrow:${type}`}
										title={type}
									>
										{getArrowLabel(type)}
									</ArrowTypeButton>
								))}
							</ArrowTypeRow>
						</ArrowSection>
					</ArrowGrid>
				</DropdownPanel>
			)}
		</MenuItemPositioner>
	);
};

export const ArrowHeadMenu = memo(ArrowHeadMenuComponent);

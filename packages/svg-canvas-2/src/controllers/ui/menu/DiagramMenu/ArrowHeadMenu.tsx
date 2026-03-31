import styled from "@emotion/styled";
import { memo } from "react";

import {
	DiagramMenuButton,
	DropdownPanel,
	MenuItemPositioner,
} from "./DiagramMenuStyled";
import { ArrowTypes } from "../../../../schemas/objects/types/ArrowType";
import type { CanvasState } from "../../../../states/canvas/CanvasState";
import { ArrowHeadIcon } from "../../icons/ArrowHeadIcon";

const SECTION_ID = "arrow-head";

type ArrowHeadMenuProps = {
	canvasState: CanvasState;
};

const ArrowGrid = styled.div`
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: 4px;
`;

const ArrowSection = styled.div`
	display: flex;
	flex-direction: column;
	gap: 2px;
`;

const ArrowSectionLabel = styled.div`
	font-size: 10px;
	font-weight: 600;
	color: #6b7280;
	padding: 0 4px;
	user-select: none;
`;

const ArrowTypeRow = styled.div`
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 2px;
`;

const ArrowTypeButton = styled.button<{ isActive?: boolean }>`
	display: flex;
	align-items: center;
	justify-content: center;
	height: 24px;
	padding: 2px 6px;
	border: 1px solid ${(p) => (p.isActive ? "#6b7280" : "#e5e7eb")};
	border-radius: 4px;
	background: ${(p) => (p.isActive ? "#f3f4f6" : "transparent")};
	cursor: pointer;
	font-size: 9px;
	color: #374151;
	white-space: nowrap;
	transition: all 0.15s;

	&:hover {
		background: #f0f0f0;
		border-color: #9ca3af;
	}
`;

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
	const isOpen = canvasState.diagramMenuOpenId === SECTION_ID;
	const currentStart = getSelectedArrowType(canvasState, "startArrow");
	const currentEnd = getSelectedArrowType(canvasState, "endArrow");

	return (
		<MenuItemPositioner>
			<DiagramMenuButton
				isActive={isOpen}
				data-kind="diagram-menu"
				data-id={`diagram-menu:toggle-${SECTION_ID}`}
				title="Arrow Head"
			>
				<ArrowHeadIcon />
			</DiagramMenuButton>
			{isOpen && (
				<DropdownPanel style={{ flexDirection: "column", width: "auto" }}>
					<ArrowGrid>
						<ArrowSection>
							<ArrowSectionLabel>Start</ArrowSectionLabel>
							<ArrowTypeRow>
								{ArrowTypes.map((type) => (
									<ArrowTypeButton
										key={`start-${type}`}
										isActive={currentStart === type}
										data-kind="diagram-menu"
										data-id={`diagram-menu:set-startArrow:${type}`}
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
										data-kind="diagram-menu"
										data-id={`diagram-menu:set-endArrow:${type}`}
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

import { memo } from "react";

import {
	DiagramMenuButton,
	DropdownPanel,
	MenuItemPositioner,
} from "./DiagramMenuStyled";
import type { CanvasState } from "../../../../states/canvas/CanvasState";
import { AlignBottomIcon } from "../../icons/AlignBottomIcon";
import { AlignCenterIcon } from "../../icons/AlignCenterIcon";
import { AlignLeftIcon } from "../../icons/AlignLeftIcon";
import { AlignMiddleIcon } from "../../icons/AlignMiddleIcon";
import { AlignRightIcon } from "../../icons/AlignRightIcon";
import { AlignTopIcon } from "../../icons/AlignTopIcon";

const SECTION_ID = "alignment";

type AlignmentMenuProps = {
	canvasState: CanvasState;
};

const horizontalAlignments = [
	{ value: "left", Icon: AlignLeftIcon, title: "Left" },
	{ value: "center", Icon: AlignCenterIcon, title: "Center" },
	{ value: "right", Icon: AlignRightIcon, title: "Right" },
] as const;

const verticalAlignments = [
	{ value: "top", Icon: AlignTopIcon, title: "Top" },
	{ value: "middle", Icon: AlignMiddleIcon, title: "Middle" },
	{ value: "bottom", Icon: AlignBottomIcon, title: "Bottom" },
] as const;

/**
 * テキスト整列メニュー（見た目のみ）。
 * テキスト機能の実装後に textAlign / verticalAlign プロパティと連携予定。
 */
const AlignmentMenuComponent: React.FC<AlignmentMenuProps> = ({
	canvasState,
}) => {
	const isOpen = canvasState.diagramMenuOpenId === SECTION_ID;
	// TODO: テキスト機能実装後に現在の textAlign を取得

	return (
		<MenuItemPositioner>
			<DiagramMenuButton
				isActive={isOpen}
				data-kind="diagram-menu"
				data-id={`diagram-menu:toggle-${SECTION_ID}`}
				title="Text Alignment"
			>
				<AlignLeftIcon />
			</DiagramMenuButton>
			{isOpen && (
				<DropdownPanel
					style={{ flexDirection: "column", gap: "4px", padding: "6px" }}
				>
					<div style={{ display: "flex", gap: "2px" }}>
						{horizontalAlignments.map(({ value, Icon, title }) => (
							<DiagramMenuButton
								key={value}
								data-kind="diagram-menu"
								data-id={`diagram-menu:set-textAlign:${value}`}
								title={title}
							>
								<Icon fill="#999999" />
							</DiagramMenuButton>
						))}
					</div>
					<div style={{ display: "flex", gap: "2px" }}>
						{verticalAlignments.map(({ value, Icon, title }) => (
							<DiagramMenuButton
								key={value}
								data-kind="diagram-menu"
								data-id={`diagram-menu:set-verticalAlign:${value}`}
								title={title}
							>
								<Icon fill="#999999" />
							</DiagramMenuButton>
						))}
					</div>
				</DropdownPanel>
			)}
		</MenuItemPositioner>
	);
};

export const AlignmentMenu = memo(AlignmentMenuComponent);

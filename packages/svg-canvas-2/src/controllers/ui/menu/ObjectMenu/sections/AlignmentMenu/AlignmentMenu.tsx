import { memo, useRef } from "react";

import { AlignmentMenuContent, AlignmentRow } from "./AlignmentMenuStyled";
import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
import type { TextStyleState } from "../../../../../../states/objects/base/TextStyleState";
import { AlignBottomIcon } from "../../../../icons/AlignBottomIcon";
import { AlignCenterIcon } from "../../../../icons/AlignCenterIcon";
import { AlignLeftIcon } from "../../../../icons/AlignLeftIcon";
import { AlignMiddleIcon } from "../../../../icons/AlignMiddleIcon";
import { AlignRightIcon } from "../../../../icons/AlignRightIcon";
import { AlignTopIcon } from "../../../../icons/AlignTopIcon";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import {
	ObjectMenuButton,
	DropdownPanel,
	MenuItemPositioner,
} from "../../ObjectMenuStyled";

const SECTION_ID = "alignment";
const SUBMENU_SIZE = { width: 120, height: 50 } as const;

type AlignmentMenuProps = {
	canvasState: CanvasControllerState;
};

const horizontalAlignments = [
	{ value: "left", Icon: AlignLeftIcon, title: "Left" },
	{ value: "center", Icon: AlignCenterIcon, title: "Center" },
	{ value: "right", Icon: AlignRightIcon, title: "Right" },
] as const;

const verticalAlignments = [
	{ value: "start", Icon: AlignTopIcon, title: "Top" },
	{ value: "center", Icon: AlignMiddleIcon, title: "Middle" },
	{ value: "end", Icon: AlignBottomIcon, title: "Bottom" },
] as const;

/**
 * テキスト整列メニュー。
 * 選択中のテキストオブジェクトの textAlign と verticalAlign を変更する。
 * 各ボタンは data 属性経由でジェスチャーシステムと連携する。
 */
const AlignmentMenuComponent: React.FC<AlignmentMenuProps> = ({
	canvasState,
}) => {
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = canvasState.objectMenuOpenId === SECTION_ID;
	const { placement } = useSubmenuPosition(menuItemRef, SUBMENU_SIZE, isOpen);

	// Get textAlign and verticalAlign from the first selected object (if it has text properties)
	const { selectedIds, objects } = canvasState;
	const firstSelectedId = selectedIds[0];
	const firstSelectedObject = firstSelectedId
		? objects[firstSelectedId]
		: undefined;
	const textAlign =
		firstSelectedObject && "textAlign" in firstSelectedObject
			? ((firstSelectedObject as TextStyleState).textAlign ?? "left")
			: "left";
	const verticalAlign =
		firstSelectedObject && "verticalAlign" in firstSelectedObject
			? ((firstSelectedObject as TextStyleState).verticalAlign ?? "center")
			: "center";

	return (
		<MenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-kind="object-menu"
				data-id={`object-menu:toggle:${SECTION_ID}`}
				title="Text Alignment"
			>
				<AlignLeftIcon />
			</ObjectMenuButton>
			{isOpen && (
				<DropdownPanel placement={placement}>
					<AlignmentMenuContent>
						<AlignmentRow>
							{horizontalAlignments.map(({ value, Icon, title }) => (
								<ObjectMenuButton
									key={value}
									isActive={textAlign === value}
									data-kind="object-menu"
									data-id={`object-menu:set:textAlign:${value}`}
									title={title}
								>
									<Icon />
								</ObjectMenuButton>
							))}
						</AlignmentRow>
						<AlignmentRow>
							{verticalAlignments.map(({ value, Icon, title }) => (
								<ObjectMenuButton
									key={value}
									isActive={verticalAlign === value}
									data-kind="object-menu"
									data-id={`object-menu:set:verticalAlign:${value}`}
									title={title}
								>
									<Icon />
								</ObjectMenuButton>
							))}
						</AlignmentRow>
					</AlignmentMenuContent>
				</DropdownPanel>
			)}
		</MenuItemPositioner>
	);
};

export const AlignmentMenu = memo(AlignmentMenuComponent);

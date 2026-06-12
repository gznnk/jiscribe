import { memo, useRef } from "react";

import { AlignmentMenuContent, AlignmentRow } from "./AlignmentMenuStyled";
import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
import { getFirstSelectedWithProp } from "../../../../../../controllers/utils/getFirstSelectedWithProp";
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

type AlignmentMenuProps = {
	canvasState: CanvasControllerState;
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
 * テキスト整列メニュー。
 * 選択中のテキストオブジェクトの textAlign と verticalAlign を変更する。
 * 各ボタンは data 属性経由でジェスチャーシステムと連携する。
 */
const AlignmentMenuComponent: React.FC<AlignmentMenuProps> = ({
	canvasState,
}) => {
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = canvasState.objectMenuOpenId === SECTION_ID;
	const { submenuRef, placement, offsetX } = useSubmenuPosition(
		menuItemRef,
		isOpen,
	);

	const { selectedIds, objects } = canvasState;
	const obj = getFirstSelectedWithProp(selectedIds, objects, "textAlign") as
		| TextStyleState
		| undefined;
	const textAlign = obj?.textAlign ?? "left";
	const verticalAlign = obj?.verticalAlign ?? "middle";

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
				<DropdownPanel ref={submenuRef} placement={placement} offsetX={offsetX}>
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

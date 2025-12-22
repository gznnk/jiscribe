import type React from "react";
import { memo, useEffect, useRef, useState } from "react";

// Imports related to this component.
import { ContextMenuItem } from "../ContextMenuItem";
import { ContextMenuDiv, ContextMenuDivider } from "./ContextMenuStyled";
import type { ContextMenuStateMap, ContextMenuType } from "./ContextMenuTypes";
import type { Dimensions } from "../../../../types/core/Dimensions";

/**
 * Properties for the ContextMenu component.
 */
type ContextMenuProps = {
	x: number;
	y: number;
	containerWidth: number;
	containerHeight: number;
	menuStateMap: ContextMenuStateMap;
	isVisible: boolean;
	onMenuClick: (menuType: ContextMenuType) => void;
};

/**
 * ContextMenu component.
 */
const ContextMenuComponent: React.FC<ContextMenuProps> = ({
	x,
	y,
	containerWidth,
	containerHeight,
	menuStateMap,
	isVisible,
	onMenuClick,
}) => {
	const menuRef = useRef<HTMLDivElement>(null);
	const [menuDimensions, setMenuDimensions] = useState<Dimensions | undefined>(
		undefined,
	);

	useEffect(() => {
		if (menuRef.current && isVisible) {
			const menuRect = menuRef.current.getBoundingClientRect();
			setMenuDimensions({ width: menuRect.width, height: menuRect.height });
		} else {
			setMenuDimensions(undefined);
		}
	}, [isVisible]);

	if (!isVisible) return null;

	const menuItemProps = {
		menuStateMap,
		onMenuClick,
	};

	let adjustedX = x;
	let adjustedY = y;
	if (menuDimensions) {
		// Adjust position to keep menu within container bounds
		adjustedX =
			x + menuDimensions.width > containerWidth
				? containerWidth - menuDimensions.width
				: x;
		adjustedY =
			y + menuDimensions.height > containerHeight
				? containerHeight - menuDimensions.height
				: y;
	}

	return (
		<ContextMenuDiv
			x={adjustedX}
			y={adjustedY}
			ref={menuRef}
			zIndex={menuDimensions ? 1100 : -1}
		>
			<ContextMenuItem menuType="Undo" {...menuItemProps}>
				Undo
			</ContextMenuItem>
			<ContextMenuItem menuType="Redo" {...menuItemProps}>
				Redo
			</ContextMenuItem>
			<ContextMenuDivider />
			<ContextMenuItem menuType="Copy" {...menuItemProps}>
				Copy
			</ContextMenuItem>
			<ContextMenuItem menuType="Paste" {...menuItemProps}>
				Paste
			</ContextMenuItem>
			<ContextMenuDivider />
			<ContextMenuItem menuType="SelectAll" {...menuItemProps}>
				Select All
			</ContextMenuItem>
			<ContextMenuDivider />
			<ContextMenuItem menuType="Group" {...menuItemProps}>
				Group
			</ContextMenuItem>
			<ContextMenuItem menuType="Ungroup" {...menuItemProps}>
				Ungroup
			</ContextMenuItem>
			<ContextMenuDivider />
			<ContextMenuItem menuType="Export" {...menuItemProps}>
				Export
			</ContextMenuItem>
			<ContextMenuDivider />
			<ContextMenuItem menuType="Delete" {...menuItemProps}>
				Delete
			</ContextMenuItem>
		</ContextMenuDiv>
	);
};

export const ContextMenu = memo(ContextMenuComponent);

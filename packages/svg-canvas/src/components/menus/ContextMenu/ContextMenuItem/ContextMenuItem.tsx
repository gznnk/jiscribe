import type React from "react";
import { memo, useCallback } from "react";

// Imports related to this component.
import { ContextMenuItemDiv } from "./ContextMenuItemStyled";
import type {
	ContextMenuStateMap,
	ContextMenuType,
} from "../ContextMenu/ContextMenuTypes";

/**
 * Props for the ContextMenuItem component.
 */
type ContextMenuItemProps = {
	menuType: ContextMenuType;
	menuStateMap: ContextMenuStateMap;
	children: React.ReactNode;
	onMenuClick: (menuType: ContextMenuType) => void;
};

/**
 * Context menu item component.
 */
const ContextMenuItemComponent: React.FC<ContextMenuItemProps> = ({
	menuType,
	menuStateMap,
	onMenuClick,
	children,
}) => {
	const handleMenuClick = useCallback(() => {
		onMenuClick(menuType);
	}, [menuType, onMenuClick]);

	const menuState = menuStateMap[menuType];
	if (menuState === "Hidden") return null;

	return (
		<ContextMenuItemDiv
			className={menuState === "Disable" ? "disabled" : ""}
			onClick={handleMenuClick}
		>
			{children}
		</ContextMenuItemDiv>
	);
};

export const ContextMenuItem = memo(ContextMenuItemComponent);

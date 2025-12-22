import type React from "react";
import { memo } from "react";

// Imports related to this component.
import { CanvasMenuItemDiv } from "./CanvasMenuItemStyled";
// Import types related to SvgCanvas.
import type { CanvasMenuItem as MenuItemConfig } from "../../../../constants/menu/canvas/CanvasMenuItems";

type CanvasMenuItemProps = {
	config: MenuItemConfig;
	onClick?: (config: MenuItemConfig) => void;
};

const CanvasMenuItemComponent: React.FC<CanvasMenuItemProps> = ({
	config,
	onClick,
}) => {
	return (
		<CanvasMenuItemDiv
			onClick={() => onClick?.(config)}
			title={config.label}
			data-testid={`canvas-menu-item-${config.id}`}
		>
			{config.icon}
		</CanvasMenuItemDiv>
	);
};

export const CanvasMenuItem = memo(CanvasMenuItemComponent);

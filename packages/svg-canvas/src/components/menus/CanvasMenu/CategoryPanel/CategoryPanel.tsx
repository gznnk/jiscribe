import type React from "react";
import { memo } from "react";

import type {
	CanvasMenuCategory,
	CanvasMenuItem as MenuItemConfig,
} from "../../../../constants/menu/canvas/CanvasMenuItems";
import { CanvasMenuItem } from "../CanvasMenuItem";
import {
	CategoryPanelContainer,
	CategoryPanelTitle,
	CategoryPanelItemsGrid,
} from "./CategoryPanelStyled";

type CategoryPanelProps = {
	category: CanvasMenuCategory;
	onItemClick: (config: MenuItemConfig) => void;
};

const CategoryPanelComponent: React.FC<CategoryPanelProps> = ({
	category,
	onItemClick,
}) => {
	return (
		<CategoryPanelContainer>
			<CategoryPanelTitle>{category.label}</CategoryPanelTitle>
			<CategoryPanelItemsGrid>
				{category.items.map((item) => (
					<CanvasMenuItem key={item.id} config={item} onClick={onItemClick} />
				))}
			</CategoryPanelItemsGrid>
		</CategoryPanelContainer>
	);
};

export const CategoryPanel = memo(CategoryPanelComponent);

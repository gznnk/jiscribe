import type React from "react";
import { memo, useState } from "react";

// Imports related to this component.
import {
	CanvasMenuDiv,
	CanvasMenuCategoryButton,
	CanvasMenuPositioner,
} from "./CanvasMenuStyled";
import {
	CANVAS_MENU_CATEGORIES,
	type CanvasMenuItem as MenuItemConfig,
} from "../../../../constants/menu/canvas/CanvasMenuItems";
import type { AddDiagramByTypeEvent } from "../../../../types/events/AddDiagramByTypeEvent";
import { newEventId } from "../../../../utils/core/newEventId";
import { CategoryPanel } from "../CategoryPanel/CategoryPanel";

type CanvasMenuProps = {
	onAddDiagramByType?: (e: AddDiagramByTypeEvent) => void;
};

const CanvasMenuComponent: React.FC<CanvasMenuProps> = ({
	onAddDiagramByType,
}) => {
	const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

	const handleCategoryClick = (categoryId: string) => {
		setActiveCategoryId((prev) => (prev === categoryId ? null : categoryId));
	};

	const handleItemClick = (config: MenuItemConfig) => {
		onAddDiagramByType?.({
			eventId: newEventId(),
			diagramType: config.diagramType,
			isSelected: true,
			...(config.variant && { variant: config.variant }),
		});
	};

	const activeCategory = CANVAS_MENU_CATEGORIES.find(
		(cat) => cat.id === activeCategoryId,
	);

	return (
		<CanvasMenuPositioner>
			<CanvasMenuDiv draggable={false}>
				{CANVAS_MENU_CATEGORIES.map((category) => (
					<CanvasMenuCategoryButton
						key={category.id}
						isActive={category.id === activeCategoryId}
						onClick={() => handleCategoryClick(category.id)}
						title={category.label}
					>
						{category.icon}
					</CanvasMenuCategoryButton>
				))}
			</CanvasMenuDiv>

			{activeCategory && (
				<CategoryPanel
					category={activeCategory}
					onItemClick={handleItemClick}
				/>
			)}
		</CanvasMenuPositioner>
	);
};

export const CanvasMenu = memo(CanvasMenuComponent);

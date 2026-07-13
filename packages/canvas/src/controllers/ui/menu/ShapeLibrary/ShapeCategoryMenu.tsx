import { memo } from "react";

import type { ShapeCategory } from "./shapeCategories";
import { ShapeLibraryItem } from "./ShapeLibraryItem";
import {
	ShapeCategoryButton,
	ShapeCategoryContainer,
	ShapeCategoryFlyout,
} from "./ShapeLibraryStyled";
import type { ShapePreset } from "../../../../schemas/objects/types/ShapePreset";
import { useCanvasMessages } from "../../../messages/CanvasMessagesContext";
import { ChevronDownIcon } from "../../icons/ChevronDownIcon";

type ShapeCategoryMenuProps = {
	category: ShapeCategory;
	/** Presets belonging to this category (already ordered). */
	presets: readonly ShapePreset[];
	isOpen: boolean;
	/** Preset id currently in drawing mode, to highlight the matching flyout item. */
	activePresetId: string | null;
};

const ICON_SIZE = 24;
const CARET_SIZE = 14;

/**
 * A category button in the toolbar plus its flyout. Both the button (toggle) and
 * the flyout items go through the gesture system (`data-kind="menu"`): the toggle
 * is handled by ShapeCategoryToggleHandler and each item by ShapeLibraryItemHandler.
 * Open/close is reducer state (`shapeLibraryOpenCategory`), so this component is
 * purely presentational and multiple <Canvas> instances stay independent.
 */
const ShapeCategoryMenuComponent: React.FC<ShapeCategoryMenuProps> = ({
	category,
	presets,
	isOpen,
	activePresetId,
}) => {
	const messages = useCanvasMessages();
	const label = messages.shapeCategoryLabels[category.id] ?? category.label;
	const Icon = category.icon;

	return (
		<ShapeCategoryContainer>
			<ShapeCategoryButton
				type="button"
				data-kind="menu"
				data-id="shape-category"
				data-part={`toggle:${category.id}`}
				aria-haspopup="true"
				aria-expanded={isOpen}
				title={label}
				isOpen={isOpen}
			>
				<Icon width={ICON_SIZE} height={ICON_SIZE} />
				<ChevronDownIcon width={CARET_SIZE} height={CARET_SIZE} />
			</ShapeCategoryButton>
			{isOpen && (
				<ShapeCategoryFlyout data-category-flyout={category.id}>
					{presets.map((preset) => (
						<ShapeLibraryItem
							key={preset.id}
							preset={preset}
							isActive={activePresetId === preset.id}
						/>
					))}
				</ShapeCategoryFlyout>
			)}
		</ShapeCategoryContainer>
	);
};

export const ShapeCategoryMenu = memo(ShapeCategoryMenuComponent);

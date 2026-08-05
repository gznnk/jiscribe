import { memo, type ComponentType } from "react";

import { StencilLibraryItem } from "./StencilLibraryItem";
import {
	StencilCategoryButton,
	StencilCategoryContainer,
	StencilCategoryFlyout,
} from "./StencilLibraryStyled";
import { useCanvasLocale } from "../../../messages/CanvasLocaleContext";
import { useCanvasMessages } from "../../../messages/CanvasMessagesContext";
import {
	resolveLocalizedLabel,
	type LocaleMessages,
} from "../../../messages/resolveLocaleMessages";
import { ChevronDownIcon } from "../../icons/ChevronDownIcon";
import type { StencilIconProps, Stencil } from "../../objects/Stencil";

type StencilCategoryMenuProps = {
	/** Flyout open/close key and host label-override key. */
	id: string;
	label: string | LocaleMessages<string>;
	icon: ComponentType<StencilIconProps>;
	/** Presets belonging to this category (already ordered). */
	presets: readonly Stencil[];
	isOpen: boolean;
	/** Preset id currently in drawing mode, to highlight the matching flyout item. */
	activePresetId: string | null;
};

const ICON_SIZE = 24;
const CARET_SIZE = 14;

/**
 * A category button in the toolbar plus its flyout. Both the button (toggle) and
 * the flyout items go through the gesture system (`data-kind="menu"`): the toggle
 * is handled by StencilCategoryToggleHandler and each item by StencilLibraryItemHandler.
 * Open/close is reducer state (`stencilLibraryOpenCategory`), so this component is
 * purely presentational and multiple <Canvas> instances stay independent.
 */
const StencilCategoryMenuComponent: React.FC<StencilCategoryMenuProps> = ({
	id,
	label: categoryLabel,
	icon: Icon,
	presets,
	isOpen,
	activePresetId,
}) => {
	const messages = useCanvasMessages();
	const locale = useCanvasLocale();
	const label =
		messages.stencilCategoryLabels[id] ??
		resolveLocalizedLabel(categoryLabel, locale);

	return (
		<StencilCategoryContainer>
			<StencilCategoryButton
				type="button"
				data-kind="menu"
				data-id="stencil-category"
				data-part={`toggle:${id}`}
				aria-haspopup="true"
				aria-expanded={isOpen}
				title={label}
				isOpen={isOpen}
			>
				<Icon width={ICON_SIZE} height={ICON_SIZE} />
				<ChevronDownIcon width={CARET_SIZE} height={CARET_SIZE} />
			</StencilCategoryButton>
			{/* The flyout claims its own gesture target so a press on its padding is
			    not read as a press on the toolbar background (which closes it). */}
			{isOpen && (
				<StencilCategoryFlyout
					data-category-flyout={id}
					data-kind="menu"
					data-id="stencil-category"
				>
					{presets.map((preset) => (
						<StencilLibraryItem
							key={preset.id}
							preset={preset}
							isActive={activePresetId === preset.id}
						/>
					))}
				</StencilCategoryFlyout>
			)}
		</StencilCategoryContainer>
	);
};

export const StencilCategoryMenu = memo(StencilCategoryMenuComponent);

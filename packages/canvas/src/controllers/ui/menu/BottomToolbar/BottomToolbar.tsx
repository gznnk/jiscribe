import { memo } from "react";

import { BottomToolbarContainer } from "./BottomToolbarStyled";
import { useCanvasMessages } from "../../../../foundation/i18n/CanvasMessagesContext";
import { ShapesIcon } from "../../icons/ShapesIcon";
import type { Stencil } from "../../objects/Stencil";
import { StencilLibraryItem } from "../StencilLibrary/StencilLibraryItem";
import { ToolbarDivider, ToolbarIconButton } from "../Toolbar/ToolbarStyled";

type BottomToolbarProps = {
	/** Presets pinned on the bar, already resolved (see resolveBottomToolbarPresets). */
	presets: readonly Stencil[];
	/** ID of the stencil currently being drawn (for the tool's active state) */
	activePresetId: string | null;
};

/**
 * The bottom tool bar: the pinned presets, then a divider and the "Other
 * shapes" button. When Canvas shows it: see its `bottomToolbar` prop.
 *
 * The presets are the same StencilLibraryItem the top bar and the shape
 * library draw, so a click arms or places and a drag places exactly as there
 * (StencilLibraryItemHandler). The bar itself is the `bottom-toolbar` menu
 * target, so a press on its empty area dismisses the open menus as one on the
 * top bar's does (ToolbarHandler).
 */
const BottomToolbarComponent: React.FC<BottomToolbarProps> = ({
	presets,
	activePresetId,
}) => {
	const messages = useCanvasMessages();
	return (
		<BottomToolbarContainer data-kind="menu" data-id="bottom-toolbar">
			{presets.map((preset) => (
				<StencilLibraryItem
					key={preset.id}
					preset={preset}
					isActive={activePresetId === preset.id}
				/>
			))}
			{presets.length > 0 && <ToolbarDivider />}
			{/* Placeholder: drawn but not wired to anything yet. It carries no
			    data-action, so a press on it is a press on the bar's empty area. */}
			<ToolbarIconButton
				type="button"
				aria-label={messages.bottomToolbarOtherShapes}
				title={messages.bottomToolbarOtherShapes}
				data-testid="bottom-toolbar-other-shapes"
			>
				<ShapesIcon />
			</ToolbarIconButton>
		</BottomToolbarContainer>
	);
};

export const BottomToolbar = memo(BottomToolbarComponent);

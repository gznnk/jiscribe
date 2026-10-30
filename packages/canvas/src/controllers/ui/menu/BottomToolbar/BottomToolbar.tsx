import { memo } from "react";

import {
	BottomToolbarContainer,
	BottomToolbarDivider,
} from "./BottomToolbarStyled";
import { useCanvasMessages } from "../../../../foundation/i18n/CanvasMessagesContext";
import { OTHER_SHAPES_BUTTON_TARGET_ID } from "../../../gestures/handlers/menu/utils/otherShapesTargetIds";
import { ShapesIcon } from "../../icons/ShapesIcon";
import type { Stencil } from "../../objects/Stencil";
import { StencilLibraryItem } from "../StencilLibrary/StencilLibraryItem";
import { ToolbarToggleButton } from "../Toolbar/ToolbarStyled";

type BottomToolbarProps = {
	/** Presets pinned on the bar, already resolved (see resolveBottomToolbarPresets). */
	presets: readonly Stencil[];
	/** ID of the stencil currently being drawn (for the tool's active state) */
	activePresetId: string | null;
	/** Whether the Other shapes popover is open, which the button shows pressed. */
	isOtherShapesPopoverOpen: boolean;
};

/**
 * The bottom tool bar: the pinned presets, then a divider and the "Other
 * shapes" button, in one column down the viewport's left edge. When Canvas
 * shows it: see its `bottomToolbar` prop.
 *
 * The button is a menu target of its own (`other-shapes-button`, taken by
 * OtherShapesToggleHandler) that opens and closes the OtherShapesPopover,
 * which Canvas draws beside the bar and outside it.
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
	isOtherShapesPopoverOpen,
}) => {
	const messages = useCanvasMessages();
	return (
		<BottomToolbarContainer
			data-kind="menu"
			data-id="bottom-toolbar"
			data-gesture="native-wheel"
		>
			{presets.map((preset) => (
				<StencilLibraryItem
					key={preset.id}
					preset={preset}
					isActive={activePresetId === preset.id}
				/>
			))}
			{presets.length > 0 && <BottomToolbarDivider />}
			<ToolbarToggleButton
				type="button"
				aria-label={messages.bottomToolbarOtherShapes}
				title={messages.bottomToolbarOtherShapes}
				aria-haspopup="dialog"
				aria-expanded={isOtherShapesPopoverOpen}
				isOpen={isOtherShapesPopoverOpen}
				data-kind="menu"
				data-id={OTHER_SHAPES_BUTTON_TARGET_ID}
				data-testid="bottom-toolbar-other-shapes"
			>
				<ShapesIcon />
			</ToolbarToggleButton>
		</BottomToolbarContainer>
	);
};

export const BottomToolbar = memo(BottomToolbarComponent);

import { memo } from "react";

import { OtherShapesPopoverContainer } from "./BottomToolbarStyled";
import { useCanvasMessages } from "../../../../foundation/i18n/CanvasMessagesContext";
import { OTHER_SHAPES_POPOVER_TARGET_ID } from "../../../gestures/handlers/menu/utils/otherShapesTargetIds";
import type { Stencil } from "../../objects/Stencil";
import { StencilLibraryBody } from "../StencilLibrary/StencilLibraryBody";
import type { ResolvedStencilCategory } from "../StencilLibrary/utils/resolveStencilCategory";

type OtherShapesPopoverProps = {
	/** The shape library's sections, the same ones the sidebar draws. */
	sections: readonly ResolvedStencilCategory[];
	/** Ids of the collapsed sections, shared with the sidebar. */
	collapsedSectionIds: readonly string[];
	/** Preset id currently in drawing mode, to highlight the matching item. */
	activePresetId: string | null;
	/** Looks up a preset a category's `search` answers; keep it stable. */
	resolvePreset: (presetId: string) => Stencil | undefined;
};

/**
 * The popover the bottom tool bar's "Other shapes" button opens: the shape
 * library sidebar's search box and sections without its header, over the
 * canvas above the bar. Mounted only while open, so its search starts empty
 * each time.
 *
 * Its own menu target (`other-shapes-popover`), so a press on its padding is
 * neither a press on the canvas nor one on the bar; StencilLibraryPanelHandler
 * takes it and the section headers as it does the sidebar's. The items keep
 * their `stencil-library` target, and using one closes the popover
 * (StencilLibraryItemHandler).
 */
const OtherShapesPopoverComponent: React.FC<OtherShapesPopoverProps> = ({
	sections,
	collapsedSectionIds,
	activePresetId,
	resolvePreset,
}) => {
	const messages = useCanvasMessages();
	return (
		<OtherShapesPopoverContainer
			role="dialog"
			aria-label={messages.bottomToolbarOtherShapes}
			data-kind="menu"
			data-id={OTHER_SHAPES_POPOVER_TARGET_ID}
			data-gesture="chrome-wheel"
		>
			<StencilLibraryBody
				sections={sections}
				collapsedSectionIds={collapsedSectionIds}
				activePresetId={activePresetId}
				resolvePreset={resolvePreset}
			/>
		</OtherShapesPopoverContainer>
	);
};

export const OtherShapesPopover = memo(OtherShapesPopoverComponent);

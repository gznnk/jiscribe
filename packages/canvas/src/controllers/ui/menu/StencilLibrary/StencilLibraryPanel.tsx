import { memo } from "react";

import { StencilLibraryBody } from "./StencilLibraryBody";
import {
	StencilLibraryPanelCloseButton,
	StencilLibraryPanelContainer,
	StencilLibraryPanelHeader,
	StencilLibraryPanelTitle,
} from "./StencilLibraryPanelStyled";
import type { ResolvedStencilCategory } from "./utils/resolveStencilCategory";
import { useCanvasMessages } from "../../../../foundation/i18n/CanvasMessagesContext";
import { CloseIcon } from "../../icons/CloseIcon";
import type { Stencil } from "../../objects/Stencil";

type StencilLibraryPanelProps = {
	/** Sections in display order, each already resolved against the registry. */
	sections: readonly ResolvedStencilCategory[];
	/** Ids of the collapsed sections; anything not listed is expanded. */
	collapsedSectionIds: readonly string[];
	/** Preset id currently in drawing mode, to highlight the matching item. */
	activePresetId: string | null;
	/**
	 * Looks a preset up by id, for the ids a category's `search` answers beyond its
	 * listed presets. Keep it stable: the panel is memoized.
	 */
	resolvePreset: (presetId: string) => Stencil | undefined;
};

const CLOSE_ICON_SIZE = 14;

/**
 * The shape library sidebar: every stencil the host declared in
 * `stencilLibrary.sections`, grouped into collapsible sections.
 *
 * The panel is one gesture target (`data-kind="menu" data-id="stencil-library-panel"`)
 * handled by StencilLibraryPanelHandler: its section headers and close button carry
 * only a data-action. The stencil items keep their own `data-kind` / `data-id`
 * ("stencil-library"), so click-to-draw and drag-to-place stay with
 * StencilLibraryItemHandler exactly as on the toolbars.
 *
 * Open/collapse state is reducer state, so this component is render-only; the
 * search box and the sections below the header are StencilLibraryBody's.
 */
const StencilLibraryPanelComponent: React.FC<StencilLibraryPanelProps> = ({
	sections,
	collapsedSectionIds,
	activePresetId,
	resolvePreset,
}) => {
	const messages = useCanvasMessages();

	return (
		<StencilLibraryPanelContainer
			aria-label={messages.stencilLibraryTitle}
			data-kind="menu"
			data-id="stencil-library-panel"
		>
			<StencilLibraryPanelHeader>
				<StencilLibraryPanelTitle>
					{messages.stencilLibraryTitle}
				</StencilLibraryPanelTitle>
				<StencilLibraryPanelCloseButton
					type="button"
					aria-label={messages.stencilLibraryClose}
					title={messages.stencilLibraryClose}
					data-action="close"
				>
					<CloseIcon width={CLOSE_ICON_SIZE} height={CLOSE_ICON_SIZE} />
				</StencilLibraryPanelCloseButton>
			</StencilLibraryPanelHeader>

			<StencilLibraryBody
				sections={sections}
				collapsedSectionIds={collapsedSectionIds}
				activePresetId={activePresetId}
				resolvePreset={resolvePreset}
			/>
		</StencilLibraryPanelContainer>
	);
};

export const StencilLibraryPanel = memo(StencilLibraryPanelComponent);

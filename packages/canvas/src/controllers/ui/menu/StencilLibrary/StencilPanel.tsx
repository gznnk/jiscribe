import { memo } from "react";

import { StencilCatalogPanelContent } from "./StencilCatalogPanelContent";
import { StencilCategoryPanelContent } from "./StencilCategoryPanelContent";
import {
	StencilPanelContainer,
	type StencilPanelPresentation,
} from "./StencilPanelStyled";
import type { ResolvedStencilCategory } from "./utils/resolveStencilCategory";
import { resolveStencilCategoryLabel } from "./utils/resolveStencilLabel";
import { useCanvasLocale } from "../../../../foundation/i18n/CanvasLocaleContext";
import { useCanvasMessages } from "../../../../foundation/i18n/CanvasMessagesContext";
import type { StencilPanelContent } from "../../../CanvasTypes";
import {
	CLOSE_PANEL_ACTION,
	DOCK_PANEL_ACTION,
	UNDOCK_PANEL_ACTION,
} from "../../../gestures/handlers/menu/utils/menuActions";
import { CloseIcon } from "../../icons/CloseIcon";
import { SidebarIcon } from "../../icons/SidebarIcon";
import type { Stencil } from "../../objects/Stencil";
import {
	SidePanelHeader,
	SidePanelHeaderButton,
	SidePanelHeaderButtons,
	SidePanelTitle,
} from "../SidePanel/SidePanelStyled";

type StencilPanelProps = {
	/** Over the canvas (the flyout) or docked beside it; decides the keep-open toggle's state. */
	presentation: StencilPanelPresentation;
	/**
	 * What the panel draws: its reducer state as readDrawnStencilPanelContent
	 * resolves it against the library the reducer holds, so a category named here
	 * is one the library has.
	 */
	drawnContent: StencilPanelContent;
	/** Every library section in declaration order, already resolved against the registry. */
	sections: readonly ResolvedStencilCategory[];
	/** The user's pins (reducer state), for the catalog's pin toggles. */
	pinnedCategoryIds: readonly string[];
	/** Preset id currently in drawing mode, to highlight the matching item. */
	activePresetId: string | null;
	/**
	 * Looks a preset up by id, for the ids a category's `search` answers beyond its
	 * listed presets. Keep it stable: the panel is memoized.
	 */
	resolvePreset: (presetId: string) => Stencil | undefined;
};

const HEADER_ICON_SIZE = 14;

/**
 * A stencil panel: one library category's presets, or the catalog of every
 * category (StencilCategoryPanelContent / StencilCatalogPanelContent). The same
 * panel is drawn over the canvas as the flyout and docked beside it; only the
 * keep-open toggle in its header tells the two apart.
 *
 * The panel is one gesture target
 * (`data-kind="menu" data-id="stencil-library-panel"`) handled by
 * StencilLibraryPanelHandler: its header buttons and the catalog's rows carry
 * only a data-action. The stencil items keep their own `data-kind` /
 * `data-id` ("stencil-library"), so click-to-draw and drag-to-place stay with
 * StencilLibraryItemHandler exactly as on the rail. While it shows a category it
 * also carries `data-stencil-category-panel`, the hook the e2e suites find it by.
 *
 * What it draws arrives already resolved (Canvas reads it with
 * readDrawnStencilPanelContent, which draws a category the library lacks as the
 * catalog), so this component is render-only apart from the search query, which
 * belongs to the content shown and goes with it.
 */
const StencilPanelComponent: React.FC<StencilPanelProps> = ({
	presentation,
	drawnContent,
	sections,
	pinnedCategoryIds,
	activePresetId,
	resolvePreset,
}) => {
	const messages = useCanvasMessages();
	const locale = useCanvasLocale();

	// Can miss only in the commit that renders a new library before
	// SET_STENCIL_LIBRARY reaches the reducer (in a layout effect, before paint);
	// that frame is drawn as the catalog and never shown.
	const shownSection =
		drawnContent.kind === "category"
			? sections.find(
					(section) => section.category.id === drawnContent.categoryId,
				)
			: undefined;
	const title = shownSection
		? resolveStencilCategoryLabel(
				shownSection.category.id,
				shownSection.category.label,
				messages,
				locale,
			)
		: messages.stencilCatalogTitle;
	const isDocked = presentation === "docked";

	return (
		<StencilPanelContainer
			presentation={presentation}
			aria-label={title}
			data-kind="menu"
			data-id="stencil-library-panel"
			data-presentation={presentation}
			data-stencil-category-panel={shownSection?.category.id}
		>
			<SidePanelHeader>
				<SidePanelTitle>{title}</SidePanelTitle>
				<SidePanelHeaderButtons>
					<SidePanelHeaderButton
						type="button"
						aria-label={messages.stencilPanelKeepOpen}
						title={messages.stencilPanelKeepOpen}
						aria-pressed={isDocked}
						data-action={isDocked ? UNDOCK_PANEL_ACTION : DOCK_PANEL_ACTION}
					>
						<SidebarIcon
							edge="left"
							width={HEADER_ICON_SIZE}
							height={HEADER_ICON_SIZE}
						/>
					</SidePanelHeaderButton>
					<SidePanelHeaderButton
						type="button"
						aria-label={messages.stencilPanelClose}
						title={messages.stencilPanelClose}
						data-action={CLOSE_PANEL_ACTION}
					>
						<CloseIcon width={HEADER_ICON_SIZE} height={HEADER_ICON_SIZE} />
					</SidePanelHeaderButton>
				</SidePanelHeaderButtons>
			</SidePanelHeader>
			{shownSection ? (
				<StencilCategoryPanelContent
					key={`category:${shownSection.category.id}`}
					section={shownSection}
					activePresetId={activePresetId}
					resolvePreset={resolvePreset}
				/>
			) : (
				<StencilCatalogPanelContent
					key="catalog"
					sections={sections}
					pinnedCategoryIds={pinnedCategoryIds}
					activePresetId={activePresetId}
					resolvePreset={resolvePreset}
				/>
			)}
		</StencilPanelContainer>
	);
};

export const StencilPanel = memo(StencilPanelComponent);

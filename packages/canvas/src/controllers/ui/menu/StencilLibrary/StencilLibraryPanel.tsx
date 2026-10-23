import { memo, useMemo, useRef, useState } from "react";

import { StencilLibraryItem } from "./StencilLibraryItem";
import {
	StencilLibraryEmptyMessage,
	StencilLibraryMoreMatchesMessage,
	StencilLibraryMoreViaSearchButton,
	StencilLibraryPanelCloseButton,
	StencilLibraryPanelContainer,
	StencilLibraryPanelGrid,
	StencilLibraryPanelHeader,
	StencilLibraryPanelList,
	StencilLibraryPanelTitle,
	StencilLibrarySearchBox,
	StencilLibrarySearchInput,
	StencilLibrarySectionChevron,
	StencilLibrarySectionHeader,
	StencilLibrarySectionIcon,
	StencilLibrarySectionLabel,
} from "./StencilLibraryPanelStyled";
import type { ResolvedStencilCategory } from "./utils/resolveStencilCategory";
import {
	resolveStencilCategoryLabel,
	resolveStencilLabel,
} from "./utils/resolveStencilLabel";
import { searchStencilLibrary } from "./utils/searchStencilLibrary";
import { useCanvasLocale } from "../../../messages/CanvasLocaleContext";
import { useCanvasMessages } from "../../../messages/CanvasMessagesContext";
import { ChevronRightIcon } from "../../icons/ChevronRightIcon";
import { CloseIcon } from "../../icons/CloseIcon";
import { SearchIcon } from "../../icons/SearchIcon";
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

const CHEVRON_SIZE = 12;
const SECTION_ICON_SIZE = 16;
const CLOSE_ICON_SIZE = 14;
const SEARCH_ICON_SIZE = 14;

/**
 * The shape library sidebar: every stencil the host declared in
 * `stencilLibrary.sections`, grouped into collapsible sections.
 *
 * The panel is one gesture target (`data-kind="menu" data-id="stencil-library-panel"`)
 * handled by StencilLibraryPanelHandler: its section headers and close button carry
 * only a data-action. The stencil items keep their own `data-kind` / `data-id`
 * ("stencil-library"), so click-to-draw and drag-to-place stay with
 * StencilLibraryItemHandler exactly as in the toolbar.
 *
 * Open/collapse state is reducer state, so this component is render-only. The
 * search query is not: it belongs to this instance of the panel alone and no
 * handler or command reads it, and it goes with the panel when that closes
 * (Canvas unmounts it).
 */
const StencilLibraryPanelComponent: React.FC<StencilLibraryPanelProps> = ({
	sections,
	collapsedSectionIds,
	activePresetId,
	resolvePreset,
}) => {
	const messages = useCanvasMessages();
	const locale = useCanvasLocale();
	const [query, setQuery] = useState("");
	const searchInputRef = useRef<HTMLInputElement>(null);

	const trimmedQuery = query.trim();

	// While searching, the sections collapse into one list: a shape is looked up
	// by name, not by where it was filed.
	const searchResult = useMemo(
		() =>
			searchStencilLibrary(
				sections,
				trimmedQuery,
				(preset) => resolveStencilLabel(preset, messages, locale),
				resolvePreset,
			),
		[sections, trimmedQuery, messages, locale, resolvePreset],
	);
	const matchedPresets = searchResult.presets;
	const searchResultList =
		matchedPresets.length > 0 ? (
			<>
				<StencilLibraryPanelGrid>
					{matchedPresets.map((preset) => (
						<StencilLibraryItem
							key={preset.id}
							preset={preset}
							isActive={activePresetId === preset.id}
						/>
					))}
				</StencilLibraryPanelGrid>
				{searchResult.hiddenMatchCount > 0 && (
					<StencilLibraryMoreMatchesMessage>
						{messages.stencilLibraryMoreMatches}
					</StencilLibraryMoreMatchesMessage>
				)}
			</>
		) : (
			<StencilLibraryEmptyMessage>
				{messages.stencilLibraryNoMatch}
			</StencilLibraryEmptyMessage>
		);

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

			<StencilLibrarySearchBox data-gesture="none">
				<SearchIcon width={SEARCH_ICON_SIZE} height={SEARCH_ICON_SIZE} />
				<StencilLibrarySearchInput
					type="text"
					ref={searchInputRef}
					value={query}
					placeholder={messages.stencilLibrarySearchPlaceholder}
					aria-label={messages.stencilLibrarySearchPlaceholder}
					onChange={(event) => setQuery(event.target.value)}
				/>
			</StencilLibrarySearchBox>

			<StencilLibraryPanelList>
				{trimmedQuery !== ""
					? searchResultList
					: sections.map((section) => {
							const Icon = section.category.icon;
							const isExpanded = !collapsedSectionIds.includes(
								section.category.id,
							);
							return (
								<div key={section.category.id}>
									<StencilLibrarySectionHeader
										type="button"
										aria-expanded={isExpanded}
										data-action={`section:${section.category.id}`}
									>
										<StencilLibrarySectionChevron isExpanded={isExpanded}>
											<ChevronRightIcon
												width={CHEVRON_SIZE}
												height={CHEVRON_SIZE}
											/>
										</StencilLibrarySectionChevron>
										<StencilLibrarySectionIcon>
											<Icon
												width={SECTION_ICON_SIZE}
												height={SECTION_ICON_SIZE}
											/>
										</StencilLibrarySectionIcon>
										<StencilLibrarySectionLabel>
											{resolveStencilCategoryLabel(
												section.category.id,
												section.category.label,
												messages,
												locale,
											)}
										</StencilLibrarySectionLabel>
									</StencilLibrarySectionHeader>
									{isExpanded && (
										<StencilLibraryPanelGrid>
											{section.presets.map((preset) => (
												<StencilLibraryItem
													key={preset.id}
													preset={preset}
													isActive={activePresetId === preset.id}
												/>
											))}
										</StencilLibraryPanelGrid>
									)}
									{isExpanded && section.category.search !== undefined && (
										<StencilLibraryMoreViaSearchButton
											type="button"
											data-gesture="none"
											onClick={() => searchInputRef.current?.focus()}
										>
											{messages.stencilLibraryMoreViaSearch}
										</StencilLibraryMoreViaSearchButton>
									)}
								</div>
							);
						})}
			</StencilLibraryPanelList>
		</StencilLibraryPanelContainer>
	);
};

export const StencilLibraryPanel = memo(StencilLibraryPanelComponent);

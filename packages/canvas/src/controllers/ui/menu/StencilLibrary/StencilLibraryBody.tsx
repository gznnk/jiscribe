import { memo, useMemo, useRef, useState } from "react";

import { StencilLibraryItem } from "./StencilLibraryItem";
import {
	StencilLibraryEmptyMessage,
	StencilLibraryMoreMatchesMessage,
	StencilLibraryMoreViaSearchButton,
	StencilLibraryPanelGrid,
	StencilLibraryPanelList,
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
import { useCanvasLocale } from "../../../../foundation/i18n/CanvasLocaleContext";
import { useCanvasMessages } from "../../../../foundation/i18n/CanvasMessagesContext";
import { ChevronRightIcon } from "../../icons/ChevronRightIcon";
import { SearchIcon } from "../../icons/SearchIcon";
import type { Stencil } from "../../objects/Stencil";

type StencilLibraryBodyProps = {
	/** Sections in display order, each already resolved against the registry. */
	sections: readonly ResolvedStencilCategory[];
	/** Ids of the collapsed sections; anything not listed is expanded. */
	collapsedSectionIds: readonly string[];
	/** Preset id currently in drawing mode, to highlight the matching item. */
	activePresetId: string | null;
	/**
	 * Looks a preset up by id, for the ids a category's `search` answers beyond its
	 * listed presets. Keep it stable: the body is memoized.
	 */
	resolvePreset: (presetId: string) => Stencil | undefined;
};

const CHEVRON_SIZE = 12;
const SECTION_ICON_SIZE = 16;
const SEARCH_ICON_SIZE = 14;

/**
 * The shape library's search box and its collapsible sections (or, while
 * searching, the flat list of matches), drawn by both the sidebar
 * (StencilLibraryPanel) and the stencil bar's Other shapes popover. Its
 * container is the gesture target: the section headers carry only a
 * `section:` data-action, and StencilLibraryPanelHandler takes them for
 * either container.
 *
 * The search query belongs to this instance alone and no handler or command
 * reads it, so the sidebar and the popover never share one, and it goes with
 * the container when that unmounts.
 */
const StencilLibraryBodyComponent: React.FC<StencilLibraryBodyProps> = ({
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
		<>
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
		</>
	);
};

export const StencilLibraryBody = memo(StencilLibraryBodyComponent);

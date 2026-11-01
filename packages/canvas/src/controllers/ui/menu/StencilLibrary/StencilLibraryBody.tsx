import {
	memo,
	useCallback,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";

import { StencilLibraryBrowseGroup } from "./StencilLibraryBrowseGroup";
import { StencilLibraryItem } from "./StencilLibraryItem";
import {
	StencilLibraryBackButton,
	StencilLibraryBrowseHeader,
	StencilLibraryEmptyMessage,
	StencilLibraryMoreMatchesMessage,
	StencilLibraryPanelGrid,
	StencilLibraryPanelList,
	StencilLibrarySearchBox,
	StencilLibrarySearchInput,
	StencilLibrarySectionChevron,
	StencilLibrarySectionFooterButton,
	StencilLibrarySectionHeader,
	StencilLibrarySectionIcon,
	StencilLibrarySectionLabel,
} from "./StencilLibraryPanelStyled";
import type { ResolvedStencilCategory } from "./utils/resolveStencilCategory";
import {
	resolveStencilCategoryLabel,
	resolveStencilLabel,
} from "./utils/resolveStencilLabel";
import {
	searchStencilLibrary,
	searchStencilLibraryCategory,
} from "./utils/searchStencilLibrary";
import { useCanvasLocale } from "../../../../foundation/i18n/CanvasLocaleContext";
import { useCanvasMessages } from "../../../../foundation/i18n/CanvasMessagesContext";
import { resolveLocalizedLabel } from "../../../../foundation/i18n/resolveLocaleMessages";
import { ChevronLeftIcon } from "../../icons/ChevronLeftIcon";
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
const BACK_ICON_SIZE = 14;

/** A press of the back button, waiting for the sections to be drawn again. */
type PendingBack = {
	/** The category whose "show all" button gets the focus back. */
	categoryId: string;
	/** Where the sections' list was scrolled when the view opened. */
	scrollTop: number;
};

/**
 * The shape library's search box and its collapsible sections (or, while
 * searching, the flat list of matches), drawn by both the sidebar
 * (StencilLibraryPanel) and the stencil bar's Other shapes popover. Its
 * container is the gesture target: the section headers carry only a
 * `section:` data-action, and StencilLibraryPanelHandler takes them for
 * either container.
 *
 * A section declaring `browseGroups` offers a "show all" view in their place:
 * a back row, the same search box (scoped to that category) and its groups as
 * sections of their own (StencilLibraryBrowseGroup).
 *
 * The search query, the view and the "show all" groups' fold state belong to
 * this instance alone and no handler or command reads them, so the sidebar and
 * the popover never share them, and they go with the container when that
 * unmounts.
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
	// Held by id and looked up in `sections` on every render: the sections are
	// rebuilt whenever the locale or the messages change.
	const [browseCategoryId, setBrowseCategoryId] = useState<string | null>(null);
	const [expandedGroupIds, setExpandedGroupIds] = useState<ReadonlySet<string>>(
		() => new Set(),
	);
	const searchInputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);
	const backButtonRef = useRef<HTMLButtonElement>(null);
	const showAllButtonRefs = useRef(new Map<string, HTMLButtonElement>());
	const pendingBackRef = useRef<PendingBack | null>(null);
	const scrollTopBeforeBrowseRef = useRef(0);

	const browseSection = useMemo(
		() =>
			browseCategoryId === null
				? undefined
				: sections.find(
						(section) =>
							section.category.id === browseCategoryId &&
							section.browseGroups.length > 0,
					),
		[sections, browseCategoryId],
	);
	// The category went away (or has nothing left to show in full): back to
	// the sections, without moving the focus.
	if (browseCategoryId !== null && browseSection === undefined) {
		setBrowseCategoryId(null);
		setQuery("");
	}
	const activeBrowseCategoryId = browseSection?.category.id ?? null;

	const trimmedQuery = query.trim();

	const resolveLabel = useCallback(
		(preset: Stencil) => resolveStencilLabel(preset, messages, locale),
		[messages, locale],
	);

	// While searching, the sections collapse into one list: a shape is looked up
	// by name, not by where it was filed.
	const searchResult = useMemo(
		() =>
			browseSection === undefined
				? searchStencilLibrary(
						sections,
						trimmedQuery,
						resolveLabel,
						resolvePreset,
					)
				: searchStencilLibraryCategory(
						browseSection,
						trimmedQuery,
						resolveLabel,
						resolvePreset,
					),
		[sections, browseSection, trimmedQuery, resolveLabel, resolvePreset],
	);

	const enterBrowse = (section: ResolvedStencilCategory) => {
		scrollTopBeforeBrowseRef.current = listRef.current?.scrollTop ?? 0;
		setQuery("");
		setBrowseCategoryId(section.category.id);
		setExpandedGroupIds(new Set([section.browseGroups[0].group.id]));
	};

	const leaveBrowse = (categoryId: string) => {
		pendingBackRef.current = {
			categoryId,
			scrollTop: scrollTopBeforeBrowseRef.current,
		};
		setQuery("");
		setBrowseCategoryId(null);
	};

	const toggleGroup = useCallback((groupId: string) => {
		setExpandedGroupIds((currentIds) => {
			const nextIds = new Set(currentIds);
			if (!nextIds.delete(groupId)) {
				nextIds.add(groupId);
			}
			return nextIds;
		});
	}, []);

	// After the view switched: entering starts at the top with the focus on the
	// back button; the back button returns to where the sections were left and
	// to the button that opened the view; any other way back starts at the top.
	const lastBrowseCategoryIdRef = useRef<string | null>(null);
	useLayoutEffect(() => {
		if (lastBrowseCategoryIdRef.current === activeBrowseCategoryId) {
			return;
		}
		lastBrowseCategoryIdRef.current = activeBrowseCategoryId;
		const pendingBack = pendingBackRef.current;
		pendingBackRef.current = null;
		const list = listRef.current;
		if (activeBrowseCategoryId !== null) {
			if (list) {
				list.scrollTop = 0;
			}
			backButtonRef.current?.focus();
			return;
		}
		if (pendingBack !== null) {
			if (list) {
				list.scrollTop = pendingBack.scrollTop;
			}
			showAllButtonRefs.current
				.get(pendingBack.categoryId)
				?.focus({ preventScroll: true });
			return;
		}
		if (list) {
			list.scrollTop = 0;
		}
	}, [activeBrowseCategoryId]);

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

	const sectionList = sections.map((section) => {
		const Icon = section.category.icon;
		const categoryId = section.category.id;
		const isExpanded = !collapsedSectionIds.includes(categoryId);
		const hasBrowseView = section.browseGroups.length > 0;
		return (
			<div key={categoryId}>
				<StencilLibrarySectionHeader
					type="button"
					aria-expanded={isExpanded}
					data-action={`section:${categoryId}`}
				>
					<StencilLibrarySectionChevron isExpanded={isExpanded}>
						<ChevronRightIcon width={CHEVRON_SIZE} height={CHEVRON_SIZE} />
					</StencilLibrarySectionChevron>
					<StencilLibrarySectionIcon>
						<Icon width={SECTION_ICON_SIZE} height={SECTION_ICON_SIZE} />
					</StencilLibrarySectionIcon>
					<StencilLibrarySectionLabel>
						{resolveStencilCategoryLabel(
							categoryId,
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
				{isExpanded && hasBrowseView && (
					<StencilLibrarySectionFooterButton
						type="button"
						data-gesture="none"
						data-testid={`stencil-library-show-all-${categoryId}`}
						ref={(button) => {
							if (button) {
								showAllButtonRefs.current.set(categoryId, button);
							} else {
								showAllButtonRefs.current.delete(categoryId);
							}
						}}
						onClick={() => enterBrowse(section)}
					>
						{messages.stencilLibraryShowAll}
						<span aria-hidden="true"> ›</span>
					</StencilLibrarySectionFooterButton>
				)}
				{isExpanded &&
					!hasBrowseView &&
					section.category.search !== undefined && (
						<StencilLibrarySectionFooterButton
							type="button"
							data-gesture="none"
							onClick={() => searchInputRef.current?.focus()}
						>
							{messages.stencilLibraryMoreViaSearch}
						</StencilLibrarySectionFooterButton>
					)}
			</div>
		);
	});

	const browseGroupList = browseSection?.browseGroups.map(
		({ group, presets }) => (
			<StencilLibraryBrowseGroup
				key={group.id}
				groupId={group.id}
				label={resolveLocalizedLabel(group.label, locale)}
				presets={presets}
				isExpanded={expandedGroupIds.has(group.id)}
				onToggle={toggleGroup}
				activePresetId={activePresetId}
				scrollRootRef={listRef}
			/>
		),
	);

	const BrowseIcon = browseSection?.category.icon;

	return (
		<>
			{browseSection !== undefined && BrowseIcon !== undefined && (
				<StencilLibraryBrowseHeader>
					<StencilLibraryBackButton
						type="button"
						ref={backButtonRef}
						data-gesture="none"
						data-testid="stencil-library-back"
						aria-label={messages.stencilLibraryBack}
						title={messages.stencilLibraryBack}
						onClick={() => leaveBrowse(browseSection.category.id)}
					>
						<ChevronLeftIcon width={BACK_ICON_SIZE} height={BACK_ICON_SIZE} />
					</StencilLibraryBackButton>
					<StencilLibrarySectionIcon>
						<BrowseIcon width={SECTION_ICON_SIZE} height={SECTION_ICON_SIZE} />
					</StencilLibrarySectionIcon>
					<StencilLibrarySectionLabel>
						{resolveStencilCategoryLabel(
							browseSection.category.id,
							browseSection.category.label,
							messages,
							locale,
						)}
					</StencilLibrarySectionLabel>
				</StencilLibraryBrowseHeader>
			)}

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

			<StencilLibraryPanelList ref={listRef}>
				{trimmedQuery !== ""
					? searchResultList
					: (browseGroupList ?? sectionList)}
			</StencilLibraryPanelList>
		</>
	);
};

export const StencilLibraryBody = memo(StencilLibraryBodyComponent);

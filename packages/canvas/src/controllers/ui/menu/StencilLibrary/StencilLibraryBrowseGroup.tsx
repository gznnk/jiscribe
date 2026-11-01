import { memo, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import { StencilLibraryItem } from "./StencilLibraryItem";
import {
	STENCIL_LIBRARY_PANEL_GRID_COLUMNS,
	StencilLibraryBrowseSentinel,
	StencilLibraryPanelGrid,
	StencilLibrarySectionChevron,
	StencilLibrarySectionHeader,
	StencilLibrarySectionLabel,
} from "./StencilLibraryPanelStyled";
import { ChevronRightIcon } from "../../icons/ChevronRightIcon";
import type { Stencil } from "../../objects/Stencil";

/**
 * How many presets an expanded "show all" group draws at first, and how many
 * more each time its end nears the visible area: twenty rows of the grid.
 */
export const STENCIL_LIBRARY_BROWSE_BATCH_SIZE =
	20 * STENCIL_LIBRARY_PANEL_GRID_COLUMNS;

const CHEVRON_SIZE = 12;

type StencilLibraryBrowseGroupProps = {
	/** The group's id within the category, for the header's test id. */
	groupId: string;
	/** Heading, already resolved for the locale. */
	label: string;
	/** The group's resolved presets in display order; never empty. */
	presets: readonly Stencil[];
	/** Whether the grid is shown; collapsing unmounts it, so reopening starts from the first batch. */
	isExpanded: boolean;
	/** Toggles `isExpanded`; the fold state is the caller's. */
	onToggle: (groupId: string) => void;
	/** Preset id currently in drawing mode, to highlight the matching item. */
	activePresetId: string | null;
	/** The scrolling list the group sits in, the root its batches are measured against. */
	scrollRootRef: RefObject<HTMLElement | null>;
};

/**
 * One collapsible section of a "show all" view: a header like the sections
 * view's (without a section icon), and the group's presets drawn in batches.
 * The header handles its own click (`data-gesture="none"`) and carries no
 * `section:` action, since the fold state is local to the view rather than the
 * reducer's `collapsedSectionIds`.
 */
const StencilLibraryBrowseGroupComponent: React.FC<
	StencilLibraryBrowseGroupProps
> = ({
	groupId,
	label,
	presets,
	isExpanded,
	onToggle,
	activePresetId,
	scrollRootRef,
}) => (
	<div>
		<StencilLibrarySectionHeader
			type="button"
			aria-expanded={isExpanded}
			data-gesture="none"
			data-testid={`stencil-library-browse-group-${groupId}`}
			onClick={() => onToggle(groupId)}
		>
			<StencilLibrarySectionChevron isExpanded={isExpanded}>
				<ChevronRightIcon width={CHEVRON_SIZE} height={CHEVRON_SIZE} />
			</StencilLibrarySectionChevron>
			<StencilLibrarySectionLabel>{label}</StencilLibrarySectionLabel>
		</StencilLibrarySectionHeader>
		{isExpanded && (
			<StencilLibraryBatchedGrid
				presets={presets}
				activePresetId={activePresetId}
				scrollRootRef={scrollRootRef}
			/>
		)}
	</div>
);

export const StencilLibraryBrowseGroup = memo(
	StencilLibraryBrowseGroupComponent,
);

type StencilLibraryBatchedGridProps = {
	presets: readonly Stencil[];
	activePresetId: string | null;
	scrollRootRef: RefObject<HTMLElement | null>;
};

/**
 * The group's grid, drawn {@link STENCIL_LIBRARY_BROWSE_BATCH_SIZE} presets at
 * a time: a sentinel after the drawn ones adds the next batch once it comes
 * within a screen of the list's visible area. An observer only reports a change
 * of intersection, so each batch observes afresh, and the first report of the
 * new observer adds another batch while the sentinel is still in range.
 */
const StencilLibraryBatchedGrid: React.FC<StencilLibraryBatchedGridProps> = ({
	presets,
	activePresetId,
	scrollRootRef,
}) => {
	const [drawnCount, setDrawnCount] = useState(
		STENCIL_LIBRARY_BROWSE_BATCH_SIZE,
	);
	const sentinelRef = useRef<HTMLDivElement>(null);
	const hasMore = drawnCount < presets.length;

	useEffect(() => {
		const sentinel = sentinelRef.current;
		if (!hasMore || sentinel === null) {
			return;
		}
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					setDrawnCount(
						(currentCount) => currentCount + STENCIL_LIBRARY_BROWSE_BATCH_SIZE,
					);
				}
			},
			// A screen ahead below (the margin is a share of the root's height).
			{ root: scrollRootRef.current, rootMargin: "0px 0px 100% 0px" },
		);
		observer.observe(sentinel);
		return () => observer.disconnect();
	}, [drawnCount, hasMore, scrollRootRef]);

	return (
		<>
			<StencilLibraryPanelGrid>
				{presets.slice(0, drawnCount).map((preset) => (
					<StencilLibraryItem
						key={preset.id}
						preset={preset}
						isActive={activePresetId === preset.id}
					/>
				))}
			</StencilLibraryPanelGrid>
			{hasMore && <StencilLibraryBrowseSentinel ref={sentinelRef} />}
		</>
	);
};

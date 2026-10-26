import { memo, type Ref } from "react";

import { StencilLibraryItem } from "./StencilLibraryItem";
import {
	StencilLibraryEmptyMessage,
	StencilLibraryMoreMatchesMessage,
	StencilPanelGrid,
	StencilLibrarySearchBox,
	StencilLibrarySearchInput,
} from "./StencilPanelStyled";
import type { StencilLibrarySearchResult } from "./utils/searchStencilLibrary";
import { useCanvasMessages } from "../../../../foundation/i18n/CanvasMessagesContext";
import { SearchIcon } from "../../icons/SearchIcon";
import type { Stencil } from "../../objects/Stencil";

const SEARCH_ICON_SIZE = 14;

type StencilPanelSearchBoxProps = {
	query: string;
	onQueryChange: (query: string) => void;
	/** The input, for a "find more" button to move the focus into. */
	inputRef?: Ref<HTMLInputElement>;
};

/**
 * The search box of a stencil panel. Opted out of the gesture system (on its
 * wrapper) so the input keeps the focus and takes its own keystrokes.
 */
export const StencilPanelSearchBox: React.FC<StencilPanelSearchBoxProps> = ({
	query,
	onQueryChange,
	inputRef,
}) => {
	const messages = useCanvasMessages();
	return (
		<StencilLibrarySearchBox data-gesture="none">
			<SearchIcon width={SEARCH_ICON_SIZE} height={SEARCH_ICON_SIZE} />
			<StencilLibrarySearchInput
				type="text"
				ref={inputRef}
				value={query}
				placeholder={messages.stencilPanelSearchPlaceholder}
				aria-label={messages.stencilPanelSearchPlaceholder}
				onChange={(event) => onQueryChange(event.target.value)}
			/>
		</StencilLibrarySearchBox>
	);
};

type StencilPresetGridProps = {
	presets: readonly Stencil[];
	/** Preset id currently in drawing mode, to highlight the matching item. */
	activePresetId: string | null;
};

/** A grid of library items, each placed by click or drag (StencilLibraryItemHandler). */
const StencilPresetGridComponent: React.FC<StencilPresetGridProps> = ({
	presets,
	activePresetId,
}) => (
	<StencilPanelGrid>
		{presets.map((preset) => (
			<StencilLibraryItem
				key={preset.id}
				preset={preset}
				isActive={activePresetId === preset.id}
			/>
		))}
	</StencilPanelGrid>
);

export const StencilPresetGrid = memo(StencilPresetGridComponent);

type StencilSearchResultsProps = {
	result: StencilLibrarySearchResult;
	/** Preset id currently in drawing mode, to highlight the matching item. */
	activePresetId: string | null;
};

/**
 * What a stencil panel shows for a query: the matches as one grid, with a line
 * when a category cut its matches short, or the no-match line.
 */
export const StencilSearchResults: React.FC<StencilSearchResultsProps> = ({
	result,
	activePresetId,
}) => {
	const messages = useCanvasMessages();
	if (result.presets.length === 0) {
		return (
			<StencilLibraryEmptyMessage>
				{messages.stencilPanelNoMatch}
			</StencilLibraryEmptyMessage>
		);
	}
	return (
		<>
			<StencilPresetGrid
				presets={result.presets}
				activePresetId={activePresetId}
			/>
			{result.hiddenMatchCount > 0 && (
				<StencilLibraryMoreMatchesMessage>
					{messages.stencilPanelMoreMatches}
				</StencilLibraryMoreMatchesMessage>
			)}
		</>
	);
};

import { useMemo, useRef, useState } from "react";

import {
	StencilPanelSearchBox,
	StencilPresetGrid,
	StencilSearchResults,
} from "./StencilPanelSearch";
import {
	StencilPanelMoreViaSearchButton,
	StencilPanelList,
} from "./StencilPanelStyled";
import type { ResolvedStencilCategory } from "./utils/resolveStencilCategory";
import { resolveStencilLabel } from "./utils/resolveStencilLabel";
import { searchStencilLibrary } from "./utils/searchStencilLibrary";
import { useCanvasLocale } from "../../../../foundation/i18n/CanvasLocaleContext";
import { useCanvasMessages } from "../../../../foundation/i18n/CanvasMessagesContext";
import type { Stencil } from "../../objects/Stencil";

type StencilCategoryPanelContentProps = {
	/** The category shown, already resolved against the registry. */
	section: ResolvedStencilCategory;
	/** Preset id currently in drawing mode, to highlight the matching item. */
	activePresetId: string | null;
	/** Looks up the ids the category's `search` answers beyond its listed presets. */
	resolvePreset: (presetId: string) => Stencil | undefined;
};

/**
 * One library category in a stencil panel: its presets in `presetIds` order,
 * and a search box over that category alone (its own `search` when it declares
 * one, label matching otherwise). A category declaring `search` holds more than
 * it lists, so a button under the grid points to the box.
 *
 * The query belongs to this content alone: switching the panel to another
 * category remounts it (StencilPanel keys it by content) and starts it
 * empty.
 */
export const StencilCategoryPanelContent: React.FC<
	StencilCategoryPanelContentProps
> = ({ section, activePresetId, resolvePreset }) => {
	const messages = useCanvasMessages();
	const locale = useCanvasLocale();
	const [query, setQuery] = useState("");
	const searchInputRef = useRef<HTMLInputElement>(null);
	const trimmedQuery = query.trim();

	const searchResult = useMemo(
		() =>
			searchStencilLibrary(
				[section],
				trimmedQuery,
				(preset) => resolveStencilLabel(preset, messages, locale),
				resolvePreset,
			),
		[section, trimmedQuery, messages, locale, resolvePreset],
	);

	return (
		<>
			<StencilPanelSearchBox
				query={query}
				onQueryChange={setQuery}
				inputRef={searchInputRef}
			/>
			<StencilPanelList>
				{trimmedQuery !== "" ? (
					<StencilSearchResults
						result={searchResult}
						activePresetId={activePresetId}
					/>
				) : (
					<>
						<StencilPresetGrid
							presets={section.presets}
							activePresetId={activePresetId}
						/>
						{section.category.search !== undefined && (
							<StencilPanelMoreViaSearchButton
								type="button"
								data-gesture="none"
								onClick={() => searchInputRef.current?.focus()}
							>
								{messages.stencilPanelMoreViaSearch}
							</StencilPanelMoreViaSearchButton>
						)}
					</>
				)}
			</StencilPanelList>
		</>
	);
};

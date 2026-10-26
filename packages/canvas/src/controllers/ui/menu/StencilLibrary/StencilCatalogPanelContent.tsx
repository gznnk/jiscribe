import { useMemo, useState } from "react";

import {
	StencilPanelSearchBox,
	StencilSearchResults,
} from "./StencilPanelSearch";
import {
	StencilCatalogPinButton,
	StencilCatalogRow,
	StencilCatalogRowIcon,
	StencilCatalogRowLabel,
	StencilCatalogRowOpenButton,
	StencilPanelList,
} from "./StencilPanelStyled";
import type { ResolvedStencilCategory } from "./utils/resolveStencilCategory";
import {
	resolveStencilCategoryLabel,
	resolveStencilLabel,
} from "./utils/resolveStencilLabel";
import { searchStencilLibrary } from "./utils/searchStencilLibrary";
import { useCanvasLocale } from "../../../../foundation/i18n/CanvasLocaleContext";
import { useCanvasMessages } from "../../../../foundation/i18n/CanvasMessagesContext";
import {
	pinAction,
	showAction,
} from "../../../gestures/handlers/menu/utils/menuActions";
import { PinIcon } from "../../icons/PinIcon";
import type { Stencil } from "../../objects/Stencil";

type StencilCatalogPanelContentProps = {
	/** Every library section in declaration order, already resolved. */
	sections: readonly ResolvedStencilCategory[];
	/** The user's pins (reducer state); a row whose id is listed shows as pinned. */
	pinnedCategoryIds: readonly string[];
	/** Preset id currently in drawing mode, to highlight the matching item. */
	activePresetId: string | null;
	/** Looks up the ids a category's `search` answers beyond its listed presets. */
	resolvePreset: (presetId: string) => Stencil | undefined;
};

const ROW_ICON_SIZE = 16;
/** The size PinIcon is drawn for (see its JSDoc); another size blurs its 1px lines. */
const PIN_ICON_SIZE = 16;

/**
 * The catalog in a stencil panel: a search box over every library category,
 * and otherwise one flat row per category in declaration order. A row switches
 * the panel to its category (`show:`) and carries the toggle pinning it to the
 * rail (`pin:`); both land in StencilLibraryPanelHandler.
 *
 * The query belongs to this content alone and starts empty each time the
 * catalog is shown; the box is not focused on its own.
 */
export const StencilCatalogPanelContent: React.FC<
	StencilCatalogPanelContentProps
> = ({ sections, pinnedCategoryIds, activePresetId, resolvePreset }) => {
	const messages = useCanvasMessages();
	const locale = useCanvasLocale();
	const [query, setQuery] = useState("");
	const trimmedQuery = query.trim();

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

	return (
		<>
			<StencilPanelSearchBox query={query} onQueryChange={setQuery} />
			<StencilPanelList>
				{trimmedQuery !== "" ? (
					<StencilSearchResults
						result={searchResult}
						activePresetId={activePresetId}
					/>
				) : (
					sections.map(({ category }) => {
						const Icon = category.icon;
						const isPinned = pinnedCategoryIds.includes(category.id);
						const label = resolveStencilCategoryLabel(
							category.id,
							category.label,
							messages,
							locale,
						);
						const pinLabel = messages.stencilCatalogPin(label);
						return (
							<StencilCatalogRow key={category.id} isPinned={isPinned}>
								<StencilCatalogRowOpenButton
									type="button"
									data-action={showAction(category.id)}
								>
									<StencilCatalogRowIcon>
										<Icon width={ROW_ICON_SIZE} height={ROW_ICON_SIZE} />
									</StencilCatalogRowIcon>
									<StencilCatalogRowLabel>{label}</StencilCatalogRowLabel>
								</StencilCatalogRowOpenButton>
								<StencilCatalogPinButton
									type="button"
									data-action={pinAction(category.id)}
									aria-pressed={isPinned}
									aria-label={pinLabel}
									title={pinLabel}
								>
									<PinIcon width={PIN_ICON_SIZE} height={PIN_ICON_SIZE} />
								</StencilCatalogPinButton>
							</StencilCatalogRow>
						);
					})
				)}
			</StencilPanelList>
		</>
	);
};

import {
	resolveLocaleMessages,
	setAction,
	useCanvasLocale,
} from "@jiscribe/canvas-sdk";
import { memo, useMemo, useState } from "react";

import { IconGlyph } from "./IconGlyph";
import {
	IconGrid,
	IconGridButton,
	IconGridMessage,
	IconPickerPanel,
	IconSearchInput,
} from "./IconPickerStyled";
import { lucideIconMessagesByLocale } from "../messages/lucideIconMessages";
import { COMMON_ICON_NAMES } from "../schema/icon/commonIconNames";
import { normalizeIconName } from "../schema/icon/normalizeIconName";
import { searchIconNames } from "../schema/icon/searchIconNames";

type IconPickerProps = {
	/** Current name of the cell to mark as current; undefined marks none, for a selection drawing several icons. */
	currentIcon: string | undefined;
};

/** Before anything is typed the picker offers the common icons rather than nothing. */
const searchIcons = (query: string): { names: string[]; total: number } =>
	normalizeIconName(query) === ""
		? { names: [...COMMON_ICON_NAMES], total: COMMON_ICON_NAMES.length }
		: searchIconNames(query);

/**
 * The body of the icon picker, shared by the ObjectMenu (IconPickerMenu) and the
 * properties sidebar (IconProperty). Writes the `icon` property, which the shape
 * declares in its own style table (ICON_STYLE_ENTRIES) so the update travels the
 * same path as any other menu edit.
 *
 * The cells set the value through `data-action`, not an `onClick`. A press held for even a
 * moment never produces a click event on the button — the canvas captures the pointer, so
 * the `pointerup` lands elsewhere — which makes a React handler fire only for a press fast
 * enough to beat the capture. The value is declared the way the shared color swatches
 * declare theirs, and the canvas dispatches it from its own pipeline — which is also why
 * the picker must not be `data-gesture="none"`: that stops the canvas from recognising the
 * press at all, and with it the very dispatch this relies on.
 *
 * The grid is `data-gesture="native-wheel"` so a wheel over the list scrolls the list
 * rather than the canvas underneath it.
 *
 * The search term is held here, and both hosts mount the picker only while their
 * dropdown is open, so every opening starts from the whole set.
 *
 * Nothing here can produce a name that does not exist, which is the point of having it:
 * the validator and its suggestions are for documents written by hand or by an AI.
 */
const IconPickerComponent: React.FC<IconPickerProps> = ({ currentIcon }) => {
	const locale = useCanvasLocale();
	const messages = resolveLocaleMessages(lucideIconMessagesByLocale, locale);
	const [query, setQuery] = useState("");
	const { names, total } = useMemo(() => searchIcons(query), [query]);

	return (
		<IconPickerPanel>
			<IconSearchInput
				type="text"
				value={query}
				placeholder={messages.searchPlaceholder}
				aria-label={messages.searchPlaceholder}
				data-testid="icon-picker-search"
				// Leaves right-click to the browser, so the field gets the
				// native copy / paste menu instead of the canvas's own.
				data-gesture="none"
				onChange={(event) => setQuery(event.target.value)}
			/>
			<IconGrid
				data-testid="icon-picker-grid"
				data-gesture="native-wheel"
				isEmpty={names.length === 0}
			>
				{names.map((name) => (
					<IconGridButton
						key={name}
						type="button"
						selected={name === currentIcon}
						data-action={setAction("icon", name)}
						title={name}
					>
						<IconGlyph name={name} size={18} />
					</IconGridButton>
				))}
				{names.length === 0 && (
					<IconGridMessage>{messages.noMatches}</IconGridMessage>
				)}
				{names.length < total && (
					<IconGridMessage>
						{messages.moreMatches(names.length, total)}
					</IconGridMessage>
				)}
			</IconGrid>
		</IconPickerPanel>
	);
};

export const IconPicker = memo(IconPickerComponent);

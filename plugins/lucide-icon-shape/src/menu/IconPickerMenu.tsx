import type { ObjectMenuItemProps } from "@jiscribe/canvas";
import {
	ObjectMenuButton,
	ObjectMenuDropdownPanel,
	ObjectMenuItemPositioner,
	resolveLocaleMessages,
	useCanvasLocale,
	useSubmenuPosition,
} from "@jiscribe/canvas-sdk";
import { memo, useEffect, useMemo, useRef, useState } from "react";

import { IconGlyph } from "./IconGlyph";
import {
	IconGrid,
	IconGridButton,
	IconGridMessage,
	IconPickerPanel,
	IconSearchInput,
} from "./IconPickerMenuStyled";
import { lucideIconMessagesByLocale } from "../messages/lucideIconMessages";
import { COMMON_ICON_NAMES } from "../schema/icon/commonIconNames";
import { ICON_ALIASES, ICON_NODES } from "../schema/icon/iconData.generated";
import { normalizeIconName } from "../schema/icon/normalizeIconName";
import { resolveIconName } from "../schema/icon/resolveIconName";
import { DEFAULT_ICON_NAME } from "../schema/IconDoc";

const SECTION_ID = "icon";

/**
 * How many results a search shows. The whole set is far too large to lay out at once, and
 * a query narrow enough to be useful lands well inside this; the count at the end of the
 * grid says when it did not, so a wider query is visibly the answer rather than more
 * scrolling.
 */
const MAX_RESULTS = 96;

/** The icon the selection is currently drawn with, as a current name. */
const readSelectedIcon = (
	selectedIds: string[],
	objects: ObjectMenuItemProps["objects"],
): string => {
	const first = objects[selectedIds[0] ?? ""] as
		Record<string, unknown> | undefined;
	const icon = first?.icon;
	const resolved =
		typeof icon === "string" ? resolveIconName(icon) : DEFAULT_ICON_NAME;
	return resolved ?? DEFAULT_ICON_NAME;
};

/**
 * Names matching `query`, best first: the ones starting with it before the ones merely
 * containing it, and shorter before longer so `lock` precedes `lock-keyhole-open`.
 *
 * Superseded names are searched too — someone typing the name they know should still find
 * the icon — but what comes back is always the current name, which is what gets written.
 */
const searchIcons = (query: string): { names: string[]; total: number } => {
	const needle = normalizeIconName(query);
	if (needle === "") {
		return { names: [...COMMON_ICON_NAMES], total: COMMON_ICON_NAMES.length };
	}

	const byName = Object.keys(ICON_NODES).filter((name) =>
		name.includes(needle),
	);
	const byFormerName = Object.entries(ICON_ALIASES)
		.filter(([alias]) => alias.includes(needle))
		.map(([, current]) => current);
	const matched = [...new Set([...byName, ...byFormerName])].sort(
		(left, right) =>
			Number(right.startsWith(needle)) - Number(left.startsWith(needle)) ||
			left.length - right.length ||
			left.localeCompare(right),
	);
	return { names: matched.slice(0, MAX_RESULTS), total: matched.length };
};

/**
 * Icon picker (lucideIcon only). Writes the `icon` property, which the shape declares as
 * an extra style property so the update travels the same path as any other menu edit.
 *
 * The cells set the value through `data-part`, not an `onClick`. A press held for even a
 * moment never produces a click event on the button — the canvas captures the pointer, so
 * the `pointerup` lands elsewhere — which makes a React handler fire only for a press fast
 * enough to beat the capture. The value is declared the way the shared color swatches
 * declare theirs, and the canvas dispatches it from its own pipeline — which is also why
 * the panel must not be `data-gesture="none"`: that stops the canvas from recognising the
 * press at all, and with it the very dispatch this relies on.
 *
 * The grid is `data-gesture="native-wheel"` so a wheel over the list scrolls the list
 * rather than the canvas underneath it.
 *
 * Nothing here can produce a name that does not exist, which is the point of having it:
 * the validator and its suggestions are for documents written by hand or by an AI.
 */
const IconPickerMenuComponent: React.FC<ObjectMenuItemProps> = ({
	objects,
	selectedIds,
	openSectionId,
}) => {
	const locale = useCanvasLocale();
	const messages = resolveLocaleMessages(lucideIconMessagesByLocale, locale);
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = openSectionId === SECTION_ID;
	const [query, setQuery] = useState("");
	const currentIcon = readSelectedIcon(selectedIds, objects);
	const { names, total } = useMemo(() => searchIcons(query), [query]);
	const { submenuRef, placement, offsetX } = useSubmenuPosition(
		menuItemRef,
		isOpen,
	);

	// Each opening starts from the whole set. Clearing as it closes rather than as it
	// opens keeps the last search from flashing up before the reset lands.
	useEffect(() => {
		if (!isOpen) {
			setQuery("");
		}
	}, [isOpen]);

	return (
		<ObjectMenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-kind="menu"
				data-id="object-menu"
				data-part={`toggle:${SECTION_ID}`}
				title={messages.menuIcon}
			>
				<IconGlyph name={currentIcon} size={18} />
			</ObjectMenuButton>
			{isOpen && (
				<ObjectMenuDropdownPanel
					ref={submenuRef}
					placement={placement}
					offsetX={offsetX}
				>
					<IconPickerPanel>
						<IconSearchInput
							type="text"
							value={query}
							placeholder={messages.searchPlaceholder}
							aria-label={messages.searchPlaceholder}
							data-kind="menu"
							data-id="object-menu"
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
									data-kind="menu"
									data-id="object-menu"
									data-part={`set:icon:${name}`}
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
				</ObjectMenuDropdownPanel>
			)}
		</ObjectMenuItemPositioner>
	);
};

export const IconPickerMenu = memo(IconPickerMenuComponent);

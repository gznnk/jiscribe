import type { ObjectMenuItemProps } from "@jiscribe/canvas";
import {
	ObjectMenuButton,
	ObjectMenuDropdownPanel,
	ObjectMenuItemPositioner,
	resolveLocaleMessages,
	useCanvasLocale,
	useSubmenuPosition,
	setPart,
	togglePart,
} from "@jiscribe/canvas-sdk";
import { memo, useEffect, useMemo, useRef, useState } from "react";

import { AwsIconGlyph } from "./AwsIconGlyph";
import {
	AwsFilterChip,
	AwsFilterChipRow,
	AwsIconGrid,
	AwsIconGridButton,
	AwsIconGridMessage,
	AwsIconPickerPanel,
	AwsIconSearchInput,
} from "./AwsIconPickerMenuStyled";
import { AWS_ICON_CATEGORIES, searchAwsIcons } from "./searchAwsIcons";
import { awsShapesMessagesByLocale } from "../messages/awsShapesMessages";
import { DEFAULT_AWS_ICON_NAME } from "../schema/AwsIconDoc";
import type { AwsIconTier } from "../schema/icon/AwsIconNode";
import { AWS_ICON_TIERS } from "../schema/icon/AwsIconNode";
import { resolveAwsIconName } from "../schema/icon/resolveAwsIconName";

/**
 * Kept apart from the toolbar category's id (also "aws"). Both put a
 * `toggle:{id}` into the DOM, so the same string would leave a selector unable
 * to tell them apart.
 */
const SECTION_ID = "aws-icon";

/**
 * A filter chip. Unlike a cell it writes nothing to the canvas and only moves
 * state inside the panel, so React's `onClick` takes it — which needs
 * `data-gesture="none"` to keep the canvas from seeing the press at all (the
 * same as the search field; without it the canvas captures the pointer and no
 * click ever fires).
 */
const FilterChip: React.FC<React.ComponentProps<typeof AwsFilterChip>> = (
	props,
) => <AwsFilterChip type="button" data-gesture="none" {...props} />;

/** The icon the selected shape draws, as its canonical name. */
const readSelectedIcon = (
	selectedIds: string[],
	objects: ObjectMenuItemProps["objects"],
): string => {
	const first = objects[selectedIds[0] ?? ""] as
		Record<string, unknown> | undefined;
	const icon = first?.icon;
	const resolved =
		typeof icon === "string" ? resolveAwsIconName(icon) : DEFAULT_AWS_ICON_NAME;
	return resolved ?? DEFAULT_AWS_ICON_NAME;
};

/**
 * The AWS icon picker, for awsIcon alone. It writes `icon`, which the shape
 * declares as an extraStyleProperty, so the update travels the same path as
 * every other menu action.
 *
 * Beside the search field it carries two rows of filter chips (layer and AWS
 * category). A term alone does not always cut 781 down, and "show me the Compute
 * services" is an ordinary way to look for one when drawing an architecture.
 *
 * A cell sends its value through `data-part` rather than `onClick`: holding the
 * press makes the canvas capture the pointer and no click fires, so a React
 * handler would only ever catch the quick ones. It is declared the way the
 * shared colour swatches are, and the canvas's own path dispatches it. For the
 * same reason the panel must not carry `data-gesture="none"` — that would stop
 * the press being seen at all.
 *
 * Nothing here can make a name that does not exist. The validation and its
 * candidates are for documents written by hand or by an AI.
 */
const AwsIconPickerMenuComponent: React.FC<ObjectMenuItemProps> = ({
	objects,
	selectedIds,
	openSectionId,
}) => {
	const locale = useCanvasLocale();
	const messages = resolveLocaleMessages(awsShapesMessagesByLocale, locale);
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = openSectionId === SECTION_ID;
	const [query, setQuery] = useState("");
	const [tier, setTier] = useState<AwsIconTier | undefined>(undefined);
	const [category, setCategory] = useState<string | undefined>(undefined);
	const currentIcon = readSelectedIcon(selectedIds, objects);
	const { names, total } = useMemo(
		() => searchAwsIcons({ query, tier, category }),
		[query, tier, category],
	);
	const { submenuRef, placement, offsetX } = useSubmenuPosition(
		menuItemRef,
		isOpen,
	);

	const tierLabels: Record<AwsIconTier, string> = {
		service: messages.tierService,
		resource: messages.tierResource,
		general: messages.tierGeneral,
		group: messages.tierGroup,
	};

	// Every opening starts from the whole set. Clearing on close rather than on
	// open keeps the previous term from flashing up before it goes.
	useEffect(() => {
		if (!isOpen) {
			setQuery("");
			setTier(undefined);
			setCategory(undefined);
		}
	}, [isOpen]);

	return (
		<ObjectMenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-kind="menu"
				data-id="object-menu"
				data-part={togglePart(SECTION_ID)}
				title={messages.menuIcon}
			>
				<AwsIconGlyph name={currentIcon} size={18} />
			</ObjectMenuButton>
			{isOpen && (
				<ObjectMenuDropdownPanel
					ref={submenuRef}
					placement={placement}
					offsetX={offsetX}
				>
					<AwsIconPickerPanel>
						<AwsIconSearchInput
							type="text"
							value={query}
							placeholder={messages.searchPlaceholder}
							aria-label={messages.searchPlaceholder}
							data-kind="menu"
							data-id="object-menu"
							data-testid="aws-icon-picker-search"
							// Leaves right-click to the browser, so the native copy / paste
							// menu comes up instead of the canvas's.
							data-gesture="none"
							onChange={(event) => setQuery(event.target.value)}
						/>
						<AwsFilterChipRow
							data-gesture="native-wheel"
							data-testid="aws-icon-picker-tiers"
						>
							<FilterChip
								selected={tier === undefined}
								onClick={() => setTier(undefined)}
							>
								{messages.tierAll}
							</FilterChip>
							{AWS_ICON_TIERS.map((candidate) => (
								<FilterChip
									key={candidate}
									selected={tier === candidate}
									onClick={() => setTier(candidate)}
								>
									{tierLabels[candidate]}
								</FilterChip>
							))}
						</AwsFilterChipRow>
						<AwsFilterChipRow
							data-gesture="native-wheel"
							data-testid="aws-icon-picker-categories"
						>
							<FilterChip
								selected={category === undefined}
								onClick={() => setCategory(undefined)}
							>
								{messages.categoryAll}
							</FilterChip>
							{AWS_ICON_CATEGORIES.map((candidate) => (
								<FilterChip
									key={candidate}
									selected={category === candidate}
									onClick={() => setCategory(candidate)}
								>
									{candidate}
								</FilterChip>
							))}
						</AwsFilterChipRow>
						<AwsIconGrid
							data-testid="aws-icon-picker-grid"
							data-gesture="native-wheel"
							isEmpty={names.length === 0}
						>
							{names.map((name) => (
								<AwsIconGridButton
									key={name}
									type="button"
									selected={name === currentIcon}
									data-kind="menu"
									data-id="object-menu"
									data-part={setPart("icon", name)}
									title={name}
								>
									<AwsIconGlyph name={name} size={24} />
								</AwsIconGridButton>
							))}
							{names.length === 0 && (
								<AwsIconGridMessage>{messages.noMatches}</AwsIconGridMessage>
							)}
							{names.length < total && (
								<AwsIconGridMessage>
									{messages.moreMatches(names.length, total)}
								</AwsIconGridMessage>
							)}
						</AwsIconGrid>
					</AwsIconPickerPanel>
				</ObjectMenuDropdownPanel>
			)}
		</ObjectMenuItemPositioner>
	);
};

export const AwsIconPickerMenu = memo(AwsIconPickerMenuComponent);

import {
	resolveLocaleMessages,
	setAction,
	useCanvasLocale,
} from "@jiscribe/canvas-sdk";
import { memo, useMemo, useState } from "react";

import { AwsIconGlyph } from "./AwsIconGlyph";
import {
	AwsFilterChip,
	AwsFilterChipRow,
	AwsIconGrid,
	AwsIconGridButton,
	AwsIconGridMessage,
	AwsIconPickerPanel,
	AwsIconSearchInput,
} from "./AwsIconPickerStyled";
import { awsShapesMessagesByLocale } from "../messages/awsShapesMessages";
import type { AwsIconTier } from "../schema/icon/AwsIconNode";
import { AWS_ICON_TIERS } from "../schema/icon/AwsIconNode";
import {
	AWS_ICON_CATEGORIES,
	searchAwsIcons,
} from "../schema/icon/searchAwsIcons";

type AwsIconPickerProps = {
	/** Canonical name of the cell to mark as current; undefined marks none, for a selection drawing several icons. */
	currentIcon: string | undefined;
};

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

/**
 * The body of the AWS icon picker, shared by the ObjectMenu
 * (AwsIconPickerMenu) and the properties sidebar (AwsIconProperty). It writes
 * `icon`, which the shape declares as an extraStyleProperty, so the update
 * travels the same path as every other menu action.
 *
 * Beside the search field it carries two rows of filter chips (layer and AWS
 * category). A term alone does not always cut 781 down, and "show me the Compute
 * services" is an ordinary way to look for one when drawing an architecture.
 *
 * A cell sends its value through `data-action` rather than `onClick`: holding the
 * press makes the canvas capture the pointer and no click fires, so a React
 * handler would only ever catch the quick ones. It is declared the way the
 * shared colour swatches are, and the canvas's own path dispatches it. For the
 * same reason the picker must not carry `data-gesture="none"` — that would stop
 * the press being seen at all.
 *
 * The term and the filters are held here, and both hosts mount the picker only
 * while their dropdown is open, so every opening starts from the whole set.
 *
 * Nothing here can make a name that does not exist. The validation and its
 * candidates are for documents written by hand or by an AI.
 */
const AwsIconPickerComponent: React.FC<AwsIconPickerProps> = ({
	currentIcon,
}) => {
	const locale = useCanvasLocale();
	const messages = resolveLocaleMessages(awsShapesMessagesByLocale, locale);
	const [query, setQuery] = useState("");
	const [tier, setTier] = useState<AwsIconTier | undefined>(undefined);
	const [category, setCategory] = useState<string | undefined>(undefined);
	const { names, total } = useMemo(
		() => searchAwsIcons({ query, tier, category }),
		[query, tier, category],
	);

	const tierLabels: Record<AwsIconTier, string> = {
		service: messages.tierService,
		resource: messages.tierResource,
		general: messages.tierGeneral,
		group: messages.tierGroup,
	};

	return (
		<AwsIconPickerPanel>
			<AwsIconSearchInput
				type="text"
				value={query}
				placeholder={messages.searchPlaceholder}
				aria-label={messages.searchPlaceholder}
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
						data-action={setAction("icon", name)}
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
	);
};

export const AwsIconPicker = memo(AwsIconPickerComponent);

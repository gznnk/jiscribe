import {
	StencilRailPopoverContainer,
	StencilRailPopoverGrid,
	StencilRailPopoverHeading,
	StencilRailPopoverRow,
	StencilRailPopoverRowGrip,
} from "./StencilRailStyled";
import { useCanvasLocale } from "../../../../foundation/i18n/CanvasLocaleContext";
import { useCanvasMessages } from "../../../../foundation/i18n/CanvasMessagesContext";
import { toggleAction } from "../../../gestures/handlers/menu/utils/menuActions";
import {
	type PinInsertionMark,
	pinInsertionEdgeOf,
} from "../../../utils/pinnedCategoryOrder";
import { GripIcon } from "../../icons/GripIcon";
import type { Stencil } from "../../objects/Stencil";
import { StencilLibraryItem } from "../StencilLibrary/StencilLibraryItem";
import type { ResolvedStencilCategory } from "../StencilLibrary/utils/resolveStencilCategory";
import { resolveStencilCategoryLabel } from "../StencilLibrary/utils/resolveStencilLabel";

const ROW_ICON_SIZE = 16;

type StencilRailPopoverRowProps = {
	section: ResolvedStencilCategory;
	/** The line of a pin drag landing beside this row; null draws none. */
	pinInsertionEdge: PinInsertionMark["edge"] | null;
};

/**
 * One pin of the "…" popover. The same gesture target as its rail button
 * (`stencil-category`, `toggle:{id}`), so a press opens it and a drag moves it
 * in the pin order; the grip only shows that the row drags.
 */
const StencilRailPopoverCategoryRow: React.FC<StencilRailPopoverRowProps> = ({
	section: { category },
	pinInsertionEdge,
}) => {
	const messages = useCanvasMessages();
	const locale = useCanvasLocale();
	const Icon = category.icon;
	return (
		<StencilRailPopoverRow
			type="button"
			data-kind="menu"
			data-id="stencil-category"
			data-action={toggleAction(category.id)}
			pinInsertionEdge={pinInsertionEdge}
			data-pin-insertion={pinInsertionEdge ?? undefined}
		>
			<StencilRailPopoverRowGrip>
				<GripIcon />
			</StencilRailPopoverRowGrip>
			<Icon width={ROW_ICON_SIZE} height={ROW_ICON_SIZE} />
			{resolveStencilCategoryLabel(
				category.id,
				category.label,
				messages,
				locale,
			)}
		</StencilRailPopoverRow>
	);
};

type StencilRailOverflowPopoverProps = {
	/** The pins the rail had no room for, in pin order. */
	pinnedCategories: readonly ResolvedStencilCategory[];
	/** Where a pin drag's line is drawn; only a row named by it draws one. */
	pinInsertionMark: PinInsertionMark | null;
};

/**
 * The popover of the rail's "…" button: the pins the rail had no room for,
 * under their heading, in pin order.
 */
export const StencilRailOverflowPopover: React.FC<
	StencilRailOverflowPopoverProps
> = ({ pinnedCategories, pinInsertionMark }) => {
	const messages = useCanvasMessages();
	return (
		<StencilRailPopoverContainer
			anchor="bottom"
			data-kind="menu"
			data-id="stencil-rail-popover"
			data-popover="railOverflow"
		>
			<StencilRailPopoverHeading>
				{messages.stencilRailPinnedHeading}
			</StencilRailPopoverHeading>
			{pinnedCategories.map((section) => (
				<StencilRailPopoverCategoryRow
					key={section.category.id}
					section={section}
					pinInsertionEdge={pinInsertionEdgeOf(
						pinInsertionMark,
						section.category.id,
					)}
				/>
			))}
		</StencilRailPopoverContainer>
	);
};

type StencilRailPresetsPopoverProps = {
	/** The rail's presets, in rail order. */
	presets: readonly Stencil[];
	/** Id of the preset armed for drawing, to highlight its item. */
	activePresetId: string | null;
};

/**
 * The popover of the collapsed presets button: the rail's presets as library
 * items, so click-to-draw and drag-to-place work from it as from the rail
 * (StencilLibraryItemHandler, which also closes it once one is picked).
 */
export const StencilRailPresetsPopover: React.FC<
	StencilRailPresetsPopoverProps
> = ({ presets, activePresetId }) => (
	<StencilRailPopoverContainer
		anchor="top"
		data-kind="menu"
		data-id="stencil-rail-popover"
		data-popover="railPresets"
	>
		<StencilRailPopoverGrid>
			{presets.map((preset) => (
				<StencilLibraryItem
					key={preset.id}
					preset={preset}
					isActive={activePresetId === preset.id}
				/>
			))}
		</StencilRailPopoverGrid>
	</StencilRailPopoverContainer>
);

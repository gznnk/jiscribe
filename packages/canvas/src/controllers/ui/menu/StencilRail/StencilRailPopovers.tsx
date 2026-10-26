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
	/** Carried on `data-rail-group`, as on the rail's own buttons. */
	railGroup: "pinned" | "document";
	/** The line of a pin drag landing beside this row; null draws none. */
	pinInsertionEdge: PinInsertionMark["edge"] | null;
};

/**
 * One category of the "…" popover. The same gesture target as its rail button
 * (`stencil-category`, `toggle:{id}`), so a press opens it and, for a pin, a
 * drag moves it in the pin order; the grip only shows which rows drag.
 */
const StencilRailPopoverCategoryRow: React.FC<StencilRailPopoverRowProps> = ({
	section: { category },
	railGroup,
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
			data-rail-group={railGroup}
			pinInsertionEdge={pinInsertionEdge}
			data-pin-insertion={pinInsertionEdge ?? undefined}
		>
			<StencilRailPopoverRowGrip>
				{railGroup === "pinned" && <GripIcon />}
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
	/** The document's categories the rail had no room for, most-used first. */
	documentCategories: readonly ResolvedStencilCategory[];
	/** Where a pin drag's line is drawn; only a row named by it draws one. */
	pinInsertionMark: PinInsertionMark | null;
};

/**
 * The popover of the rail's "…" button: the categories the rail had no room
 * for, the pins under one heading and the document's under another, each
 * heading drawn only over a section with rows.
 */
export const StencilRailOverflowPopover: React.FC<
	StencilRailOverflowPopoverProps
> = ({ pinnedCategories, documentCategories, pinInsertionMark }) => {
	const messages = useCanvasMessages();
	return (
		<StencilRailPopoverContainer
			anchor="bottom"
			data-kind="menu"
			data-id="stencil-rail-popover"
			data-popover="railOverflow"
		>
			{pinnedCategories.length > 0 && (
				<>
					<StencilRailPopoverHeading>
						{messages.stencilRailPinnedHeading}
					</StencilRailPopoverHeading>
					{pinnedCategories.map((section) => (
						<StencilRailPopoverCategoryRow
							key={section.category.id}
							section={section}
							railGroup="pinned"
							pinInsertionEdge={pinInsertionEdgeOf(
								pinInsertionMark,
								section.category.id,
							)}
						/>
					))}
				</>
			)}
			{documentCategories.length > 0 && (
				<>
					<StencilRailPopoverHeading>
						{messages.stencilCatalogInDiagram}
					</StencilRailPopoverHeading>
					{documentCategories.map((section) => (
						<StencilRailPopoverCategoryRow
							key={section.category.id}
							section={section}
							railGroup="document"
							pinInsertionEdge={null}
						/>
					))}
				</>
			)}
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

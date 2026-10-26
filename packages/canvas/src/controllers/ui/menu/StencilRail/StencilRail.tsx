import { memo, useLayoutEffect, useMemo, useRef } from "react";

import {
	StencilRailOverflowPopover,
	StencilRailPresetsPopover,
} from "./StencilRailPopovers";
import {
	StencilRailContainer,
	StencilRailDivider,
	StencilRailDocumentDivider,
	StencilRailPanelButton,
	StencilRailRoot,
	StencilRailSpacer,
} from "./StencilRailStyled";
import { resolveStencilRail } from "./utils/resolveStencilRail";
import {
	isStencilRailPopoverShowable,
	resolveStencilRailOverflow,
} from "./utils/resolveStencilRailOverflow";
import { useElementSize } from "../../../../foundation/hooks/useElementSize";
import { useCanvasLocale } from "../../../../foundation/i18n/CanvasLocaleContext";
import { useCanvasMessages } from "../../../../foundation/i18n/CanvasMessagesContext";
import type { StencilPanelContent } from "../../../CanvasTypes";
import { resolveCommandLabel } from "../../../commands/CommandUtils";
import { ToggleStencilLibraryCommand } from "../../../commands/view/ToggleStencilLibraryCommand";
import {
	commandAction,
	toggleAction,
} from "../../../gestures/handlers/menu/utils/menuActions";
import { useCanvasRegistries } from "../../../registries/CanvasRegistriesContext";
import {
	type PinInsertionMark,
	pinInsertionEdgeOf,
	resolvePinInsertionMark,
} from "../../../utils/pinnedCategoryOrder";
import type { StencilRailPopoverKind } from "../../../utils/stencilRailPopover";
import { EllipsisIcon } from "../../icons/EllipsisIcon";
import { ShapesIcon } from "../../icons/ShapesIcon";
import { StencilLibraryItem } from "../StencilLibrary/StencilLibraryItem";
import type { ResolvedStencilCategory } from "../StencilLibrary/utils/resolveStencilCategory";
import { resolveStencilCategoryLabel } from "../StencilLibrary/utils/resolveStencilLabel";

type StencilRailProps = {
	/**
	 * The presets at the top: `rail.presetIds`, or DEFAULT_RAIL_PRESET_IDS when
	 * the host names none. Keep it stable: the rail is memoized.
	 */
	presetIds: readonly string[];
	/** `stencilLibrary.sections` resolved against the registry; empty = no library. */
	librarySections: readonly ResolvedStencilCategory[];
	/** The user's pins in rail order (reducer state), unknown ids included. */
	pinnedCategoryIds: readonly string[];
	/**
	 * The categories the open document uses, most-used first
	 * (useDocumentCategoryIds); the ones not pinned follow the pins. Keep it
	 * stable: the rail is memoized.
	 */
	documentCategoryIds: readonly string[];
	/** Id of the preset currently armed for drawing, to highlight its button. */
	activePresetId: string | null;
	/**
	 * What the open stencil panel draws, flyout or docked
	 * (readDrawnStencilPanelContent: a category the library lacks is drawn as the
	 * catalog); null when none is open.
	 */
	drawnPanelContent: StencilPanelContent | null;
	/** The rail popover open in the flyout's slot (reducer state); null when none is. */
	openRailPopover: StencilRailPopoverKind | null;
	/**
	 * Where a pin being dragged lands, as an index into `pinnedCategoryIds`
	 * (the `"pinReorder"` drag's `insertionIndex`); null with no such drag, or
	 * one that would change nothing.
	 */
	pinInsertionIndex: number | null;
	/**
	 * Called when `openRailPopover` names a popover in a layout that no longer
	 * offers it, so Canvas drops it from the flyout's slot; never while the rail
	 * is not laid out (StencilRailOverflow.isLaidOut). Keep it stable: the rail
	 * is memoized.
	 */
	onRailPopoverUnshowable: (kind: StencilRailPopoverKind) => void;
};

const ICON_SIZE = 24;

/** Which group of the rail a category button is in: the user's pins, or the ones the document adds. */
type StencilRailCategoryGroup = "pinned" | "document";

type StencilRailCategoryButtonProps = {
	section: ResolvedStencilCategory;
	/** Carried on `data-rail-group`; the button behaves the same in either. */
	railGroup: StencilRailCategoryGroup;
	/** Whether the open stencil panel draws this category, flyout or docked. */
	isOpen: boolean;
	/** The line of a pin drag landing beside this button; null draws none. */
	pinInsertionEdge: PinInsertionMark["edge"] | null;
};

/**
 * A rail button toggling one category's panel (StencilCategoryToggleHandler),
 * which a pinned one also drags to another place in the pin order.
 */
const StencilRailCategoryButton: React.FC<StencilRailCategoryButtonProps> = ({
	section: { category },
	railGroup,
	isOpen,
	pinInsertionEdge,
}) => {
	const messages = useCanvasMessages();
	const locale = useCanvasLocale();
	const Icon = category.icon;
	const label = resolveStencilCategoryLabel(
		category.id,
		category.label,
		messages,
		locale,
	);
	return (
		<StencilRailPanelButton
			type="button"
			data-kind="menu"
			data-id="stencil-category"
			data-action={toggleAction(category.id)}
			data-rail-group={railGroup}
			aria-haspopup="true"
			aria-expanded={isOpen}
			aria-label={label}
			title={label}
			isOpen={isOpen}
			pinInsertionEdge={pinInsertionEdge}
			data-pin-insertion={pinInsertionEdge ?? undefined}
		>
			<Icon width={ICON_SIZE} height={ICON_SIZE} />
		</StencilRailPanelButton>
	);
};

/**
 * The stencil rail at the left of the canvas, top to bottom: the host's presets,
 * then the categories the user pinned, then the other categories the open
 * document uses, then (with a library) the catalog button.
 *
 * Every button goes through the gesture system: the presets are library items
 * (StencilLibraryItemHandler, click to draw, drag to place), the category
 * buttons toggle their panel (StencilCategoryToggleHandler), and the catalog
 * button runs `toggleStencilLibrary` (StencilRailHandler). The panels themselves
 * are rendered by Canvas from reducer state, so the rail is render-only.
 *
 * What does not fit the rail's measured height goes into a "…" button above the
 * catalog button, and in the last resort the presets fold into one button
 * (resolveStencilRailOverflow, which holds the order). Both open a popover
 * beside the rail, in the flyout's slot (`toggle:railOverflow` /
 * `toggle:railPresets`, StencilRailHandler), drawn here since only the rail
 * knows what it left out.
 */
const StencilRailComponent: React.FC<StencilRailProps> = ({
	presetIds,
	librarySections,
	pinnedCategoryIds,
	documentCategoryIds,
	activePresetId,
	drawnPanelContent,
	openRailPopover,
	pinInsertionIndex,
	onRailPopoverUnshowable,
}) => {
	const messages = useCanvasMessages();
	const locale = useCanvasLocale();
	const { stencil, command } = useCanvasRegistries();
	const railRef = useRef<HTMLElement>(null);
	const railSize = useElementSize(railRef);
	// The catalog button runs this command and wears its label, so the command
	// palette, the shortcut help and the rail name it alike. A host that switched
	// the command off gets no button, as a toolbar `command` item would not be.
	const catalogCommand = command.get(ToggleStencilLibraryCommand.id);
	const catalogLabel = catalogCommand
		? resolveCommandLabel(catalogCommand, messages, locale)
		: null;

	const { presets, pinnedCategories, unpinnedDocumentCategories, hasCatalog } =
		useMemo(
			() =>
				resolveStencilRail(
					presetIds,
					pinnedCategoryIds,
					librarySections,
					documentCategoryIds,
					stencil,
				),
			[
				presetIds,
				pinnedCategoryIds,
				librarySections,
				documentCategoryIds,
				stencil,
			],
		);

	const drawnCategoryId =
		drawnPanelContent?.kind === "category"
			? drawnPanelContent.categoryId
			: null;
	const isCatalogDrawn = drawnPanelContent?.kind === "catalog";
	const hasCatalogButton = hasCatalog && catalogLabel !== null;

	const overflow = useMemo(
		() =>
			resolveStencilRailOverflow(railSize?.height ?? 0, {
				presetCount: presets.length,
				pinnedCategoryIds: pinnedCategories.map(({ category }) => category.id),
				documentCategoryIds: unpinnedDocumentCategories.map(
					({ category }) => category.id,
				),
				drawnCategoryId,
				hasCatalogButton,
			}),
		[
			railSize,
			presets,
			pinnedCategories,
			unpinnedDocumentCategories,
			drawnCategoryId,
			hasCatalogButton,
		],
	);
	const sectionsById = useMemo(
		() =>
			new Map(
				[...pinnedCategories, ...unpinnedDocumentCategories].map((section) => [
					section.category.id,
					section,
				]),
			),
		[pinnedCategories, unpinnedDocumentCategories],
	);
	const toSections = (categoryIds: readonly string[]) =>
		categoryIds.flatMap((categoryId) => {
			const section = sectionsById.get(categoryId);
			return section ? [section] : [];
		});
	const shownPinnedCategories = toSections(overflow.shownPinnedCategoryIds);
	const shownDocumentCategories = toSections(overflow.shownDocumentCategoryIds);
	const overflowedPinnedCategories = toSections(
		overflow.overflowedPinnedCategoryIds,
	);
	const overflowedDocumentCategories = toSections(
		overflow.overflowedDocumentCategoryIds,
	);
	const overflowedCount =
		overflowedPinnedCategories.length + overflowedDocumentCategories.length;
	const shownRailPopover =
		openRailPopover !== null &&
		isStencilRailPopoverShowable(openRailPopover, overflow)
			? openRailPopover
			: null;
	// See StencilRailOverflow.isLaidOut.
	const isOpenRailPopoverUnshowable =
		overflow.isLaidOut && openRailPopover !== null && shownRailPopover === null;
	useLayoutEffect(() => {
		if (isOpenRailPopoverUnshowable && openRailPopover !== null) {
			onRailPopoverUnshowable(openRailPopover);
		}
	}, [isOpenRailPopoverUnshowable, openRailPopover, onRailPopoverUnshowable]);
	// Only what is on screen can carry the line: the "…" popover's pins only while it is shown.
	const pinInsertionMark = resolvePinInsertionMark(
		pinnedCategoryIds,
		shownRailPopover === "railOverflow"
			? [
					...overflow.shownPinnedCategoryIds,
					...overflow.overflowedPinnedCategoryIds,
				]
			: overflow.shownPinnedCategoryIds,
		pinInsertionIndex,
	);
	const moreLabel = messages.stencilRailMore(overflowedCount);
	const CollapsedPresetsIcon = presets[0]?.icon;

	// The one [data-kind] element of the rail besides its buttons: the catalog,
	// "…" and collapsed presets buttons carry only data-action and resolve their
	// kind/id here through closest(), and a press on the empty area arrives with
	// no action (dismissing the flyout). The presets and category buttons keep
	// their own [data-kind].
	return (
		<StencilRailRoot>
			<StencilRailContainer
				ref={railRef}
				aria-label={messages.stencilRailLabel}
				data-kind="menu"
				data-id="stencil-rail"
			>
				{overflow.arePresetsCollapsed && CollapsedPresetsIcon ? (
					<StencilRailPanelButton
						type="button"
						data-action={toggleAction("railPresets")}
						aria-haspopup="true"
						aria-expanded={shownRailPopover === "railPresets"}
						aria-label={messages.stencilRailPresets}
						title={messages.stencilRailPresets}
						isOpen={shownRailPopover === "railPresets"}
					>
						<CollapsedPresetsIcon width={ICON_SIZE} height={ICON_SIZE} />
					</StencilRailPanelButton>
				) : (
					presets.map((preset) => (
						<StencilLibraryItem
							key={preset.id}
							preset={preset}
							isActive={activePresetId === preset.id}
						/>
					))
				)}
				{overflow.hasPinnedDivider && <StencilRailDivider />}
				{shownPinnedCategories.map((section) => (
					<StencilRailCategoryButton
						key={section.category.id}
						section={section}
						railGroup="pinned"
						isOpen={drawnCategoryId === section.category.id}
						pinInsertionEdge={pinInsertionEdgeOf(
							pinInsertionMark,
							section.category.id,
						)}
					/>
				))}
				{overflow.hasDocumentDivider && (
					<StencilRailDocumentDivider data-testid="stencil-rail-document-divider" />
				)}
				{shownDocumentCategories.map((section) => (
					<StencilRailCategoryButton
						key={section.category.id}
						section={section}
						railGroup="document"
						isOpen={drawnCategoryId === section.category.id}
						pinInsertionEdge={null}
					/>
				))}
				{overflow.hasSpacer && <StencilRailSpacer />}
				{overflow.hasMoreButton && (
					<StencilRailPanelButton
						type="button"
						data-action={toggleAction("railOverflow")}
						aria-haspopup="true"
						aria-expanded={shownRailPopover === "railOverflow"}
						aria-label={moreLabel}
						title={moreLabel}
						isOpen={shownRailPopover === "railOverflow"}
					>
						<EllipsisIcon width={ICON_SIZE} height={ICON_SIZE} />
					</StencilRailPanelButton>
				)}
				{hasCatalogButton && (
					<StencilRailPanelButton
						type="button"
						data-action={commandAction(ToggleStencilLibraryCommand.id)}
						aria-haspopup="true"
						aria-expanded={isCatalogDrawn}
						aria-label={catalogLabel}
						title={catalogLabel}
						isOpen={isCatalogDrawn}
					>
						<ShapesIcon width={ICON_SIZE} height={ICON_SIZE} />
					</StencilRailPanelButton>
				)}
			</StencilRailContainer>
			{shownRailPopover === "railOverflow" && (
				<StencilRailOverflowPopover
					pinnedCategories={overflowedPinnedCategories}
					documentCategories={overflowedDocumentCategories}
					pinInsertionMark={pinInsertionMark}
				/>
			)}
			{shownRailPopover === "railPresets" && (
				<StencilRailPresetsPopover
					presets={presets}
					activePresetId={activePresetId}
				/>
			)}
		</StencilRailRoot>
	);
};

export const StencilRail = memo(StencilRailComponent);

import { memo, useMemo } from "react";

import {
	StencilRailContainer,
	StencilRailDivider,
	StencilRailDocumentDivider,
	StencilRailPanelButton,
	StencilRailSpacer,
} from "./StencilRailStyled";
import { resolveStencilRail } from "./utils/resolveStencilRail";
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
};

/** A rail button toggling one category's panel (StencilCategoryToggleHandler). */
const StencilRailCategoryButton: React.FC<StencilRailCategoryButtonProps> = ({
	section: { category },
	railGroup,
	isOpen,
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
 */
const StencilRailComponent: React.FC<StencilRailProps> = ({
	presetIds,
	librarySections,
	pinnedCategoryIds,
	documentCategoryIds,
	activePresetId,
	drawnPanelContent,
}) => {
	const messages = useCanvasMessages();
	const locale = useCanvasLocale();
	const { stencil, command } = useCanvasRegistries();
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

	// The one [data-kind] element of the rail besides its buttons: the catalog
	// button carries only data-action and resolves its kind/id here through
	// closest(), and a press on the empty area arrives with no action (dismissing
	// the flyout). The presets and category buttons keep their own [data-kind].
	return (
		<StencilRailContainer
			aria-label={messages.stencilRailLabel}
			data-kind="menu"
			data-id="stencil-rail"
		>
			{presets.map((preset) => (
				<StencilLibraryItem
					key={preset.id}
					preset={preset}
					isActive={activePresetId === preset.id}
				/>
			))}
			{pinnedCategories.length > 0 && presets.length > 0 && (
				<StencilRailDivider />
			)}
			{pinnedCategories.map((section) => (
				<StencilRailCategoryButton
					key={section.category.id}
					section={section}
					railGroup="pinned"
					isOpen={drawnCategoryId === section.category.id}
				/>
			))}
			{unpinnedDocumentCategories.length > 0 &&
				(presets.length > 0 || pinnedCategories.length > 0) && (
					<StencilRailDocumentDivider data-testid="stencil-rail-document-divider" />
				)}
			{unpinnedDocumentCategories.map((section) => (
				<StencilRailCategoryButton
					key={section.category.id}
					section={section}
					railGroup="document"
					isOpen={drawnCategoryId === section.category.id}
				/>
			))}
			{hasCatalog && catalogLabel !== null && (
				<>
					<StencilRailSpacer />
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
				</>
			)}
		</StencilRailContainer>
	);
};

export const StencilRail = memo(StencilRailComponent);

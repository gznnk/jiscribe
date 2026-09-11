import { Fragment, memo, useMemo } from "react";

import {
	DEFAULT_TOOLBAR_SECTIONS,
	type ToolbarSection,
} from "./toolbarSections";
import {
	ToolbarContainer,
	ToolbarDivider,
	ToolbarGroup,
	ToolbarHostSlot,
	ToolbarIconButton,
	ToolbarToggleButton,
	ZoomReadout,
} from "./ToolbarStyled";
import {
	resolveToolbarSections,
	type ResolvedToolbarItem,
} from "./utils/resolveToolbarSections";
import { commandPart } from "../../../gestures/handlers/menu/utils/menuParts";
import { useCanvasLocale } from "../../../messages/CanvasLocaleContext";
import { getCommandLabel } from "../../../messages/CanvasMessages";
import { useCanvasMessages } from "../../../messages/CanvasMessagesContext";
import type { CanvasMessages } from "../../../messages/CanvasMessagesTypes";
import { resolveLocalizedLabel } from "../../../messages/resolveLocaleMessages";
import { useCanvasRegistries } from "../../../registries/CanvasRegistriesContext";
import { EllipsisIcon } from "../../icons/EllipsisIcon";
import { PropertyPanelIcon } from "../../icons/PropertyPanelIcon";
import { StencilCategoryMenu } from "../StencilLibrary/StencilCategoryMenu";
import { StencilLibraryItem } from "../StencilLibrary/StencilLibraryItem";

type ToolbarProps = {
	/** ID of the stencil currently being drawn (for the tool's active state) */
	activePresetId: string | null;
	/** ID of the category whose flyout is open (reducer state); null = none */
	openCategoryId: string | null;
	/** Current zoom factor (1 = 100%) */
	zoom: number;
	/**
	 * The commands on the bar whose `canExecute` is currently false, sorted and
	 * joined with commas. A primitive on purpose: the bar re-renders on every
	 * zoom step, and a fresh array or Set each render would defeat its memo.
	 */
	disabledCommandIds: string;
	/** The whole bar in display order (see CanvasProps.toolbar.sections) */
	sections?: ToolbarSection[];
	/**
	 * Whether the host's `stencilLibrary.sections` resolved to at least one
	 * section. The sidebar toggle is drawn only then; Canvas resolves the sections
	 * and answers this, so the bar never looks them up itself.
	 */
	hasLibrary: boolean;
	/** Whether the shape library sidebar is currently open (reducer state) */
	isLibraryOpen: boolean;
	/** Whether the properties sidebar is currently open (reducer state) */
	isPropertyPanelOpen: boolean;
};

/** A command button's tooltip / aria-label: the item's override, else the command's. */
const resolveCommandItemLabel = (
	item: Extract<ResolvedToolbarItem, { type: "command" }>,
	messages: CanvasMessages,
	locale: string,
): string =>
	item.label === undefined
		? getCommandLabel(messages, item.command)
		: resolveLocalizedLabel(item.label, locale);

/** Stable within a resolved bar; the index only serves the anonymous items. */
const toolbarItemKey = (item: ResolvedToolbarItem, index: number): string => {
	switch (item.type) {
		case "stencilPreset":
			return `stencilPreset:${item.preset.id}`;
		case "stencilCategory":
			return `stencilCategory:${item.category.id}`;
		case "command":
			return `command:${item.commandId}`;
		case "slot":
			return `slot:${item.id}`;
		default:
			return `${item.type}:${index}`;
	}
};

/**
 * Unified toolbar centered at the top.
 * Draws the sections it is given: the shape tools (StencilLibrary), the two
 * sidebar toggles, the zoom readout and any command buttons and host slots the
 * host declared.
 *
 * - Shape tools operate through the gesture system (data-kind="menu").
 * - Zoom +/-, the readout and every `command` item go through the command
 *   system (ToolbarHandler → handleCommand), the same path as the keyboard
 *   shortcuts and the context menu. So do the two sidebar toggles: the shape
 *   library one shows only when the host declared a library with something in
 *   it, the properties one only when the host asked for that item. The help
 *   modal and the panels themselves are rendered by Canvas from reducer state.
 */
const ToolbarComponent: React.FC<ToolbarProps> = ({
	activePresetId,
	openCategoryId,
	zoom,
	disabledCommandIds,
	sections = DEFAULT_TOOLBAR_SECTIONS,
	hasLibrary,
	isLibraryOpen,
	isPropertyPanelOpen,
}) => {
	const messages = useCanvasMessages();
	const locale = useCanvasLocale();
	const { stencil, command } = useCanvasRegistries();

	// Resolved once per (sections, registries, hasLibrary) tuple, not inline in
	// the render map: the bar re-renders on every zoom step, and a per-render
	// `presets` array would defeat StencilCategoryMenu's memo.
	const resolvedSections = useMemo(
		() => resolveToolbarSections(sections, { stencil, command, hasLibrary }),
		[sections, stencil, command, hasLibrary],
	);

	const disabledCommands = useMemo(
		() => new Set(disabledCommandIds.split(",")),
		[disabledCommandIds],
	);

	// The first end-aligned section carries the auto margin that pushes it and
	// everything after it against the right edge.
	const firstEndSectionId = resolvedSections.find(
		(section) => section.align === "end",
	)?.id;

	const renderItem = (item: ResolvedToolbarItem): React.ReactNode => {
		switch (item.type) {
			case "stencilPreset":
				return (
					<StencilLibraryItem
						preset={item.preset}
						isActive={activePresetId === item.preset.id}
					/>
				);
			case "stencilCategory":
				return (
					<StencilCategoryMenu
						id={item.category.id}
						label={item.category.label}
						icon={item.category.icon}
						presets={item.presets}
						isOpen={openCategoryId === item.category.id}
						activePresetId={activePresetId}
					/>
				);
			case "command": {
				const label = resolveCommandItemLabel(item, messages, locale);
				const Icon = item.icon;
				return (
					<ToolbarIconButton
						type="button"
						aria-label={label}
						title={label}
						disabled={disabledCommands.has(item.commandId)}
						data-testid={`toolbar-command:${item.commandId}`}
						data-part={commandPart(item.commandId)}
					>
						<Icon />
					</ToolbarIconButton>
				);
			}
			case "zoom":
				return (
					<>
						<ToolbarIconButton
							type="button"
							aria-label={messages.toolbarZoomOut}
							title={messages.toolbarZoomOut}
							disabled={disabledCommands.has("zoomOut")}
							data-part={commandPart("zoomOut")}
						>
							−
						</ToolbarIconButton>
						<ZoomReadout
							type="button"
							aria-label={messages.toolbarResetZoom}
							title={messages.toolbarResetZoom}
							data-part={commandPart("resetZoom")}
						>
							{Math.round(zoom * 100)}%
						</ZoomReadout>
						<ToolbarIconButton
							type="button"
							aria-label={messages.toolbarZoomIn}
							title={messages.toolbarZoomIn}
							disabled={disabledCommands.has("zoomIn")}
							data-part={commandPart("zoomIn")}
						>
							+
						</ToolbarIconButton>
					</>
				);
			case "stencilLibraryToggle":
				return (
					<ToolbarToggleButton
						type="button"
						aria-label={messages.toolbarStencilLibrary}
						title={messages.toolbarStencilLibrary}
						aria-expanded={isLibraryOpen}
						data-part={commandPart("toggleStencilLibrary")}
						isOpen={isLibraryOpen}
					>
						<EllipsisIcon />
					</ToolbarToggleButton>
				);
			case "propertyPanelToggle":
				return (
					<ToolbarToggleButton
						type="button"
						aria-label={messages.toolbarPropertyPanel}
						title={messages.toolbarPropertyPanel}
						aria-expanded={isPropertyPanelOpen}
						data-part={commandPart("togglePropertyPanel")}
						isOpen={isPropertyPanelOpen}
					>
						<PropertyPanelIcon />
					</ToolbarToggleButton>
				);
			case "divider":
				return <ToolbarDivider />;
			case "slot":
				return (
					<ToolbarHostSlot data-gesture="none">{item.node}</ToolbarHostSlot>
				);
		}
	};

	// The open category flyout (`openCategoryId`) lives in reducer state; the
	// toggle goes through StencilCategoryToggleHandler and dismissal through the
	// handlers/commands that clear it, so the Toolbar is stateless here and
	// multiple <Canvas> instances stay independent.

	// The one [data-kind] element of the bar: its own buttons carry only data-part
	// and resolve their kind/id here through closest(), and a press on the empty
	// area arrives with no part (dismissing the open menus). Nested targets with a
	// different id (stencil-category / stencil-library) keep their own [data-kind]
	// and still win.
	return (
		<ToolbarContainer data-kind="menu" data-id="toolbar">
			{resolvedSections.map((section) => (
				<ToolbarGroup
					key={section.id}
					startsEndGroup={section.id === firstEndSectionId}
				>
					{section.items.map((item, index) => (
						<Fragment key={toolbarItemKey(item, index)}>
							{renderItem(item)}
						</Fragment>
					))}
				</ToolbarGroup>
			))}
		</ToolbarContainer>
	);
};

export const Toolbar = memo(ToolbarComponent);

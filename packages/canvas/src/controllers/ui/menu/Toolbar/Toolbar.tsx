import { Fragment, memo, useMemo } from "react";

import { ToolbarCommandButton } from "./ToolbarCommandButton";
import {
	DEFAULT_TOOLBAR_SECTIONS,
	type ToolbarSection,
} from "./toolbarSections";
import {
	ToolbarContainer,
	ToolbarDivider,
	ToolbarGroup,
	ToolbarHostSlot,
	ToolbarToggleButton,
} from "./ToolbarStyled";
import { ToolbarZoomGroup } from "./ToolbarZoomGroup";
import {
	resolveToolbarSections,
	type ResolvedToolbarItem,
} from "./utils/resolveToolbarSections";
import { commandPart } from "../../../gestures/handlers/menu/utils/menuParts";
import { useCanvasMessages } from "../../../messages/CanvasMessagesContext";
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
 *
 * Everything the bar draws from arrives as a prop except whether each command
 * can currently run, which comes through ToolbarCommandStateContext: the props
 * change rarely, while command availability changes on nearly every dispatch.
 * Reading that context here would re-render the whole bar each time, so only
 * the two leaves that show it subscribe (ToolbarCommandButton,
 * ToolbarZoomGroup) and the bar itself stays memoized.
 */
const ToolbarComponent: React.FC<ToolbarProps> = ({
	activePresetId,
	openCategoryId,
	zoom,
	sections = DEFAULT_TOOLBAR_SECTIONS,
	hasLibrary,
	isLibraryOpen,
	isPropertyPanelOpen,
}) => {
	const messages = useCanvasMessages();
	const { stencil, command } = useCanvasRegistries();

	// Resolved once per (sections, registries, hasLibrary) tuple, not inline in
	// the render map: the bar re-renders on every zoom step, and a per-render
	// `presets` array would defeat StencilCategoryMenu's memo.
	const resolvedSections = useMemo(
		() => resolveToolbarSections(sections, { stencil, command, hasLibrary }),
		[sections, stencil, command, hasLibrary],
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
			case "command":
				return (
					<ToolbarCommandButton
						commandId={item.commandId}
						icon={item.icon}
						label={item.label}
					/>
				);
			case "zoom":
				return <ToolbarZoomGroup zoom={zoom} />;
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

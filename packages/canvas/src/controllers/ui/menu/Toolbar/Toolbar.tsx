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
	ToolbarPill,
	ToolbarToggleButton,
} from "./ToolbarStyled";
import { ToolbarZoomGroup } from "./ToolbarZoomGroup";
import { arrangeToolbarPills } from "./utils/arrangeToolbarPills";
import { findFirstEndSectionId } from "./utils/findFirstEndSectionId";
import {
	resolveToolbarSections,
	type ResolvedToolbarItem,
	type ResolvedToolbarSection,
} from "./utils/resolveToolbarSections";
import { useCanvasMessages } from "../../../../foundation/i18n/CanvasMessagesContext";
import { ToggleSidebarsCommand } from "../../../commands/view/ToggleSidebarsCommand";
import { commandAction } from "../../../gestures/handlers/menu/utils/menuActions";
import { useCanvasRegistries } from "../../../registries/CanvasRegistriesContext";
import { SidebarIcon } from "../../icons/SidebarIcon";
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
	 * Whether the shape library sidebar is drawn (`isStencilLibraryPanelShown`:
	 * open and expanded), the pressed look of its toggle
	 */
	isStencilLibraryPanelShown: boolean;
	/**
	 * Whether the properties sidebar is drawn (`isPropertyPanelShown`: open and
	 * expanded), the pressed look of its toggle
	 */
	isPropertyPanelShown: boolean;
	/**
	 * The chrome's form (`CanvasControllerState.isChromeExpanded`): the pressed
	 * look of the `sidebarsToggle` item, and the form of the bar — the
	 * full-width bar while true, the two corner pills (each section on its
	 * `collapsedAlign` side) while false. Canvas places the bar from the same
	 * value: above the viewport for the one, inside it for the other.
	 */
	isChromeExpanded: boolean;
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
 * Unified toolbar at the top.
 * Draws the sections it is given: the shape tools (StencilLibrary), the
 * sidebar toggles, the zoom readout and any command buttons and host slots the
 * host declared. While the chrome is expanded it is one full-width bar; while
 * collapsed, two pills floating over the top corners (see
 * arrangeToolbarPills).
 *
 * - Shape tools operate through the gesture system (data-kind="menu").
 * - Zoom +/-, the readout and every `command` item go through the command
 *   system (ToolbarHandler → handleCommand), the same path as the keyboard
 *   shortcuts and the context menu. So do the sidebar toggles and the switch
 *   for both, wherever the host asked for those items. The help modal and the
 *   panels themselves are rendered by Canvas from reducer state.
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
	isStencilLibraryPanelShown,
	isPropertyPanelShown,
	isChromeExpanded,
}) => {
	const messages = useCanvasMessages();
	const { stencil, command } = useCanvasRegistries();

	// Resolved once per (sections, registries) tuple, not inline in the render
	// map: the bar re-renders on every zoom step, and a per-render `presets`
	// array would defeat StencilCategoryMenu's memo.
	const resolvedSections = useMemo(
		() => resolveToolbarSections(sections, { stencil, command }),
		[sections, stencil, command],
	);

	const pills = useMemo(
		() => arrangeToolbarPills(resolvedSections),
		[resolvedSections],
	);

	const firstEndSectionId = findFirstEndSectionId(resolvedSections);

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
						aria-expanded={isStencilLibraryPanelShown}
						data-action={commandAction("toggleStencilLibrary")}
						isOpen={isStencilLibraryPanelShown}
					>
						<SidebarIcon edge="left" />
					</ToolbarToggleButton>
				);
			case "propertyPanelToggle":
				return (
					<ToolbarToggleButton
						type="button"
						aria-label={messages.toolbarPropertyPanel}
						title={messages.toolbarPropertyPanel}
						aria-expanded={isPropertyPanelShown}
						data-action={commandAction("togglePropertyPanel")}
						isOpen={isPropertyPanelShown}
					>
						<SidebarIcon edge="right" />
					</ToolbarToggleButton>
				);
			case "sidebarsToggle":
				return (
					<ToolbarToggleButton
						type="button"
						aria-label={messages.toolbarSidebars}
						title={messages.toolbarSidebars}
						aria-expanded={isChromeExpanded}
						data-action={commandAction(ToggleSidebarsCommand.id)}
						isOpen={isChromeExpanded}
					>
						<SidebarIcon edge="both" />
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

	const renderSection = (
		section: ResolvedToolbarSection,
		startsEndGroup: boolean,
	): React.ReactNode => (
		<ToolbarGroup key={section.id} startsEndGroup={startsEndGroup}>
			{section.items.map((item, index) => (
				<Fragment key={toolbarItemKey(item, index)}>
					{renderItem(item)}
				</Fragment>
			))}
		</ToolbarGroup>
	);

	// The one [data-kind] element of the bar (of each pill, collapsed): its own
	// buttons carry only data-action and resolve their kind/id here through
	// closest(), and a press on the empty area arrives with no action (dismissing
	// the open menus). Nested targets with a different id (stencil-category /
	// stencil-library) keep their own [data-kind] and still win.
	if (!isChromeExpanded) {
		return (
			<>
				{pills.start.length > 0 && (
					<ToolbarPill
						edge="start"
						data-kind="menu"
						data-id="toolbar"
						data-testid="toolbar-pill:start"
					>
						{pills.start.map((section) => renderSection(section, false))}
					</ToolbarPill>
				)}
				{pills.end.length > 0 && (
					<ToolbarPill
						edge="end"
						data-kind="menu"
						data-id="toolbar"
						data-testid="toolbar-pill:end"
					>
						{pills.end.map((section) => renderSection(section, false))}
					</ToolbarPill>
				)}
			</>
		);
	}

	return (
		<ToolbarContainer data-kind="menu" data-id="toolbar">
			{resolvedSections.map((section) =>
				renderSection(section, section.id === firstEndSectionId),
			)}
		</ToolbarContainer>
	);
};

export const Toolbar = memo(ToolbarComponent);

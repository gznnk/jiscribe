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
import { useCanvasMessages } from "../../../../foundation/i18n/CanvasMessagesContext";
import { commandAction } from "../../../gestures/handlers/menu/utils/menuActions";
import { useCanvasRegistries } from "../../../registries/CanvasRegistriesContext";
import { SidebarIcon } from "../../icons/SidebarIcon";

type ToolbarProps = {
	/** Current zoom factor (1 = 100%) */
	zoom: number;
	/** The whole bar in display order (see CanvasProps.toolbar.sections) */
	sections?: ToolbarSection[];
	/** Whether the properties sidebar is currently open (reducer state) */
	isPropertyPanelOpen: boolean;
};

/** Stable within a resolved bar; the index only serves the anonymous items. */
const toolbarItemKey = (item: ResolvedToolbarItem, index: number): string => {
	switch (item.type) {
		case "command":
			return `command:${item.commandId}`;
		case "slot":
			return `slot:${item.id}`;
		default:
			return `${item.type}:${index}`;
	}
};

/**
 * Toolbar across the top.
 * Draws the sections it is given: the properties sidebar toggle, the zoom
 * readout and any command buttons and host slots the host declared. The shape
 * tools are not here: they live on the stencil rail (StencilRail).
 *
 * Zoom +/-, the readout and every `command` item go through the command system
 * (ToolbarHandler → handleCommand), the same path as the keyboard shortcuts and
 * the context menu. So does the properties toggle, shown only when the host
 * asked for that item. The help modal and the panel itself are rendered by
 * Canvas from reducer state.
 *
 * Everything the bar draws from arrives as a prop except whether each command
 * can currently run, which comes through ToolbarCommandStateContext: the props
 * change rarely, while command availability changes on nearly every dispatch.
 * Reading that context here would re-render the whole bar each time, so only
 * the two leaves that show it subscribe (ToolbarCommandButton,
 * ToolbarZoomGroup) and the bar itself stays memoized.
 */
const ToolbarComponent: React.FC<ToolbarProps> = ({
	zoom,
	sections = DEFAULT_TOOLBAR_SECTIONS,
	isPropertyPanelOpen,
}) => {
	const messages = useCanvasMessages();
	const { command } = useCanvasRegistries();

	// Resolved once per (sections, registry) pair, not inline in the render map:
	// the bar re-renders on every zoom step.
	const resolvedSections = useMemo(
		() => resolveToolbarSections(sections, { command }),
		[sections, command],
	);

	// The first end-aligned section carries the auto margin that pushes it and
	// everything after it against the right edge.
	const firstEndSectionId = resolvedSections.find(
		(section) => section.align === "end",
	)?.id;

	const renderItem = (item: ResolvedToolbarItem): React.ReactNode => {
		switch (item.type) {
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
			case "propertyPanelToggle":
				return (
					<ToolbarToggleButton
						type="button"
						aria-label={messages.toolbarPropertyPanel}
						title={messages.toolbarPropertyPanel}
						aria-expanded={isPropertyPanelOpen}
						data-action={commandAction("togglePropertyPanel")}
						isOpen={isPropertyPanelOpen}
					>
						<SidebarIcon edge="right" />
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

	// The one [data-kind] element of the bar: its own buttons carry only data-action
	// and resolve their kind/id here through closest(), and a press on the empty
	// area arrives with no action (dismissing the open menus).
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

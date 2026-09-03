import { memo, useMemo } from "react";

import { DEFAULT_TOOLBAR_LAYOUT, type ToolbarEntry } from "./toolbarLayout";
import {
	ToolbarContainer,
	ToolbarDivider,
	ToolbarGroup,
	ToolbarHostSlot,
	ToolbarIconButton,
	ZoomReadout,
} from "./ToolbarStyled";
import { useCanvasMessages } from "../../../messages/CanvasMessagesContext";
import { useCanvasRegistries } from "../../../registries/CanvasRegistriesContext";
import { HelpIcon } from "../../icons/HelpIcon";
import type { Stencil } from "../../objects/Stencil";
import { StencilCategoryMenu } from "../StencilLibrary/StencilCategoryMenu";
import { StencilLibraryItem } from "../StencilLibrary/StencilLibraryItem";

/** A layout entry with its presets looked up in the registry, ready to draw. */
type ResolvedToolbarEntry =
	| { kind: "preset"; preset: Stencil }
	| {
			kind: "category";
			entry: Extract<ToolbarEntry, { kind: "category" }>;
			presets: Stencil[];
	  };

type ToolbarProps = {
	/** ID of the stencil currently being drawn (for the tool's active state) */
	activePresetId: string | null;
	/** ID of the category whose flyout is open (reducer state); null = none */
	openCategoryId: string | null;
	/** Current zoom factor (1 = 100%) */
	zoom: number;
	/** Whether zooming in is possible (canExecute of the zoomIn command) */
	canZoomIn: boolean;
	/** Whether zooming out is possible (canExecute of the zoomOut command) */
	canZoomOut: boolean;
	/** Top-level arrangement of the shape tools (pinned presets + category flyouts) */
	layout?: ToolbarEntry[];
	/** Host UI at the left edge (see CanvasProps.toolbar.leading) */
	leading?: React.ReactNode;
	/** Host UI at the right edge (see CanvasProps.toolbar.trailing) */
	trailing?: React.ReactNode;
};

/**
 * Unified toolbar centered at the top.
 * Combines the shape tools (StencilLibrary), zoom readout, and help (?) into a single bar.
 *
 * - Shape tools operate through the gesture system (data-kind="menu").
 * - Zoom +/-, the readout and help go through the command system (ToolbarHandler →
 *   handleCommand), the same path as the keyboard shortcuts and the context menu.
 *   The help modal itself is rendered by Canvas from reducer state.
 */
const ToolbarComponent: React.FC<ToolbarProps> = ({
	activePresetId,
	openCategoryId,
	zoom,
	canZoomIn,
	canZoomOut,
	layout = DEFAULT_TOOLBAR_LAYOUT,
	leading,
	trailing,
}) => {
	const messages = useCanvasMessages();
	const { stencil } = useCanvasRegistries();

	// Resolved once per (layout, registry) pair, not inline in the render map:
	// the bar re-renders on every zoom step, and a per-render `presets` array
	// would defeat StencilCategoryMenu's memo. Resolution also drops what has
	// nothing to show — a preset that isn't registered (e.g. a plugin not
	// applied) is silently skipped, and a category left with no resolvable
	// presets loses its button/flyout entirely rather than rendering empty.
	const resolvedEntries = useMemo(
		() =>
			layout.flatMap((entry): ResolvedToolbarEntry[] => {
				if (entry.kind === "preset") {
					const preset = stencil.get(entry.presetId);
					return preset ? [{ kind: "preset", preset }] : [];
				}
				const presets = entry.presetIds
					.map((id) => stencil.get(id))
					.filter((preset) => preset !== undefined);
				return presets.length > 0 ? [{ kind: "category", entry, presets }] : [];
			}),
		[layout, stencil],
	);

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
			{/* Left: host slot (when provided) and shape tools */}
			<ToolbarGroup>
				{leading != null && (
					<>
						<ToolbarHostSlot data-gesture="none">{leading}</ToolbarHostSlot>
						<ToolbarDivider />
					</>
				)}
				{resolvedEntries.map((resolved) =>
					resolved.kind === "preset" ? (
						<StencilLibraryItem
							key={`preset:${resolved.preset.id}`}
							preset={resolved.preset}
							isActive={activePresetId === resolved.preset.id}
						/>
					) : (
						<StencilCategoryMenu
							key={`category:${resolved.entry.id}`}
							id={resolved.entry.id}
							label={resolved.entry.label}
							icon={resolved.entry.icon}
							presets={resolved.presets}
							isOpen={openCategoryId === resolved.entry.id}
							activePresetId={activePresetId}
						/>
					),
				)}
			</ToolbarGroup>

			{/* Right: zoom readout and help */}
			<ToolbarGroup>
				{/* Zoom actions go through the command system (ToolbarHandler → handleCommand),
					    the same path as keyboard shortcuts and the context menu. */}
				<ToolbarIconButton
					type="button"
					aria-label={messages.toolbarZoomOut}
					title={messages.toolbarZoomOut}
					disabled={!canZoomOut}
					data-part="command:zoomOut"
				>
					−
				</ToolbarIconButton>
				<ZoomReadout
					type="button"
					aria-label={messages.toolbarResetZoom}
					title={messages.toolbarResetZoom}
					data-part="command:resetZoom"
				>
					{Math.round(zoom * 100)}%
				</ZoomReadout>
				<ToolbarIconButton
					type="button"
					aria-label={messages.toolbarZoomIn}
					title={messages.toolbarZoomIn}
					disabled={!canZoomIn}
					data-part="command:zoomIn"
				>
					+
				</ToolbarIconButton>

				<ToolbarDivider />

				<ToolbarIconButton
					type="button"
					aria-label={messages.toolbarShowShortcutHelp}
					title={messages.toolbarShortcutHelp}
					data-testid="shortcut-help:open"
					data-part="command:shortcutHelp"
				>
					<HelpIcon />
				</ToolbarIconButton>
				{trailing != null && (
					<>
						<ToolbarDivider />
						<ToolbarHostSlot data-gesture="none">{trailing}</ToolbarHostSlot>
					</>
				)}
			</ToolbarGroup>
		</ToolbarContainer>
	);
};

export const Toolbar = memo(ToolbarComponent);

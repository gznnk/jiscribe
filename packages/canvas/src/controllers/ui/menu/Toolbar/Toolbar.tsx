import { memo, useCallback, useEffect, useState } from "react";

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
import { ShortcutHelpModal } from "../../modal/ShortcutHelp/ShortcutHelpModal";
import { StencilCategoryMenu } from "../StencilLibrary/StencilCategoryMenu";
import { StencilLibraryItem } from "../StencilLibrary/StencilLibraryItem";

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
 * Returns true when an input element currently holds focus.
 * Used to prevent the global shortcut (`?`) from firing accidentally.
 */
const isEditableTarget = (target: EventTarget | null): boolean => {
	return (
		target instanceof HTMLInputElement ||
		target instanceof HTMLTextAreaElement ||
		target instanceof HTMLSelectElement
	);
};

/**
 * Unified toolbar centered at the top.
 * Combines the shape tools (StencilLibrary), zoom readout, and help (?) into a single bar.
 *
 * - Shape tools operate through the gesture system (data-kind="menu").
 * - Zoom +/- and the readout go through the command system (ToolbarHandler → handleCommand),
 *   the same path as the keyboard shortcuts and the context menu.
 * - Help is shown as a modal and can also be opened with the `?` key. It does not depend on the Canvas reducer.
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
	const [isHelpOpen, setIsHelpOpen] = useState(false);
	const closeHelp = useCallback(() => setIsHelpOpen(false), []);

	// The open category flyout (`openCategoryId`) lives in reducer state; the
	// toggle goes through StencilCategoryToggleHandler and dismissal through the
	// handlers/commands that clear it, so the Toolbar is stateless here and
	// multiple <Canvas> instances stay independent.

	// ModalShell owns closing on Escape; this only opens on "?".
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (isHelpOpen) {
				return;
			}

			// Open on `?` (Shift + / on most layouts). Ignore when modifier keys are held or while typing
			if (
				event.key === "?" &&
				!event.ctrlKey &&
				!event.metaKey &&
				!event.altKey &&
				!isEditableTarget(event.target)
			) {
				event.preventDefault();
				setIsHelpOpen(true);
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [isHelpOpen]);

	return (
		<>
			{/* The one [data-kind] element of the bar: its own buttons carry only
			    data-part and resolve their kind/id here through closest(), and a press
			    on the empty area arrives with no part (dismissing the open menus).
			    Nested targets with a different id (stencil-category / stencil-library)
			    keep their own [data-kind] and still win. */}
			<ToolbarContainer data-kind="menu" data-id="toolbar">
				{/* Left: host slot (when provided) and shape tools */}
				<ToolbarGroup>
					{leading != null && (
						<>
							<ToolbarHostSlot data-gesture="none">{leading}</ToolbarHostSlot>
							<ToolbarDivider />
						</>
					)}
					{layout.map((entry) => {
						if (entry.kind === "preset") {
							const preset = stencil.get(entry.presetId);
							if (!preset) {
								return null;
							}
							return (
								<StencilLibraryItem
									key={`preset:${entry.presetId}`}
									preset={preset}
									isActive={activePresetId === preset.id}
								/>
							);
						}
						// Resolve the layout's presetIds in order; a preset that isn't
						// registered (e.g. a plugin not applied) is silently skipped.
						const presets = entry.presetIds
							.map((id) => stencil.get(id))
							.filter((preset) => preset !== undefined);
						// A category with no resolvable presets has nothing to show, so
						// skip the button/flyout entirely rather than rendering an empty one.
						if (presets.length === 0) {
							return null;
						}
						return (
							<StencilCategoryMenu
								key={`category:${entry.id}`}
								id={entry.id}
								label={entry.label}
								icon={entry.icon}
								presets={presets}
								isOpen={openCategoryId === entry.id}
								activePresetId={activePresetId}
							/>
						);
					})}
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
						// Without data-gesture="none", pointerdown is captured by
						// the gesture system and click never fires
						data-gesture="none"
						onClick={() => setIsHelpOpen(true)}
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
			{isHelpOpen && <ShortcutHelpModal onClose={closeHelp} />}
		</>
	);
};

export const Toolbar = memo(ToolbarComponent);

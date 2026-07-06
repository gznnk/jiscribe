import { memo, useCallback, useEffect, useState } from "react";

import {
	ToolbarContainer,
	ToolbarDivider,
	ToolbarGroup,
	ToolbarIconButton,
	ZoomReadout,
} from "./ToolbarStyled";
import { HelpIcon } from "../../icons/HelpIcon";
import { ShapeLibraryItem } from "../ShapeLibrary/ShapeLibraryItem";
import { shapePresetRegistry } from "../ShapeLibrary/ShapePresetRegistry";
import { ShortcutHelpModal } from "../ShortcutHelp/ShortcutHelpModal";

type ToolbarProps = {
	/** ID of the shape preset currently being drawn (for the tool's active state) */
	activePresetId: string | null;
	/** Current zoom factor (1 = 100%) */
	zoom: number;
	/** Whether zooming in is possible (canExecute of the zoomIn command) */
	canZoomIn: boolean;
	/** Whether zooming out is possible (canExecute of the zoomOut command) */
	canZoomOut: boolean;
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
 * Combines the shape tools (ShapeLibrary), zoom readout, and help (?) into a single bar.
 *
 * - Shape tools operate through the gesture system (data-kind="menu").
 * - Zoom +/- is currently visual only (actual control is via wheel / pinch).
 * - Help is shown as a modal and can also be opened with the `?` key. It does not depend on the Canvas reducer.
 */
const ToolbarComponent: React.FC<ToolbarProps> = ({
	activePresetId,
	zoom,
	canZoomIn,
	canZoomOut,
}) => {
	const [isHelpOpen, setIsHelpOpen] = useState(false);
	const closeHelp = useCallback(() => setIsHelpOpen(false), []);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			// While open, close on Escape (works even when an input holds focus)
			if (isHelpOpen) {
				if (event.key === "Escape") {
					event.preventDefault();
					setIsHelpOpen(false);
				}
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
			<ToolbarContainer>
				{/* Left: shape tools */}
				<ToolbarGroup>
					{shapePresetRegistry.all().map((preset) => (
						<ShapeLibraryItem
							key={preset.id}
							preset={preset}
							isActive={activePresetId === preset.id}
						/>
					))}
				</ToolbarGroup>

				{/* Right: zoom readout and help */}
				<ToolbarGroup>
					{/* Zoom actions go through the command system (ToolbarHandler → handleCommand),
					    the same path as keyboard shortcuts and the context menu. */}
					<ToolbarIconButton
						type="button"
						aria-label="Zoom out"
						title="Zoom out"
						disabled={!canZoomOut}
						data-kind="menu"
						data-id="toolbar"
						data-part="command:zoomOut"
					>
						−
					</ToolbarIconButton>
					<ZoomReadout
						type="button"
						aria-label="Reset zoom to 100%"
						title="Reset zoom to 100%"
						data-kind="menu"
						data-id="toolbar"
						data-part="command:resetZoom"
					>
						{Math.round(zoom * 100)}%
					</ZoomReadout>
					<ToolbarIconButton
						type="button"
						aria-label="Zoom in"
						title="Zoom in"
						disabled={!canZoomIn}
						data-kind="menu"
						data-id="toolbar"
						data-part="command:zoomIn"
					>
						+
					</ToolbarIconButton>

					<ToolbarDivider />

					<ToolbarIconButton
						type="button"
						aria-label="Show keyboard shortcuts"
						title="Keyboard shortcuts"
						data-testid="shortcut-help:open"
						// Without data-gesture="none", pointerdown is captured by
						// the gesture system and click never fires
						data-gesture="none"
						onClick={() => setIsHelpOpen(true)}
					>
						<HelpIcon />
					</ToolbarIconButton>
				</ToolbarGroup>
			</ToolbarContainer>
			{isHelpOpen && <ShortcutHelpModal onClose={closeHelp} />}
		</>
	);
};

export const Toolbar = memo(ToolbarComponent);

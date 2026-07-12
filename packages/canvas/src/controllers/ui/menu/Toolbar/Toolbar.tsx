import { memo, useCallback, useEffect, useState } from "react";

import {
	ToolbarContainer,
	ToolbarDivider,
	ToolbarGroup,
	ToolbarHostSlot,
	ToolbarIconButton,
	ZoomReadout,
} from "./ToolbarStyled";
import { useCanvasRegistries } from "../../../contexts/CanvasRegistriesContext";
import { useCanvasMessages } from "../../../messages/CanvasMessagesContext";
import { HelpIcon } from "../../icons/HelpIcon";
import { ShapeLibraryItem } from "../ShapeLibrary/ShapeLibraryItem";
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
	/** Host UI at the left edge (see CanvasProps.toolbarLeading) */
	leading?: React.ReactNode;
	/** Host UI at the right edge (see CanvasProps.toolbarTrailing) */
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
	leading,
	trailing,
}) => {
	const messages = useCanvasMessages();
	const { shapePreset } = useCanvasRegistries();
	const [isHelpOpen, setIsHelpOpen] = useState(false);
	const closeHelp = useCallback(() => setIsHelpOpen(false), []);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			// While open, close on Escape (works even when an input holds focus).
			// stopPropagation で bubble 段の useKeyboardShortcuts に Escape を
			// DeselectAllCommand として消費させない（モーダルを閉じるだけにする）。
			if (isHelpOpen) {
				if (event.key === "Escape") {
					event.preventDefault();
					event.stopPropagation();
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

		// capture 段で登録する: モーダルは Canvas コンテナ内にあり、bubble 段では
		// コンテナの useKeyboardShortcuts が先に stopPropagation するため
		// document のリスナーまで Escape が届かない。
		document.addEventListener("keydown", handleKeyDown, true);
		return () => document.removeEventListener("keydown", handleKeyDown, true);
	}, [isHelpOpen]);

	return (
		<>
			<ToolbarContainer>
				{/* Left: host slot (when provided) and shape tools */}
				<ToolbarGroup>
					{leading != null && (
						<>
							<ToolbarHostSlot data-gesture="none">{leading}</ToolbarHostSlot>
							<ToolbarDivider />
						</>
					)}
					{shapePreset.all().map((preset) => (
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
						aria-label={messages.toolbarZoomOut}
						title={messages.toolbarZoomOut}
						disabled={!canZoomOut}
						data-kind="menu"
						data-id="toolbar"
						data-part="command:zoomOut"
					>
						−
					</ToolbarIconButton>
					<ZoomReadout
						type="button"
						aria-label={messages.toolbarResetZoom}
						title={messages.toolbarResetZoom}
						data-kind="menu"
						data-id="toolbar"
						data-part="command:resetZoom"
					>
						{Math.round(zoom * 100)}%
					</ZoomReadout>
					<ToolbarIconButton
						type="button"
						aria-label={messages.toolbarZoomIn}
						title={messages.toolbarZoomIn}
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

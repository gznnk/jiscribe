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
import { useCanvasRegistries } from "../../../contexts/CanvasRegistriesContext";
import { useCanvasMessages } from "../../../messages/CanvasMessagesContext";
import { HelpIcon } from "../../icons/HelpIcon";
import { ShortcutHelpModal } from "../../modal/ShortcutHelp/ShortcutHelpModal";
import { ShapeCategoryMenu } from "../ShapeLibrary/ShapeCategoryMenu";
import { ShapeLibraryItem } from "../ShapeLibrary/ShapeLibraryItem";

type ToolbarProps = {
	/** ID of the shape preset currently being drawn (for the tool's active state) */
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
	openCategoryId,
	zoom,
	canZoomIn,
	canZoomOut,
	layout = DEFAULT_TOOLBAR_LAYOUT,
	leading,
	trailing,
}) => {
	const messages = useCanvasMessages();
	const { shapePreset, shapeCategories } = useCanvasRegistries();
	const [isHelpOpen, setIsHelpOpen] = useState(false);
	const closeHelp = useCallback(() => setIsHelpOpen(false), []);

	// The open category flyout (`openCategoryId`) lives in reducer state; the
	// toggle goes through ShapeCategoryToggleHandler and dismissal through the
	// handlers/commands that clear it, so the Toolbar is stateless here and
	// multiple <Canvas> instances stay independent.

	// Escape での閉じ処理は ModalShell が担う。ここは「?」で開くだけ。
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
			<ToolbarContainer>
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
							const preset = shapePreset.get(entry.presetId);
							if (!preset) {
								return null;
							}
							return (
								<ShapeLibraryItem
									key={`preset:${entry.presetId}`}
									preset={preset}
									isActive={activePresetId === preset.id}
								/>
							);
						}
						// Category metadata comes from the registry (built-ins +
						// definition-declared). An unknown id (layout naming a category no
						// definition supplies) has no metadata, so skip its button.
						const category = shapeCategories.get(entry.categoryId);
						if (!category) {
							return null;
						}
						const presets = shapePreset.byCategory(entry.categoryId);
						// A category with no registered presets has nothing to show, so
						// skip the button/flyout entirely rather than rendering an empty one.
						if (presets.length === 0) {
							return null;
						}
						return (
							<ShapeCategoryMenu
								key={`category:${entry.categoryId}`}
								category={category}
								presets={presets}
								isOpen={openCategoryId === entry.categoryId}
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

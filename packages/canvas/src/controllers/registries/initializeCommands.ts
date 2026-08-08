import type { CanvasRegistries } from "./CanvasRegistries";
import { BringForwardCommand } from "../commands/arrange/BringForwardCommand";
import { BringToFrontCommand } from "../commands/arrange/BringToFrontCommand";
import { moveCommands } from "../commands/arrange/MoveCommands";
import { SendBackwardCommand } from "../commands/arrange/SendBackwardCommand";
import { SendToBackCommand } from "../commands/arrange/SendToBackCommand";
import { SwapArrowsCommand } from "../commands/arrow/SwapArrowsCommand";
import type { Command } from "../commands/CommandTypes";
import { ResetConnectorRouteCommand } from "../commands/connector/ResetConnectorRouteCommand";
import {
	SetRoutingOrthogonalCommand,
	SetRoutingStraightCommand,
} from "../commands/connector/SetConnectorRoutingCommand";
import { ExportCommand } from "../commands/export/ExportCommand";
import { GroupCommand } from "../commands/group/GroupCommand";
import { UngroupCommand } from "../commands/group/UngroupCommand";
import { RedoCommand } from "../commands/history/RedoCommand";
import { UndoCommand } from "../commands/history/UndoCommand";
import { CopyCommand } from "../commands/selection/CopyCommand";
import { CutCommand } from "../commands/selection/CutCommand";
import { DeleteCommand } from "../commands/selection/DeleteCommand";
import { DeselectAllCommand } from "../commands/selection/DeselectAllCommand";
import { DuplicateCommand } from "../commands/selection/DuplicateCommand";
import { EscapeSelectionCommand } from "../commands/selection/EscapeSelectionCommand";
import { PasteCommand } from "../commands/selection/PasteCommand";
import { SelectAllCommand } from "../commands/selection/SelectAllCommand";
import { SelectNextTextSlotCommand } from "../commands/selection/SelectNextTextSlotCommand";
import { SelectPreviousTextSlotCommand } from "../commands/selection/SelectPreviousTextSlotCommand";
import { StartTextEditCommand } from "../commands/text/StartTextEditCommand";
import { ResetZoomCommand } from "../commands/view/ResetZoomCommand";
import { ZoomInCommand } from "../commands/view/ZoomInCommand";
import { ZoomOutCommand } from "../commands/view/ZoomOutCommand";
import { ZoomToFitCommand } from "../commands/view/ZoomToFitCommand";
import { ZoomToSelectionCommand } from "../commands/view/ZoomToSelectionCommand";

/**
 * Every command available to a canvas, in registration order.
 * `createCanvasRegistries` registers all of these by default, or a filtered
 * subset when `config.commands` restricts the enabled command ids.
 */
export const ALL_COMMANDS: Command[] = [
	// Edit commands
	UndoCommand,
	RedoCommand,
	// Clipboard commands
	CopyCommand,
	CutCommand,
	PasteCommand,
	DuplicateCommand,
	// Selection commands
	SelectAllCommand,
	DeselectAllCommand,
	EscapeSelectionCommand,
	SelectNextTextSlotCommand,
	SelectPreviousTextSlotCommand,
	DeleteCommand,
	// Arrange commands
	BringToFrontCommand,
	BringForwardCommand,
	SendBackwardCommand,
	SendToBackCommand,
	// Move (nudge) commands: 8 commands (up/down/left/right x normal/Shift)
	...moveCommands,
	// Arrow commands
	SwapArrowsCommand,
	// Connector routing commands
	SetRoutingStraightCommand,
	SetRoutingOrthogonalCommand,
	ResetConnectorRouteCommand,
	// Group commands
	GroupCommand,
	UngroupCommand,
	// Text commands
	StartTextEditCommand,
	// View commands
	ZoomInCommand,
	ZoomOutCommand,
	ResetZoomCommand,
	ZoomToFitCommand,
	ZoomToSelectionCommand,
	// Export command (definition-only; executed via callback)
	ExportCommand,
];

/**
 * Clears the bundle's command registry and registers the enabled commands.
 *
 * Clears first (like the other `initialize*` bundle populators) so re-running it
 * — tests, partial init, hot reload — never leaves stale commands behind: the
 * registry always ends up with exactly the listed command ids.
 *
 * @param registries Target bundle to populate.
 * @param commandIds When provided, only commands whose id is included are
 * registered (enables per-canvas command restriction). Defaults to all.
 */
export const initializeCommands = (
	registries: CanvasRegistries,
	commandIds?: readonly string[],
): void => {
	registries.command.clear();
	const enabled = commandIds ? new Set(commandIds) : undefined;
	const commands = enabled
		? ALL_COMMANDS.filter((command) => enabled.has(command.id))
		: ALL_COMMANDS;
	registries.command.registerAll(commands);
};

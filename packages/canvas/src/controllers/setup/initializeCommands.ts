import type { CanvasRegistries } from "./CanvasRegistries";
import { singletonRegistries } from "./CanvasRegistries";
import { BringForwardCommand } from "../commands/arrange/BringForwardCommand";
import { BringToFrontCommand } from "../commands/arrange/BringToFrontCommand";
import { moveCommands } from "../commands/arrange/MoveCommands";
import { SendBackwardCommand } from "../commands/arrange/SendBackwardCommand";
import { SendToBackCommand } from "../commands/arrange/SendToBackCommand";
import { SwapArrowsCommand } from "../commands/arrow/SwapArrowsCommand";
import type { Command } from "../commands/CommandTypes";
import {
	SetRoutingOrthogonalCommand,
	SetRoutingStraightCommand,
} from "../commands/connector/SetConnectorRoutingCommand";
import { GroupCommand } from "../commands/group/GroupCommand";
import { UngroupCommand } from "../commands/group/UngroupCommand";
import { RedoCommand } from "../commands/history/RedoCommand";
import { UndoCommand } from "../commands/history/UndoCommand";
import { CopyCommand } from "../commands/selection/CopyCommand";
import { CutCommand } from "../commands/selection/CutCommand";
import { DeleteCommand } from "../commands/selection/DeleteCommand";
import { DeselectAllCommand } from "../commands/selection/DeselectAllCommand";
import { DuplicateCommand } from "../commands/selection/DuplicateCommand";
import { SelectAllCommand } from "../commands/selection/SelectAllCommand";
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
	DuplicateCommand,
	// Selection commands
	SelectAllCommand,
	DeselectAllCommand,
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
];

/**
 * Registers commands into the bundle's command registry.
 *
 * @param registries Target bundle. Defaults to the module-level singletons for
 * backward compatibility with existing singleton consumers.
 * @param commandIds When provided, only commands whose id is included are
 * registered (enables per-canvas command restriction). Defaults to all.
 */
export const initializeCommands = (
	registries: CanvasRegistries = singletonRegistries,
	commandIds?: readonly string[],
): void => {
	const enabled = commandIds ? new Set(commandIds) : undefined;
	const commands = enabled
		? ALL_COMMANDS.filter((command) => enabled.has(command.id))
		: ALL_COMMANDS;
	registries.command.registerAll(commands);
};

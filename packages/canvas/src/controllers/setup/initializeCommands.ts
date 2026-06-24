import { BringForwardCommand } from "../commands/arrange/BringForwardCommand";
import { BringToFrontCommand } from "../commands/arrange/BringToFrontCommand";
import { moveCommands } from "../commands/arrange/MoveCommands";
import { SendBackwardCommand } from "../commands/arrange/SendBackwardCommand";
import { SendToBackCommand } from "../commands/arrange/SendToBackCommand";
import { SwapArrowsCommand } from "../commands/arrow/SwapArrowsCommand";
import { commandRegistry } from "../commands/CommandRegistry";
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
 * コマンドをレジストリに登録
 */
export const initializeCommands = (): void => {
	commandRegistry
		// Edit commands
		.register(UndoCommand)
		.register(RedoCommand)
		// Clipboard commands
		.register(CopyCommand)
		.register(CutCommand)
		.register(DuplicateCommand)
		// Selection commands
		.register(SelectAllCommand)
		.register(DeselectAllCommand)
		.register(DeleteCommand)
		// Arrange commands
		.register(BringToFrontCommand)
		.register(BringForwardCommand)
		.register(SendBackwardCommand)
		.register(SendToBackCommand)
		// Move (nudge) commands: 上下左右 × 通常/Shift の 8 コマンド
		.registerAll(moveCommands)
		// Arrow commands
		.register(SwapArrowsCommand)
		// Group commands
		.register(GroupCommand)
		.register(UngroupCommand)
		// Text commands
		.register(StartTextEditCommand)
		// View commands
		.register(ZoomInCommand)
		.register(ZoomOutCommand)
		.register(ResetZoomCommand)
		.register(ZoomToFitCommand)
		.register(ZoomToSelectionCommand);
};

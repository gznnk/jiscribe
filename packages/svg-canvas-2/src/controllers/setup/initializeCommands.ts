import { BringForwardCommand } from "../commands/arrange/BringForwardCommand";
import { BringToFrontCommand } from "../commands/arrange/BringToFrontCommand";
import { SendBackwardCommand } from "../commands/arrange/SendBackwardCommand";
import { SendToBackCommand } from "../commands/arrange/SendToBackCommand";
import { commandRegistry } from "../commands/CommandRegistry";
import { GroupCommand } from "../commands/group/GroupCommand";
import { UngroupCommand } from "../commands/group/UngroupCommand";
import { DeleteCommand } from "../commands/selection/DeleteCommand";
import { DeselectAllCommand } from "../commands/selection/DeselectAllCommand";
import { SelectAllCommand } from "../commands/selection/SelectAllCommand";

/**
 * コマンドをレジストリに登録
 */
export const initializeCommands = (): void => {
	commandRegistry
		// Selection commands
		.register(SelectAllCommand)
		.register(DeselectAllCommand)
		.register(DeleteCommand)
		// Arrange commands
		.register(BringToFrontCommand)
		.register(BringForwardCommand)
		.register(SendBackwardCommand)
		.register(SendToBackCommand)
		// Group commands
		.register(GroupCommand)
		.register(UngroupCommand);
};

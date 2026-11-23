import {
	LayoutLeftToRightCommand,
	LayoutTopToBottomCommand,
} from "../../../../commands/arrange/layout/LayoutCommands";
import { ROUTE_CONNECTORS_COMMAND_ID } from "../../../../commands/arrange/layout/RouteConnectorsCommand";
import type { CommandRegistry } from "../../../../commands/CommandRegistry";

/** The commands the Tidy up section offers: AutoLayoutItem's buttons and RouteConnectorsItem's. */
const TIDY_UP_COMMAND_IDS: readonly string[] = [
	LayoutTopToBottomCommand.id,
	LayoutLeftToRightCommand.id,
	ROUTE_CONNECTORS_COMMAND_ID,
];

/**
 * Whether the sidebar's Tidy up section — automatic layout and line redrawing —
 * has anything to hold, so its heading never stands over an empty body.
 *
 * Only registration is read, not `canExecute`: a command that cannot run now still
 * draws a disabled button. When the section appears is decided by the panel (with
 * the Canvas section, or with the Arrange one).
 *
 * @param command - The canvas's command registry; a host's `CanvasConfig.commands` may have left these commands out of it
 * @returns True while at least one of the two layout directions or `routeConnectors` is registered
 */
export const isTidyUpSectionShown = (
	command: Pick<CommandRegistry, "get">,
): boolean =>
	TIDY_UP_COMMAND_IDS.some((commandId) => command.get(commandId) !== undefined);

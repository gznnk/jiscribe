import type { Command } from "../CommandTypes";

/**
 * Definition-only command for image export: registers the label so menus
 * resolve it from the registry like any other command, while execution stays
 * a callback (the export dialog reads the live SVG DOM — see useCanvasExport).
 * No shortcuts / no category, so it does not appear in the shortcut help.
 */
export const ExportCommand: Command = {
	id: "export",
	label: "Export…",
	canExecute: () => true,
};

import type { ExecutableCommand } from "../CommandTypes";

/**
 * Opens the image export dialog. `execute` only raises the dialog; the export
 * itself stays a callback (it reads the live SVG DOM — see useCanvasExport's
 * submit handler). No shortcuts / no category, so it does not appear in the
 * shortcut help.
 */
export const ExportCommand: ExecutableCommand = {
	id: "export",
	label: "Export…",
	canExecute: () => true,

	execute: (state) =>
		state.activeModal === "export"
			? state
			: { ...state, activeModal: "export" },
};

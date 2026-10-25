// The native menu bar. Open… and Quit are drawn by the viewer page (the
// runtime's hostActions), so the bar has nothing of its own left to show;
// macOS keeps the two roles the platform needs. Nothing in here imports electron
// at run time, which is what lets vitest load it.

import type { MenuItemConstructorOptions } from "electron";

/**
 * The application menu template for `platform`.
 *
 * @param platform `process.platform` of the machine the app runs on
 * @returns On darwin, the app menu (where Quit and Cmd+Q live) and the Edit menu
 *   (without it Cmd+C / Cmd+V do nothing in a text field) and no more; null on
 *   every other platform, meaning no menu bar at all
 */
export const buildMenuTemplate = (
	platform: NodeJS.Platform,
): MenuItemConstructorOptions[] | null =>
	platform === "darwin" ? [{ role: "appMenu" }, { role: "editMenu" }] : null;

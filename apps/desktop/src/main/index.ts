// The jiscribe-desktop entry point (PoC). The app is the MCP server: it holds
// the endpoint AI clients connect to by URL, and shows the canvas viewer in its
// own window instead of a spawned browser.

import { app, dialog, Menu, type MenuItemConstructorOptions } from "electron";
import {
	CANVAS_FILE_EXTENSIONS,
	createJiscribeMcpRuntime,
} from "jiscribe-mcp/server";

import { startMcpHttpServer } from "./mcpHttpServer";
import { createViewerWindows } from "./viewerWindows";

/**
 * How long the shutdown is given before the app exits regardless: a viewer that
 * never lets go of its socket must not leave the app impossible to quit
 */
const FORCED_EXIT_DELAY_MS = 10_000;

/** What open_canvas accepts, in the dot-less form the file dialog's filter takes */
const CANVAS_DIALOG_EXTENSIONS = CANVAS_FILE_EXTENSIONS.map((extension) =>
	extension.slice(1),
);

/**
 * Build the application menu: File with Open… and Quit, and the default Edit,
 * View and Window roles so copy and paste and the devtools keep working.
 */
const buildMenu = (onOpenFile: () => void): Menu => {
	const template: MenuItemConstructorOptions[] = [
		...(process.platform === "darwin"
			? [{ role: "appMenu" } satisfies MenuItemConstructorOptions]
			: []),
		{
			label: "File",
			submenu: [
				{
					label: "Open…",
					accelerator: "CmdOrCtrl+O",
					click: onOpenFile,
				},
				{ type: "separator" },
				{ role: "quit" },
			],
		},
		{ role: "editMenu" },
		{ role: "viewMenu" },
		{ role: "windowMenu" },
	];
	return Menu.buildFromTemplate(template);
};

const main = async (): Promise<void> => {
	if (!app.requestSingleInstanceLock()) {
		// The running instance is told through second-instance and shows itself
		app.exit(0);
		return;
	}
	await app.whenReady();

	// The stdio server's way of not spawning a browser; this app has no browser
	// to spawn, and would otherwise report a viewer it never shows
	if (process.env.JISCRIBE_MCP_NO_OPEN !== undefined) {
		console.warn(
			"jiscribe-desktop: JISCRIBE_MCP_NO_OPEN is ignored; the viewer is this app's own window",
		);
		delete process.env.JISCRIBE_MCP_NO_OPEN;
	}

	// Assigned once the windows exist; the host can only ask for a window after
	// openCanvas, which nothing can call before then
	let viewerWindows: ReturnType<typeof createViewerWindows> | null = null;
	const runtime = createJiscribeMcpRuntime({
		launchViewer: (url, browserOptions) => {
			viewerWindows?.launchViewer(url, browserOptions);
		},
		raiseVisibleViewer: () => {
			viewerWindows?.showMainWindow();
		},
	});
	const mcpHttpServer = await startMcpHttpServer({
		runtime,
		// The hidden windows live as long as the AI clients, as the stdio server's
		// headless Chromium does; the main window is the person's and stays
		onAllSessionsEnded: () => {
			viewerWindows?.closeHeadlessWindows();
		},
	});
	const windows = createViewerWindows(mcpHttpServer.url);
	viewerWindows = windows;
	console.log(`jiscribe-desktop: MCP endpoint ${mcpHttpServer.url}`);

	/**
	 * Bring the window back. Hiding it dropped the viewer page, so a host still
	 * showing a file is asked to put its viewer up again rather than the
	 * placeholder.
	 */
	const restoreMainWindow = (): void => {
		const host = runtime.getHost();
		if (host !== null && !host.hasVisibleViewer()) {
			host.openVisibleViewer();
			return;
		}
		windows.showMainWindow();
	};

	const openFileFromDialog = async (): Promise<void> => {
		const { canceled, filePaths } = await dialog.showOpenDialog({
			properties: ["openFile"],
			filters: [
				{ name: "Jiscribe canvas", extensions: CANVAS_DIALOG_EXTENSIONS },
			],
		});
		const [filePath] = filePaths;
		if (canceled || filePath === undefined) {
			return;
		}
		const reply = await runtime.openCanvas(filePath, { headless: false });
		if (reply.startsWith("error:")) {
			dialog.showErrorBox("Could not open the canvas", reply);
		}
	};
	Menu.setApplicationMenu(
		buildMenu(() => {
			openFileFromDialog().catch((error: unknown) => {
				dialog.showErrorBox("Could not open the canvas", String(error));
			});
		}),
	);

	app.on("second-instance", restoreMainWindow);
	app.on("activate", restoreMainWindow);
	// The main window is only ever hidden, and the app keeps serving MCP with
	// every window gone; quitting is the menu's job
	app.on("window-all-closed", () => {});

	// app.exit skips before-quit, so the quit this handler holds back is never
	// held back again once the shutdown below ends it
	let isShuttingDown = false;
	app.on("before-quit", (event) => {
		event.preventDefault();
		if (isShuttingDown) {
			return;
		}
		isShuttingDown = true;
		windows.allowClose();
		setTimeout(() => {
			app.exit(0);
		}, FORCED_EXIT_DELAY_MS).unref();
		void (async () => {
			try {
				// The viewers are asked to close while the host can still reach them
				await runtime.close();
				await mcpHttpServer.close();
			} catch (error) {
				console.error("jiscribe-desktop: shutdown failed:", error);
			} finally {
				app.exit(0);
			}
		})();
	});
};

// Electron answers an uncaught exception with a modal dialog that blocks the
// main thread, and with it the MCP endpoint, until someone dismisses it
process.on("uncaughtException", (error: unknown) => {
	console.error("jiscribe-desktop: uncaught exception:", error);
});
process.on("unhandledRejection", (reason: unknown) => {
	console.error("jiscribe-desktop: unhandled rejection:", reason);
});

main().catch((error: unknown) => {
	console.error("jiscribe-desktop failed to start:", error);
	app.exit(1);
});

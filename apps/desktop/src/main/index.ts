// The jiscribe-desktop entry point (PoC). The app is the MCP server: it holds
// the endpoint AI clients connect to by URL, and shows the canvas viewer in its
// own window instead of a spawned browser.

import { app, dialog, Menu } from "electron";
import {
	CANVAS_FILE_EXTENSIONS,
	createJiscribeMcpRuntime,
	FLUSH_EDITS_TIMEOUT_MS,
	VIEWER_CLOSE_TIMEOUT_MS,
} from "jiscribe-mcp/server";

import { buildMenuTemplate } from "./applicationMenu";
import {
	getDisplayedCanvasPath,
	listStartupCanvasCandidates,
	tryOpenCanvasCandidates,
	writeLastCanvasPath,
} from "./lastCanvas";
import { startMcpHttpServer } from "./mcpHttpServer";
import { createViewerWindows } from "./viewerWindows";

/**
 * What the shutdown is allowed on top of the two waits it may sit out in full
 * (the viewers' flush, then their close): closing the host and the HTTP server,
 * which hold no timer of their own
 */
const FORCED_EXIT_MARGIN_MS = 2_000;

/**
 * How long the shutdown is given before the app exits regardless: a viewer that
 * never lets go of its socket must not leave the app impossible to quit. It
 * outlasts the shutdown's own timeouts, or a slow viewer would be cut off
 * before the flush it was given time for is judged
 */
const FORCED_EXIT_DELAY_MS =
	FLUSH_EDITS_TIMEOUT_MS + VIEWER_CLOSE_TIMEOUT_MS + FORCED_EXIT_MARGIN_MS;

/** What open_canvas accepts, in the dot-less form the file dialog's filter takes */
const CANVAS_DIALOG_EXTENSIONS = CANVAS_FILE_EXTENSIONS.map((extension) =>
	extension.slice(1),
);

/** The title of the error box an Open… that failed is reported in */
const OPEN_CANVAS_ERROR_TITLE = "Could not open the canvas";

const describeError = (error: unknown): string =>
	error instanceof Error ? error.message : String(error);

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
	const userDataDir = app.getPath("userData");

	// Assigned once the windows exist; the host can only ask for a window after
	// openCanvas, which nothing can call before then
	let viewerWindows: ReturnType<typeof createViewerWindows> | null = null;

	// The two functions below are declared before `runtime` and reach it
	// late-bound: nothing calls them before the runtime, which hands the host its
	// actions, exists

	/**
	 * Write down the canvas on display so the next start opens it again. A
	 * failed write is logged and nothing more: it must not stop a quit
	 */
	const rememberDisplayedCanvas = async (): Promise<void> => {
		const host = runtime.getHost();
		const displayedPath = host === null ? null : getDisplayedCanvasPath(host);
		if (displayedPath === null) {
			return;
		}
		try {
			await writeLastCanvasPath(userDataDir, displayedPath);
		} catch (error) {
			console.error(
				"jiscribe-desktop: could not record the open canvas:",
				error,
			);
		}
	};

	/**
	 * The viewer's Open…: the file dialog, then the open. It settles once the
	 * dialog has closed and runs the open detached (why it must not wait for it:
	 * HostActions in jiscribe-mcp); a failure is shown in an error box
	 */
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
		void (async () => {
			try {
				const reply = await runtime.openCanvas(filePath, { headless: false });
				if (reply.startsWith("error:")) {
					dialog.showErrorBox(OPEN_CANVAS_ERROR_TITLE, reply);
					return;
				}
				await rememberDisplayedCanvas();
			} catch (error) {
				dialog.showErrorBox(OPEN_CANVAS_ERROR_TITLE, describeError(error));
			}
		})();
	};

	const runtime = createJiscribeMcpRuntime({
		launchViewer: (url, browserOptions) => {
			viewerWindows?.launchViewer(url, browserOptions);
		},
		raiseVisibleViewer: () => {
			viewerWindows?.showMainWindow();
		},
		hostActions: {
			openFile: () =>
				openFileFromDialog().catch((error: unknown) => {
					dialog.showErrorBox(OPEN_CANVAS_ERROR_TITLE, describeError(error));
				}),
			quit: () => {
				app.quit();
			},
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

	const menuTemplate = buildMenuTemplate(process.platform);
	Menu.setApplicationMenu(
		menuTemplate === null ? null : Menu.buildFromTemplate(menuTemplate),
	);

	/**
	 * Open a canvas in the window, reporting a failure on stderr instead of
	 * throwing.
	 *
	 * @returns null once the canvas is on display; else why it is not, naming the
	 *   file, in words meant for the person
	 */
	const tryOpenCanvas = async (canvasPath: string): Promise<string | null> => {
		let detail: string;
		try {
			const reply = await runtime.openCanvas(canvasPath, { headless: false });
			if (!reply.startsWith("error:")) {
				return null;
			}
			detail = reply.slice("error:".length).trim();
		} catch (error) {
			detail = describeError(error);
		}
		const reason = `${canvasPath}: ${detail}`;
		console.error(`jiscribe-desktop: could not open ${reason}`);
		return reason;
	};

	// One opening at a time: a second start or macOS's `activate` can arrive
	// while the start-up opening is under way, and both must end on one canvas
	let startupCanvasOpening: Promise<void> | null = null;
	/**
	 * Put a canvas on display when none is: the one open at the app's last quit
	 * or Open…, else its scratch canvas. With neither openable, the placeholder
	 * comes up naming the last failure and every one goes to stderr; the person
	 * can still have the AI open a file
	 */
	const openStartupCanvas = (): Promise<void> => {
		startupCanvasOpening ??= (async () => {
			try {
				const lastFailure = await tryOpenCanvasCandidates(
					await listStartupCanvasCandidates(userDataDir),
					tryOpenCanvas,
				);
				if (lastFailure !== null) {
					windows.showOpenFailure(lastFailure);
				}
			} catch (error) {
				console.error("jiscribe-desktop: could not open a canvas:", error);
				windows.showOpenFailure(describeError(error));
			} finally {
				startupCanvasOpening = null;
			}
		})();
		return startupCanvasOpening;
	};

	/**
	 * Bring the window back. Hiding it dropped the viewer page, so a host still
	 * showing a file is asked to put its viewer up again rather than the
	 * placeholder; with no host (close_canvas folded it), the last or scratch
	 * canvas is opened, there being no other way for a person to get one.
	 */
	const restoreMainWindow = (): void => {
		const host = runtime.getHost();
		if (host === null) {
			void openStartupCanvas();
			return;
		}
		if (!host.hasVisibleViewer()) {
			host.openVisibleViewer();
			return;
		}
		windows.showMainWindow();
	};

	app.on("second-instance", restoreMainWindow);
	app.on("activate", restoreMainWindow);
	// The main window is only ever hidden, and the app keeps serving MCP with
	// every window gone; quitting is the viewer's Quit, or the app menu's on macOS
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
				const host = runtime.getHost();
				if (host !== null) {
					await rememberDisplayedCanvas();
					// runtime.close only asks the viewers to close; an edit still on a
					// viewer's save debounce would go with the window
					await host.flushViewers(FLUSH_EDITS_TIMEOUT_MS);
				}
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

	await openStartupCanvas();
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

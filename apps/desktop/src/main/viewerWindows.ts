// The windows the canvas host's viewers are shown in. There is one window a
// person sees, which hides rather than closes when they close it, and any number
// of hidden ones the AI looks through (open_canvas headless).

import { BrowserWindow, session, shell, type WebPreferences } from "electron";
import type { BrowserOpenOptions } from "jiscribe-mcp/server";

const EXTERNAL_URL_PATTERN = /^https?:\/\//i;

const VIEWER_WEB_PREFERENCES: WebPreferences = {
	contextIsolation: true,
	nodeIntegration: false,
	sandbox: true,
};

export type ViewerWindows = {
	/**
	 * What the runtime's `launchViewer` is given: a window nobody sees for mode
	 * `"headless"`, the main window for anything else
	 */
	launchViewer: (url: string, browserOptions: BrowserOpenOptions) => void;
	/** Shows the main window and brings it to the front, wherever it was */
	showMainWindow: () => void;
	/**
	 * Destroys every hidden window open_canvas headless opened. Nothing on screen
	 * is touched
	 */
	closeHeadlessWindows: () => void;
	/**
	 * Lets the main window close for real from now on, instead of hiding. Called
	 * once the app has started quitting
	 */
	allowClose: () => void;
};

/**
 * Load a page, reporting a failed load instead of leaving the rejection
 * unhandled. A load cut short by the next one rejects as well, which is normal
 * here (the viewer and the placeholder replace each other).
 */
const loadInto = (window: BrowserWindow, url: string): void => {
	window.loadURL(url).catch((error: unknown) => {
		console.error(`failed to load ${url}:`, error);
	});
};

/** What the viewer asks the browser for: the clipboard, for copy and paste */
const GRANTED_PERMISSIONS: ReadonlySet<string> = new Set([
	"clipboard-read",
	"clipboard-sanitized-write",
]);

/**
 * Open a link where the system browser shows it, and nowhere in this app.
 * Only http(s) goes: a file: or custom-scheme link would start whatever
 * handles it on the machine.
 */
const openLinkOutside = (url: string): void => {
	if (EXTERNAL_URL_PATTERN.test(url)) {
		void shell.openExternal(url);
	}
};

/**
 * Keep a window on the pages this app loads into it. The viewer and the
 * placeholder are the only pages meant to be in one, and the main process
 * loads them itself (loadURL raises neither event), so every navigation a page
 * starts, by link or by script, is a link to show outside.
 */
const lockNavigation = (window: BrowserWindow): void => {
	window.webContents.setWindowOpenHandler(({ url }) => {
		openLinkOutside(url);
		return { action: "deny" };
	});
	window.webContents.on("will-navigate", (event, url) => {
		event.preventDefault();
		openLinkOutside(url);
	});
};

/**
 * Grant pages only what the viewer uses. Electron grants every permission
 * request by default, to a page that could be anything a navigation reached.
 */
const restrictPermissions = (): void => {
	session.defaultSession.setPermissionRequestHandler(
		(_webContents, permission, callback) => {
			callback(GRANTED_PERMISSIONS.has(permission));
		},
	);
	session.defaultSession.setPermissionCheckHandler((_webContents, permission) =>
		GRANTED_PERMISSIONS.has(permission),
	);
};

/**
 * Create the windows' controls and the main window, showing the placeholder
 * page.
 *
 * @param mcpUrl The MCP endpoint the placeholder page prints for the person to
 *   hand to their AI client
 */
export function createViewerWindows(mcpUrl: string): ViewerWindows {
	let isClosingAllowed = false;
	restrictPermissions();

	const placeholderUrl = ((): string => {
		const query = new URLSearchParams({ mcpUrl }).toString();
		// Set by electron-vite while the dev server is serving the renderer
		const devServerUrl = process.env.ELECTRON_RENDERER_URL;
		if (devServerUrl !== undefined && devServerUrl !== "") {
			return `${devServerUrl}?${query}`;
		}
		const pageUrl = new URL("../renderer/index.html", import.meta.url);
		pageUrl.search = query;
		return pageUrl.href;
	})();

	let mainWindow: BrowserWindow | null = null;
	const headlessWindows = new Set<BrowserWindow>();

	/**
	 * The main window, if it can still be used. Between the viewer's own
	 * window.close() and the `closed` event the window is destroyed but still
	 * held, and loading into it throws
	 */
	const getLiveMainWindow = (): BrowserWindow | null =>
		mainWindow !== null && !mainWindow.isDestroyed() ? mainWindow : null;

	/**
	 * Create the main window showing `pageUrl`. The viewer's own window.close()
	 * (a closeViewer frame) destroys the window without a `close` event, so it is
	 * created again on the next use rather than once for good.
	 */
	const createMainWindow = (pageUrl: string): BrowserWindow => {
		const window = new BrowserWindow({
			width: 1280,
			height: 800,
			title: "Jiscribe",
			webPreferences: VIEWER_WEB_PREFERENCES,
		});
		lockNavigation(window);
		window.on("close", (event) => {
			if (isClosingAllowed) {
				return;
			}
			event.preventDefault();
			window.hide();
			// Leaving the viewer page drops its WebSocket, which is how the host
			// learns the window is gone: close_canvas counts it as closed, and the
			// host folds up once no window comes back
			loadInto(window, placeholderUrl);
		});
		window.on("closed", () => {
			if (mainWindow === window) {
				mainWindow = null;
			}
		});
		mainWindow = window;
		loadInto(window, pageUrl);
		return window;
	};
	createMainWindow(placeholderUrl);

	const showMainWindow = (): void => {
		const window = getLiveMainWindow() ?? createMainWindow(placeholderUrl);
		if (window.isMinimized()) {
			window.restore();
		}
		window.show();
		window.focus();
	};

	const openHeadlessWindow = (url: string): void => {
		const headlessWindow = new BrowserWindow({
			show: false,
			webPreferences: {
				...VIEWER_WEB_PREFERENCES,
				// A hidden window is throttled like a background tab otherwise, and
				// the screen tools wait on it to draw
				backgroundThrottling: false,
			},
		});
		lockNavigation(headlessWindow);
		headlessWindows.add(headlessWindow);
		headlessWindow.on("closed", () => {
			headlessWindows.delete(headlessWindow);
		});
		loadInto(headlessWindow, url);
	};

	return {
		launchViewer: (url, browserOptions) => {
			if (browserOptions.mode === "headless") {
				openHeadlessWindow(url);
				return;
			}
			const window = getLiveMainWindow();
			if (window === null) {
				createMainWindow(url);
			} else {
				loadInto(window, url);
			}
			showMainWindow();
		},
		showMainWindow,
		closeHeadlessWindows: () => {
			// Destroyed outright: nothing in a page nobody sees may hold it open
			for (const headlessWindow of [...headlessWindows]) {
				headlessWindow.destroy();
			}
		},
		allowClose: () => {
			isClosingAllowed = true;
		},
	};
}

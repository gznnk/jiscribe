/** One command to hand to spawn. The head is the executable, the rest its arguments */
export type BrowserOpenCommand = readonly [string, ...string[]];

/**
 * How the viewer is opened.
 * - `app`: through a Chromium-family `--app=`, in a window with no tabs and no
 *   address bar
 * - `tab`: in a tab of the default browser
 */
export type BrowserOpenMode = "app" | "tab";

/**
 * Windows-side Chromium reachable from WSL. Chrome first, then Edge, which is
 * always there
 */
const WINDOWS_CHROMIUM_PATHS = [
	"/mnt/c/Program Files/Google/Chrome/Application/chrome.exe",
	"/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe",
	"/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
	"/mnt/c/Program Files/Microsoft/Edge/Application/msedge.exe",
] as const;

/** Chromium executable names tried on Linux (WSL included) */
const LINUX_CHROMIUM_COMMANDS = [
	"google-chrome",
	"google-chrome-stable",
	"chromium",
	"chromium-browser",
	"microsoft-edge",
] as const;

/** macOS's `open -na <app>`. What follows --args reaches the browser itself */
const MACOS_CHROMIUM_APPS = ["Google Chrome", "Microsoft Edge"] as const;

/**
 * The candidate commands for opening a URL in a tab of the default browser, in the
 * order they are tried.
 *
 * @param url The URL to open. It goes in as the command's last argument
 * @param platform The value of `process.platform`. Anything but win32 / darwin is
 *   treated as Linux
 * @returns Never empty. The commands in the order they are tried
 */
const calcTabOpenCommands = (
	url: string,
	platform: NodeJS.Platform,
): readonly BrowserOpenCommand[] => {
	if (platform === "win32") {
		// start is a cmd builtin. Its first argument is taken as a window title, so
		// an empty one is passed
		return [["cmd", "/c", "start", "", url]];
	}
	if (platform === "darwin") {
		return [["open", url]];
	}
	// WSL often has no xdg-open. wslu's wslview goes in between, and last comes the
	// Windows-side PowerShell (which on WSL works with nothing extra installed)
	return [
		["xdg-open", url],
		["wslview", url],
		["powershell.exe", "-NoProfile", "-Command", "Start-Process", url],
	];
};

/**
 * The candidate commands for opening with `--app=`, in the order they are tried.
 * Whatever the default browser is, this names the Chromium it found and launches
 * that (app mode exists only in the Chromium family).
 *
 * @param url The URL to open
 * @param platform The value of `process.platform`. Anything but win32 / darwin is
 *   treated as Linux
 * @param browserCommand The executable to name. When omitted, the known Chromiums
 *   are tried in order
 * @returns The commands in the order they are tried. Empty when there is not one
 *   candidate
 */
const calcAppOpenCommands = (
	url: string,
	platform: NodeJS.Platform,
	browserCommand: string | undefined,
): readonly BrowserOpenCommand[] => {
	const appArg = `--app=${url}`;
	if (browserCommand !== undefined) {
		return [[browserCommand, appArg]];
	}
	if (platform === "win32") {
		// chrome / msedge are listed under App Paths rather than on PATH, so
		// CreateProcess cannot invoke them directly. Leave it to start, which goes
		// through ShellExecute
		return [
			["cmd", "/c", "start", "", "chrome", appArg],
			["cmd", "/c", "start", "", "msedge", appArg],
		];
	}
	if (platform === "darwin") {
		return MACOS_CHROMIUM_APPS.map(
			(app) => ["open", "-na", app, "--args", appArg] as const,
		);
	}
	// From WSL a Windows-side .exe can be launched directly by path. When one is not
	// there, ENOENT drops through to the next candidate, so leaving them in the list
	// on plain Linux is fine
	return [
		...LINUX_CHROMIUM_COMMANDS.map((command) => [command, appArg] as const),
		...WINDOWS_CHROMIUM_PATHS.map((path) => [path, appArg] as const),
	];
};

/**
 * The candidate commands for opening a URL, in the order they are tried.
 * They are meant to be spawned from the head down, dropping to the next on failure
 * (no such executable, or an abnormal exit).
 *
 * @param url The URL to open
 * @param platform The value of `process.platform`. Anything but win32 / darwin is
 *   treated as Linux
 * @param mode With `app`, a window with no frame is preferred and, once those run
 *   out, it drops to a tab. `tab` is the default browser only
 * @param browserCommand The executable to name in app mode. When omitted, the known
 *   Chromiums are looked for
 * @returns Never empty. The tail always holds the candidates that open a tab
 */
export const calcBrowserOpenCommands = (
	url: string,
	platform: NodeJS.Platform,
	mode: BrowserOpenMode,
	browserCommand?: string,
): readonly BrowserOpenCommand[] => {
	const tabCommands = calcTabOpenCommands(url, platform);
	if (mode === "tab") {
		return tabCommands;
	}
	return [
		...calcAppOpenCommands(url, platform, browserCommand),
		...tabCommands,
	];
};

/**
 * Reads the environment variable `JISCRIBE_MCP_BROWSER` as a way of opening.
 * Empty means app (the default), `tab` / `default` mean a tab, and anything else is
 * the name of the executable to use in app mode.
 *
 * @param value The environment variable's value, or undefined when it is not set
 * @returns The mode, and the executable named (undefined when there is none)
 */
export const calcBrowserOpenPreference = (
	value: string | undefined,
): { mode: BrowserOpenMode; browserCommand?: string } => {
	const trimmed = (value ?? "").trim();
	if (trimmed === "" || trimmed === "app") {
		return { mode: "app" };
	}
	if (trimmed === "tab" || trimmed === "default") {
		return { mode: "tab" };
	}
	return { mode: "app", browserCommand: trimmed };
};

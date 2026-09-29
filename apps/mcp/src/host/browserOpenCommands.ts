import type { HeadlessProfilePaths } from "./headlessProfile";

/** One command to hand to spawn. The head is the executable, the rest its arguments */
export type BrowserOpenCommand = readonly [string, ...string[]];

/**
 * How the viewer is opened.
 * - `app`: through a Chromium-family `--app=`, in a window with no tabs and no
 *   address bar
 * - `tab`: in a tab of the default browser
 * - `headless`: a Chromium with no window at all, for the AI to look through. The
 *   executable is named directly, because a shell helper that hands the URL to
 *   whatever browser is registered loses the process along with the chance to
 *   ask for headless
 */
export type BrowserOpenMode = "app" | "tab" | "headless";

/**
 * The Chromium installations on Windows, in the order they are tried: Chrome
 * first, then Edge, which is always there. On Windows itself only headless names
 * them, the other modes going through `start`, which finds the browser under App
 * Paths; from WSL they are named in every mode, through toWslPath
 */
const WINDOWS_CHROMIUM_PATHS = [
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
] as const;

/**
 * Rewrites a Windows path as the one WSL reaches the same file through.
 *
 * @param windowsPath An absolute path on a drive, written as Windows writes it
 *   (`C:\\Program Files\\...`). That is all this handles: the drive letter is
 *   taken to be the first character, and nothing is escaped or normalised
 * @returns The path under `/mnt/`, with the drive letter lowercased and every
 *   backslash turned into a slash
 */
export const toWslPath = (windowsPath: string): string =>
	`/mnt/${windowsPath[0].toLowerCase()}${windowsPath.slice(2).replaceAll("\\", "/")}`;

/** The same installations as WSL reaches them, in the same order */
const WSL_CHROMIUM_PATHS = WINDOWS_CHROMIUM_PATHS.map(toWslPath);

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
 * The binaries inside those same bundles. Only headless uses them, since `open`
 * returns as soon as it has handed the launch over
 */
const MACOS_CHROMIUM_BINARIES = [
	"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
	"/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
] as const;

/**
 * The arguments that put Chromium in a window-less mode that keeps drawing. The
 * three throttling switches matter because the page is the AI's eye: a renderer
 * treated as hidden stops servicing requestAnimationFrame, and a capture would
 * then wait on a frame that never comes
 */
const HEADLESS_CHROMIUM_ARGS = [
	"--headless=new",
	"--disable-gpu",
	"--disable-background-timer-throttling",
	"--disable-renderer-backgrounding",
	"--disable-backgrounding-occluded-windows",
] as const;

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
		...WSL_CHROMIUM_PATHS.map((path) => [path, appArg] as const),
	];
};

/**
 * The switch putting one candidate on a profile of its own.
 *
 * @param executable The candidate's executable, as it is spawned
 * @param platform The value of `process.platform`
 * @param profilePaths Where the profile goes, in both of the forms it can need
 * @returns The one argument, or null when this candidate has no profile to run
 *   on and has to be left out of the launch. A Windows-side browser reached from
 *   WSL is the only case that needs the Windows form of the path — it is
 *   recognised by being a .exe named on a platform that is not Windows — and the
 *   only one that can come back without a path to use
 */
const calcHeadlessProfileArg = (
	executable: string,
	platform: NodeJS.Platform,
	profilePaths: HeadlessProfilePaths,
): string | null => {
	const isWindowsSideExecutable =
		platform !== "win32" && executable.toLowerCase().endsWith(".exe");
	if (!isWindowsSideExecutable) {
		return `--user-data-dir=${profilePaths.nativePath}`;
	}
	if (!profilePaths.windows.ok) {
		return null;
	}
	return `--user-data-dir=${profilePaths.windows.path}`;
};

/**
 * The candidate commands for opening a window-less Chromium, in the order they are
 * tried. Every candidate is an executable named by path or by a name on PATH, so
 * the spawned process is the browser itself and stays the one this process holds.
 *
 * @param url The URL to open. It goes in as the command's last argument
 * @param platform The value of `process.platform`. Anything but win32 / darwin is
 *   treated as Linux
 * @param browserCommand The executable to name. When omitted, the known Chromiums
 *   are tried in order
 * @param profilePaths Where the launched browser keeps its profile, which is never
 *   the user's own: the browser they have open holds a lock over that one
 * @returns The commands in the order they are tried, or empty when the platform
 *   has no known Chromium installation to name and when the only ones it has need
 *   a profile path that could not be worked out. Nothing here checks that a
 *   candidate exists, so a non-empty list can still fail its way to the end
 */
const calcHeadlessOpenCommands = (
	url: string,
	platform: NodeJS.Platform,
	browserCommand: string | undefined,
	profilePaths: HeadlessProfilePaths,
): readonly BrowserOpenCommand[] => {
	// A candidate with nowhere to keep a profile is left out rather than run on the
	// user's own, so the list can come back shorter than the installations tried
	const toCommands = (executable: string): readonly BrowserOpenCommand[] => {
		const profileArg = calcHeadlessProfileArg(
			executable,
			platform,
			profilePaths,
		);
		if (profileArg === null) {
			return [];
		}
		return [[executable, ...HEADLESS_CHROMIUM_ARGS, profileArg, url]];
	};
	if (browserCommand !== undefined) {
		return toCommands(browserCommand);
	}
	if (platform === "win32") {
		return WINDOWS_CHROMIUM_PATHS.flatMap(toCommands);
	}
	if (platform === "darwin") {
		return MACOS_CHROMIUM_BINARIES.flatMap(toCommands);
	}
	// As in app mode, the Windows-side .exe paths are there for WSL and merely fail
	// with ENOENT on plain Linux
	return [
		...LINUX_CHROMIUM_COMMANDS.flatMap(toCommands),
		...WSL_CHROMIUM_PATHS.flatMap(toCommands),
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
 *   out, it drops to a tab. `tab` is the default browser only. `headless` names a
 *   Chromium and never drops to a tab, since the default browser has no such mode
 * @param browserCommand The executable to name in app and headless mode. When
 *   omitted, the known Chromiums are looked for
 * @param headlessProfilePaths Where a headless browser keeps its profile. Only
 *   headless mode takes one, and it is required there: leaving a headless launch on
 *   the user's own profile is what this is here to prevent, so its absence throws
 *   rather than quietly going back to that
 * @returns The commands in the order they are tried. In app and tab mode the tail
 *   always holds the candidates that open a tab, so something is always there to
 *   try; headless has no such tail and can come back empty, and even a non-empty
 *   list is only the installations the platform is known to have
 */
export const calcBrowserOpenCommands = (
	url: string,
	platform: NodeJS.Platform,
	mode: BrowserOpenMode,
	browserCommand?: string,
	headlessProfilePaths?: HeadlessProfilePaths,
): readonly BrowserOpenCommand[] => {
	if (mode === "headless") {
		if (headlessProfilePaths === undefined) {
			throw new Error(
				"a headless launch has to be given a profile directory of its own (see headlessProfile)",
			);
		}
		return calcHeadlessOpenCommands(
			url,
			platform,
			browserCommand,
			headlessProfilePaths,
		);
	}
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
 * How many candidates of an app-mode launch open a window with no frame, which is
 * the point in the list where it drops to a plain tab.
 *
 * @param url The URL to open. It changes what the candidates carry, not how many
 *   of them there are
 * @param platform The value of `process.platform`. Anything but win32 / darwin is
 *   treated as Linux
 * @param browserCommand The executable named for app mode, which leaves exactly
 *   one candidate. When omitted, the known Chromiums are counted
 * @returns The number of leading candidates in `calcBrowserOpenCommands(url,
 *   platform, "app", browserCommand)` that are not the tab fallback
 */
export const calcAppOpenCommandCount = (
	url: string,
	platform: NodeJS.Platform,
	browserCommand?: string,
): number => calcAppOpenCommands(url, platform, browserCommand).length;

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

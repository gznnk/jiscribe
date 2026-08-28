/** spawn に渡す 1 コマンド。先頭が実行ファイル、以降が引数 */
export type BrowserOpenCommand = readonly [string, ...string[]];

/**
 * ビューアの開き方。
 * - `app`: Chromium 系の `--app=` で、タブもアドレスバーも無い窓に開く
 * - `tab`: 既定ブラウザのタブに開く
 */
export type BrowserOpenMode = "app" | "tab";

/** WSL から叩ける Windows 側の Chromium。Chrome を先に、無ければ必ずある Edge */
const WINDOWS_CHROMIUM_PATHS = [
	"/mnt/c/Program Files/Google/Chrome/Application/chrome.exe",
	"/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe",
	"/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
	"/mnt/c/Program Files/Microsoft/Edge/Application/msedge.exe",
] as const;

/** Linux（WSL 含む）で試す Chromium の実行ファイル名 */
const LINUX_CHROMIUM_COMMANDS = [
	"google-chrome",
	"google-chrome-stable",
	"chromium",
	"chromium-browser",
	"microsoft-edge",
] as const;

/** macOS の `open -na <app>`。--args 以降がブラウザ本体へ渡る */
const MACOS_CHROMIUM_APPS = ["Google Chrome", "Microsoft Edge"] as const;

/**
 * 既定ブラウザのタブで URL を開くコマンドの候補を、試す順に返す。
 *
 * @param url 開く URL。コマンドの最後の引数として渡る
 * @param platform `process.platform` の値。win32 / darwin 以外は Linux 扱い
 * @returns 空にはならない。試す順に並んだコマンドの配列
 */
const calcTabOpenCommands = (
	url: string,
	platform: NodeJS.Platform,
): readonly BrowserOpenCommand[] => {
	if (platform === "win32") {
		// start は cmd の組み込み。第一引数はウィンドウタイトル扱いなので空を渡す
		return [["cmd", "/c", "start", "", url]];
	}
	if (platform === "darwin") {
		return [["open", url]];
	}
	// WSL には xdg-open が入っていないことが多い。wslu の wslview を挟み、
	// 最後は Windows 側の PowerShell（WSL なら追加インストール無しで通る）
	return [
		["xdg-open", url],
		["wslview", url],
		["powershell.exe", "-NoProfile", "-Command", "Start-Process", url],
	];
};

/**
 * `--app=` で開くコマンドの候補を、試す順に返す。既定ブラウザが何かは問わず、
 * 見つかった Chromium を名指しで起動する（アプリモードは Chromium 系にしか無い）。
 *
 * @param url 開く URL
 * @param platform `process.platform` の値。win32 / darwin 以外は Linux 扱い
 * @param browserCommand 名指しする実行ファイル。省略時は既知の Chromium を順に試す
 * @returns 試す順に並んだコマンドの配列。候補が 1 つも無ければ空
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
		// chrome / msedge は PATH ではなく App Paths に載っているので、
		// CreateProcess で直に叩けない。ShellExecute を通す start に任せる
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
	// WSL からは Windows 側の .exe をパスで直に起動できる。実在しなければ
	// ENOENT で次の候補へ落ちるので、素の Linux でも候補に混ぜたままでよい
	return [
		...LINUX_CHROMIUM_COMMANDS.map((command) => [command, appArg] as const),
		...WINDOWS_CHROMIUM_PATHS.map((path) => [path, appArg] as const),
	];
};

/**
 * URL を開くコマンドの候補を、試す順に返す。
 * 先頭から順に spawn し、失敗（実行ファイルが無い・異常終了）なら次へ落ちる想定。
 *
 * @param url 開く URL
 * @param platform `process.platform` の値。win32 / darwin 以外は Linux 扱い
 * @param mode `app` なら枠の無い窓を優先し、尽きたらタブへ落ちる。`tab` は既定ブラウザのみ
 * @param browserCommand app モードで名指しする実行ファイル。省略時は既知の Chromium を探す
 * @returns 空にはならない。末尾には必ずタブで開く候補が並ぶ
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
 * 環境変数 `JISCRIBE_MCP_BROWSER` を開き方へ読み替える。
 * 空なら app（既定）、`tab` / `default` でタブ、それ以外は app モードで使う実行ファイル名。
 *
 * @param value 環境変数の値。未設定なら undefined
 * @returns mode と、名指しされた実行ファイル（無ければ undefined）
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

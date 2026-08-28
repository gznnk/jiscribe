import { spawn } from "node:child_process";

import {
	calcBrowserOpenCommands,
	calcBrowserOpenPreference,
} from "./browserOpenCommands";
import type {
	BrowserOpenCommand,
	BrowserOpenMode,
} from "./browserOpenCommands";

/**
 * 候補を順に試す。実行ファイルが無い（ENOENT）か異常終了したら次へ落ち、
 * 尽きたら警告して諦める。
 *
 * 終了コードまで見るのは、アプリモードの候補が「起動はできるが対象が無い」形で
 * 失敗しうるため（macOS の `open -na`、Windows の `start`）。開けたブラウザは
 * 窓を閉じるまで終了しないか、既存プロセスへ引き継いで 0 で抜ける。
 */
const spawnFirstAvailable = (
	commands: readonly BrowserOpenCommand[],
	index: number,
	onAdvance: (nextIndex: number) => void,
): void => {
	const [command, ...args] = commands[index];
	let isSettled = false;
	const fallBack = (reason: string): void => {
		if (isSettled) {
			return;
		}
		isSettled = true;
		if (index + 1 < commands.length) {
			onAdvance(index + 1);
			spawnFirstAvailable(commands, index + 1, onAdvance);
			return;
		}
		console.error(`Failed to open browser: ${reason}`);
	};
	try {
		const child = spawn(command, args, { stdio: "ignore" });
		child.on("error", (error) => {
			fallBack(String(error));
		});
		child.on("exit", (code) => {
			// code が null なのはシグナルで落ちたときと、そもそも起動できなかったとき。
			// 後者は error が別に来るので、ここでは何も決めない
			if (code === 0) {
				isSettled = true;
				return;
			}
			if (code !== null) {
				fallBack(`${command} exited with ${code}`);
			}
		});
		child.unref();
	} catch (error) {
		fallBack(String(error));
	}
};

/**
 * ブラウザで URL を開く。起動失敗はログに留め、決して throw しない
 * （ブラウザが開けなくてもツールは URL を返せるため）。
 *
 * stdio の MCP サーバーでは stdout が JSON-RPC の経路なので、ログは stderr へ出す。
 *
 * @param url 開く URL
 * @param mode `app` なら Chromium の枠無し窓を優先し、見つからなければ既定ブラウザの
 *   タブへ落ちる。省略時は環境変数 `JISCRIBE_MCP_BROWSER` に従う（既定は app）
 * @param browserCommand app モードで名指しする実行ファイル。省略時は既知の Chromium を探す
 */
export function openBrowser(
	url: string,
	mode?: BrowserOpenMode,
	browserCommand?: string,
): void {
	const preference = calcBrowserOpenPreference(
		process.env.JISCRIBE_MCP_BROWSER,
	);
	const commands = calcBrowserOpenCommands(
		url,
		process.platform,
		mode ?? preference.mode,
		browserCommand ?? preference.browserCommand,
	);
	// アプリモードの候補が尽きるとタブへ落ちる。窓の見た目が変わるだけで
	// エラーにはならないので、どこで落ちたかは残しておく
	const appCommandCount =
		commands.length -
		calcBrowserOpenCommands(url, process.platform, "tab").length;
	spawnFirstAvailable(commands, 0, (nextIndex) => {
		if (nextIndex === appCommandCount && appCommandCount > 0) {
			console.error(
				"No Chromium found for app mode; opening in the default browser instead (set JISCRIBE_MCP_BROWSER to name one).",
			);
		}
	});
}

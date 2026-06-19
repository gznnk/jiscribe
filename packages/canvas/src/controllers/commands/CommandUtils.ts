import type { KeyBinding, PlatformKeyBindings } from "./CommandTypes";

// User-Agent Client Hints API の型定義（実験的API）
interface NavigatorUAData {
	readonly platform: string;
	readonly mobile: boolean;
}

interface NavigatorWithUserAgentData extends Navigator {
	readonly userAgentData?: NavigatorUAData;
}

/**
 * 現在のプラットフォームを判定
 * User-Agent Client Hints API（推奨）を優先的に使用し、
 * サポートされていない場合は navigator.userAgent にフォールバック
 */
export const getPlatform = (): "mac" | "win" => {
	// User-Agent Client Hints API（Chromium系ブラウザでサポート）
	const nav = navigator as NavigatorWithUserAgentData;
	if (nav.userAgentData?.platform) {
		return nav.userAgentData.platform.toLowerCase().includes("mac")
			? "mac"
			: "win";
	}

	// フォールバック: navigator.userAgent で判定（Mac / iPhone / iPad を検出）
	return /mac|iphone|ipad|ipod/i.test(navigator.userAgent) ? "mac" : "win";
};

/**
 * プラットフォームに応じたショートカット配列を取得
 * 現在のプラットフォーム用のショートカットが定義されていればそれを返し、
 * なければデフォルトを返す
 */
export const getPlatformShortcuts = (
	bindings: PlatformKeyBindings,
): KeyBinding[] => {
	const platform = getPlatform();
	return bindings[platform] ?? bindings.default;
};

/** event.code → 表示文字列のマッピング */
const CODE_DISPLAY_MAP: Record<string, string> = {
	KeyA: "A",
	KeyB: "B",
	KeyC: "C",
	KeyD: "D",
	KeyE: "E",
	KeyF: "F",
	KeyG: "G",
	KeyH: "H",
	KeyI: "I",
	KeyJ: "J",
	KeyK: "K",
	KeyL: "L",
	KeyM: "M",
	KeyN: "N",
	KeyO: "O",
	KeyP: "P",
	KeyQ: "Q",
	KeyR: "R",
	KeyS: "S",
	KeyT: "T",
	KeyU: "U",
	KeyV: "V",
	KeyW: "W",
	KeyX: "X",
	KeyY: "Y",
	KeyZ: "Z",
	Digit0: "0",
	Digit1: "1",
	Digit2: "2",
	Digit3: "3",
	Digit4: "4",
	Digit5: "5",
	Digit6: "6",
	Digit7: "7",
	Digit8: "8",
	Digit9: "9",
	Minus: "-",
	Equal: "=",
	BracketLeft: "[",
	BracketRight: "]",
	Backslash: "\\",
	Semicolon: ";",
	Quote: "'",
	Comma: ",",
	Period: ".",
	Slash: "/",
	Backquote: "`",
	Delete: "Delete",
	Backspace: "Backspace",
	Enter: "Enter",
	Escape: "Escape",
	Tab: "Tab",
	Space: "Space",
	ArrowLeft: "←",
	ArrowRight: "→",
	ArrowUp: "↑",
	ArrowDown: "↓",
};

/**
 * KeyBinding を人間が読みやすい文字列に変換
 * @example formatShortcut({ code: "KeyA", meta: true }) => "⌘A" (Mac)
 * @example formatShortcut({ code: "KeyA", ctrl: true }) => "Ctrl+A" (Windows)
 */
export const formatShortcut = (binding: KeyBinding): string => {
	const platform = getPlatform();
	const parts: string[] = [];

	if (binding.ctrl) {
		parts.push(platform === "mac" ? "⌃" : "Ctrl");
	}
	if (binding.shift) {
		parts.push(platform === "mac" ? "⇧" : "Shift");
	}
	if (binding.alt) {
		parts.push(platform === "mac" ? "⌥" : "Alt");
	}
	if (binding.meta) {
		parts.push(platform === "mac" ? "⌘" : "Win");
	}

	if (binding.code !== undefined) {
		parts.push(CODE_DISPLAY_MAP[binding.code] ?? binding.code);
	} else if (binding.key !== undefined) {
		parts.push(binding.key);
	}

	return platform === "mac" ? parts.join("") : parts.join("+");
};

/**
 * KeyBinding を構成キーごとのトークン配列に分割
 * ショートカット一覧などで各キーを個別の <kbd> チップとして描画する用途に使う
 * @example formatShortcutTokens({ code: "KeyZ", ctrl: true }) => ["Ctrl", "Z"] (Windows)
 * @example formatShortcutTokens({ code: "KeyZ", meta: true }) => ["⌘", "Z"] (Mac)
 */
export const formatShortcutTokens = (binding: KeyBinding): string[] => {
	const platform = getPlatform();
	const tokens: string[] = [];

	if (binding.ctrl) {
		tokens.push(platform === "mac" ? "⌃" : "Ctrl");
	}
	if (binding.shift) {
		tokens.push(platform === "mac" ? "⇧" : "Shift");
	}
	if (binding.alt) {
		tokens.push(platform === "mac" ? "⌥" : "Alt");
	}
	if (binding.meta) {
		tokens.push(platform === "mac" ? "⌘" : "Win");
	}

	if (binding.code !== undefined) {
		tokens.push(CODE_DISPLAY_MAP[binding.code] ?? binding.code);
	} else if (binding.key !== undefined) {
		tokens.push(binding.key);
	}

	return tokens;
};

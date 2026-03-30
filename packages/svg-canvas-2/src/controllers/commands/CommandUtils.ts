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
 * サポートされていない場合は navigator.platform（非推奨）にフォールバック
 */
export const getPlatform = (): "mac" | "win" => {
	// User-Agent Client Hints API（Chromium系ブラウザでサポート）
	const nav = navigator as NavigatorWithUserAgentData;
	if (nav.userAgentData?.platform) {
		return nav.userAgentData.platform.toLowerCase().includes("mac")
			? "mac"
			: "win";
	}

	// フォールバック: 非推奨だが広くサポートされている
	const platform = navigator.platform.toLowerCase();
	return platform.includes("mac") ? "mac" : "win";
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

/**
 * KeyBinding を人間が読みやすい文字列に変換
 * @example formatShortcut({ key: "a", meta: true }) => "⌘A" (Mac)
 * @example formatShortcut({ key: "a", ctrl: true }) => "Ctrl+A" (Windows)
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

	// キー名を大文字に変換（特殊キーは例外）
	const keyName = ["Delete", "Backspace", "Enter", "Escape", "Tab"].includes(
		binding.key,
	)
		? binding.key
		: binding.key.toUpperCase();

	parts.push(keyName);

	return platform === "mac" ? parts.join("") : parts.join("+");
};

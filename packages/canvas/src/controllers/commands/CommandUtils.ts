import type { Command, KeyBinding, PlatformKeyBindings } from "./CommandTypes";
import type { CanvasMessages } from "../../foundation/i18n/CanvasMessagesTypes";
import { resolveLocalizedLabel } from "../../foundation/i18n/resolveLocaleMessages";

// Type definitions for the User-Agent Client Hints API (experimental API)
interface NavigatorUAData {
	readonly platform: string;
	readonly mobile: boolean;
}

interface NavigatorWithUserAgentData extends Navigator {
	readonly userAgentData?: NavigatorUAData;
}

/**
 * Determines the current platform.
 * Prefers the User-Agent Client Hints API (recommended) and falls back to
 * navigator.userAgent when it is not supported.
 */
export const getPlatform = (): "mac" | "win" => {
	// User-Agent Client Hints API (supported in Chromium-based browsers)
	const nav = navigator as NavigatorWithUserAgentData;
	if (nav.userAgentData?.platform) {
		return nav.userAgentData.platform.toLowerCase().includes("mac")
			? "mac"
			: "win";
	}

	// Fallback: determine via navigator.userAgent (detects Mac / iPhone / iPad)
	return /mac|iphone|ipad|ipod/i.test(navigator.userAgent) ? "mac" : "win";
};

/**
 * Gets the shortcut array for the current platform.
 * Returns the shortcuts defined for the current platform if present, otherwise the default.
 *
 * @param bindings - A command's `shortcuts`; `mac` / `win` replace `default` wholesale on their platform (getPlatform), even when empty
 * @returns The bindings in declared order, the first being the one menus display
 */
export const getPlatformShortcuts = (
	bindings: PlatformKeyBindings,
): KeyBinding[] => {
	const platform = getPlatform();
	return bindings[platform] ?? bindings.default;
};

/**
 * Whether a keystroke is the one a binding names.
 *
 * @param binding - One binding (getPlatformShortcuts); `code` is compared for a layout-independent binding and `key` for a character one
 * @param event - The keydown; Ctrl, Alt and Meta must agree exactly, Shift only for the `code` form (a character already implies it)
 */
export const matchesKeyBinding = (
	binding: KeyBinding,
	event: Pick<
		KeyboardEvent,
		"code" | "key" | "ctrlKey" | "shiftKey" | "altKey" | "metaKey"
	>,
): boolean => {
	const isCodeBased = binding.code !== undefined;
	const keyMatch = isCodeBased
		? binding.code === event.code
		: binding.key === event.key;
	return (
		keyMatch &&
		!!binding.ctrl === event.ctrlKey &&
		!!binding.alt === event.altKey &&
		!!binding.meta === event.metaKey &&
		(isCodeBased ? !!binding.shift === event.shiftKey : true)
	);
};

/** Mapping from event.code to display string */
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
 * Converts a KeyBinding into a human-readable string.
 *
 * @param binding - One binding (getPlatformShortcuts); modifiers come out in the order Ctrl, Shift, Alt, Meta, as symbols joined with nothing on a Mac and as words joined with `+` elsewhere, the key last (`code` mapped for display, else `key`)
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
 * Splits a KeyBinding into an array of tokens, one per constituent key.
 * Used to render each key as a separate <kbd> chip, e.g. in a shortcuts list.
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

/**
 * Display label of a command: the host override (`messages.commandLabels[id]`)
 * first, then the label the command itself carries, resolved for `locale`.
 *
 * @param command - The command to name; `id` keys the host override, `label` is the fallback (a plain string is used as is)
 * @param messages - The active message set (useCanvasMessages), host overrides already applied
 * @param locale - BCP 47 tag a dictionary `label` is resolved against (exact tag, then language subtag, then `en`)
 */
export const resolveCommandLabel = (
	command: Pick<Command, "id" | "label">,
	messages: CanvasMessages,
	locale: string,
): string =>
	messages.commandLabels[command.id] ??
	resolveLocalizedLabel(command.label, locale);

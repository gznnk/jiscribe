import { useMemo } from "react";

import { useCanvasLocale } from "./CanvasLocaleContext";
import { useCanvasMessages } from "./CanvasMessagesContext";
import type { PluginMessages } from "./PluginMessagesTypes";
import type { LocaleMessages } from "./resolveLocaleMessages";
import { resolveLocaleMessages } from "./resolveLocaleMessages";

/**
 * The plugin-side counterpart of `CanvasPlugin.messages`: the plugin's own
 * `strings` for the canvas's locale, with the host's overrides applied.
 *
 * It answers from the merged `CanvasMessages` where the host or the plugin put a
 * value there, and from the dictionary passed in otherwise — so a component
 * rendered outside a `CanvasMessagesContext` (a unit test, a preview) still
 * reads its plugin's own wording instead of nothing.
 *
 * @param pluginId - The id the plugin registers under (`CanvasPlugin.id`). It is
 * the namespace the strings were stored in, so a mismatch silently loses the
 * host's overrides; take both from one constant.
 * @param messagesByLocale - The very dictionary handed to `CanvasPlugin.messages`,
 * which is what types the result and what stands in outside a provider.
 * @returns The `strings` of the resolved locale, key for key; a locale whose
 * entry declares no `strings` yields an empty object rather than throwing.
 */
export const usePluginStrings = <TStrings extends Record<string, string>>(
	pluginId: string,
	messagesByLocale: LocaleMessages<PluginMessages<TStrings>>,
): TStrings => {
	const locale = useCanvasLocale();
	const messages = useCanvasMessages();

	return useMemo(() => {
		const own = resolveLocaleMessages(messagesByLocale, locale).strings;
		const resolved = { ...own } as TStrings;
		for (const key of Object.keys(resolved)) {
			const override = messages.pluginStrings[`${pluginId}.${key}`];
			if (override !== undefined) {
				resolved[key as keyof TStrings] = override as TStrings[keyof TStrings];
			}
		}
		return resolved;
	}, [pluginId, messagesByLocale, locale, messages]);
};

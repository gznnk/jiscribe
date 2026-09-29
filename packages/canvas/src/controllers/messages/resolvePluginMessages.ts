import type { LocaleMessages } from "./resolveLocaleMessages";
import { resolveLocaleMessages } from "./resolveLocaleMessages";
import type { CanvasPlugin } from "../../plugin/CanvasPlugin";

/**
 * What the plugins together contribute for one locale, already in the two slots
 * `resolveCanvasMessages` merges them into. `pluginStrings` is keyed
 * `<plugin id>.<key>`; `commandLabels` by command id, which is global already.
 */
export type ResolvedPluginMessages = {
	commandLabels: Record<string, string>;
	pluginStrings: Record<string, string>;
};

/** The strings of one plugin for one locale, folded into the accumulating pair. */
const collectPluginMessages = (
	plugin: CanvasPlugin,
	locale: string,
	into: ResolvedPluginMessages,
): void => {
	if (!plugin.messages) {
		return;
	}
	const localized = resolveLocaleMessages(plugin.messages, locale);
	const ownCommandIds = new Set((plugin.commands ?? []).map((cmd) => cmd.id));
	for (const [commandId, label] of Object.entries(
		localized.commandLabels ?? {},
	)) {
		if (!ownCommandIds.has(commandId)) {
			throw new Error(
				`resolvePluginMessages: plugin "${plugin.id}" labels command "${commandId}", which it does not contribute; only a host may relabel a command it does not own`,
			);
		}
		into.commandLabels[commandId] = label;
	}
	for (const [key, value] of Object.entries(localized.strings ?? {})) {
		into.pluginStrings[`${plugin.id}.${key}`] = value;
	}
};

/**
 * Folds every plugin's `messages` into one dictionary the canvas can resolve a
 * locale out of, and refuses the two ways plugins could collide silently: two
 * message-contributing plugins under one id (their strings share a namespace),
 * and a plugin labelling a command it does not contribute.
 *
 * The result carries the union of the locales the plugins ship, with each plugin
 * falling back on its own (`resolveLocaleMessages`) for a locale it left out —
 * so one plugin shipping `fr` does not drag the others into French.
 *
 * @param plugins - The canvas's plugins in declaration order; a later one wins a
 * `pluginStrings` key an earlier one already wrote, which only two plugins
 * sharing an id can produce, and that throws first. Omitted or empty yields
 * `undefined`, meaning "nothing to merge".
 * @returns A dictionary keyed by locale tag, or `undefined` when no plugin
 * contributes messages.
 */
export const resolvePluginMessages = (
	plugins?: readonly CanvasPlugin[],
): LocaleMessages<ResolvedPluginMessages> | undefined => {
	const contributors = (plugins ?? []).filter(
		(plugin) => plugin.messages !== undefined,
	);
	if (contributors.length === 0) {
		return undefined;
	}

	const claimedIds = new Set<string>();
	for (const plugin of contributors) {
		if (claimedIds.has(plugin.id)) {
			throw new Error(
				`resolvePluginMessages: two plugins contribute messages under the id "${plugin.id}"; the id is what keeps their strings apart`,
			);
		}
		claimedIds.add(plugin.id);
	}

	const collectLocale = (locale: string): ResolvedPluginMessages => {
		const collected: ResolvedPluginMessages = {
			commandLabels: {},
			pluginStrings: {},
		};
		for (const plugin of contributors) {
			collectPluginMessages(plugin, locale, collected);
		}
		return collected;
	};

	const localeTags = new Set<string>();
	for (const plugin of contributors) {
		for (const tag of Object.keys(plugin.messages ?? {})) {
			localeTags.add(tag);
		}
	}

	const messagesByLocale: LocaleMessages<ResolvedPluginMessages> = {
		en: collectLocale("en"),
	};
	for (const tag of localeTags) {
		if (tag !== "en") {
			messagesByLocale[tag] = collectLocale(tag);
		}
	}
	return messagesByLocale;
};

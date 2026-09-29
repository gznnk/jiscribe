/**
 * The strings one plugin contributes for one locale. A plugin hands the canvas a
 * `LocaleMessages` of this through `CanvasPlugin.messages`, and the canvas folds
 * it into the resolved `CanvasMessages` between the built-in dictionary and the
 * host's own overrides — so a plugin's wording follows the host's locale, and the
 * host can still overrule any of it.
 *
 * Both fields are optional: a plugin that only names its commands leaves
 * `strings` out, and one that draws everything itself leaves `commandLabels` out.
 *
 * @typeParam TStrings - Shape of `strings`, so a plugin keeps its own keys typed
 * (and documented) instead of reaching into a bare record. Defaults to the
 * untyped record, which is what a reader of somebody else's plugin sees.
 */
export type PluginMessages<
	TStrings extends Record<string, string> = Record<string, string>,
> = {
	/**
	 * Labels of the plugin's own commands, keyed by command id — the menu row, the
	 * toolbar tooltip and the shortcut-help entry all read this through
	 * `getCommandLabel`.
	 *
	 * A key naming anything but one of this plugin's `commands` throws at mount:
	 * relabelling a built-in command is the host's to do, not a plugin's.
	 */
	commandLabels?: Record<string, string>;
	/**
	 * Everything the plugin draws itself (its menu titles, its field labels),
	 * keyed by names of the plugin's own choosing. They are stored under
	 * `<plugin id>.<key>` in `CanvasMessages.pluginStrings`, which is both what
	 * keeps two plugins apart and what a host names to override one.
	 *
	 * The plugin reads them back through `usePluginStrings`, which applies the
	 * host's overrides for it.
	 */
	strings?: TStrings;
};

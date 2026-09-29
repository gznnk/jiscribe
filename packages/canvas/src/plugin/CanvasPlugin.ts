import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";

import type { AnyObjectTypeDefinition } from "./ObjectTypeDefinition";
import type { Command } from "../controllers/commands/CommandTypes";
import type { PluginMessages } from "../controllers/messages/PluginMessagesTypes";
import type { LocaleMessages } from "../controllers/messages/resolveLocaleMessages";

/**
 * Declarative bundle of object-type and command contributions a host wires into
 * a `<Canvas>` via `CanvasConfig.plugins`
 * (packages/canvas/docs/12-plugin-architecture.md).
 *
 * Structurally assignable to
 * {@link import("@jiscribe/doc/plugin/CanvasDocPlugin").CanvasDocPlugin}: each
 * `objects` value is an `ObjectTypeDefinition`, which extends `ObjectDocDefinition`,
 * so the same `plugins` array feeds both `<Canvas>` and `createCanvasParser`.
 */
export type CanvasPlugin = {
	/**
	 * Stable identifier of the plugin. Beyond naming it in the errors a collision
	 * raises, it is the namespace `messages.strings` are stored under, so two
	 * plugins wired into one canvas must not share it.
	 */
	id: string;

	/** Object-type contributions. A type already registered (built-in or another plugin) throws at construction time. */
	objects?: Readonly<Partial<Record<ObjectType, AnyObjectTypeDefinition>>>;

	/**
	 * Command contributions, registered after the built-in set in plugin
	 * declaration order. An id already registered (built-in or another plugin)
	 * throws at construction time, so a plugin cannot silently replace a command.
	 *
	 * A binding may be shared with an existing command: the keystroke goes to the
	 * first command whose `canExecute` passes, so the two must not be available at
	 * the same time (see `CommandRegistry.findAllByShortcut`).
	 */
	commands?: readonly Command[];

	/**
	 * The plugin's own wording, per locale ({@link PluginMessages}): labels for
	 * the commands above, and the strings the plugin draws itself. Without it a
	 * contributed command keeps its English `label` under every locale, since the
	 * built-in dictionaries can only name commands they know about.
	 *
	 * The canvas folds these in between the built-in dictionary and the host's
	 * `messages` prop, so the host's word is final and a plugin's is not: a
	 * `commandLabels` key naming a command the plugin does not contribute, and two
	 * message-contributing plugins under one `id`, both throw at mount rather than
	 * quietly winning (`resolvePluginMessages`).
	 *
	 * Read them back with `usePluginStrings`, which applies the host's overrides.
	 */
	messages?: LocaleMessages<PluginMessages>;
};

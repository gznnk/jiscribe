import type { DocumentProperty } from "../../../../reducer/CanvasActions";

/**
 * The `data-action` grammar of the menu targets (`targetKind: "menu"`): what the
 * toolbar, the context menu, the ObjectMenu, the properties sidebar and the
 * stencil category flyouts write into the DOM, and what their gesture handlers
 * read back out of `event.targetAction`.
 *
 * - `command:{commandId}` — run a command (handleCommand)
 * - `toggle:{id}` — open / close the UI the id names (a menu section, a flyout,
 *   a sidebar accordion); UI state only, never the document
 * - `set:{property}:{value}` — write a style property outright
 *   (applyStyleAction); the value may itself contain `:`
 * - `slider:{property}` — a slider bound to a style property, whose value rides
 *   on the event (`inputValue`) rather than in the action
 * - `doc:{property}:{value}` — write one of the document's own settings
 *   (`DocumentProperty`); an empty value means null, i.e. drop the setting
 *
 * Writers build the strings with the functions below rather than spelling the
 * prefixes, and readers take them apart with {@link parseMenuAction}, so the
 * grammar has one home. The e2e selectors deliberately keep the literal strings:
 * they check the DOM contract from the outside.
 */

const COMMAND_PREFIX = "command:";
const TOGGLE_PREFIX = "toggle:";
const SET_PREFIX = "set:";
const SLIDER_PREFIX = "slider:";
const DOCUMENT_PREFIX = "doc:";

/**
 * The action of a button that runs a command.
 *
 * @param commandId - Id of a registered command (`CommandRegistry`); an unregistered id is a no-op at press time
 */
export const commandAction = (commandId: string): string =>
	`${COMMAND_PREFIX}${commandId}`;

/**
 * The action of a button that opens or closes a piece of UI.
 *
 * @param id - What the press toggles: an ObjectMenu section, a stencil category, a sidebar section. Must not contain `:`, which would be read as a separator by nobody today but keeps the action unambiguous
 */
export const toggleAction = (id: string): string => `${TOGGLE_PREFIX}${id}`;

/**
 * The action of a button that writes one style property.
 *
 * @param property - Name read into an intent by styleIntentOf (`fill`, `label.fontWeight`, …); must not contain `:`
 * @param value - The value as the intent or the shape's own declaration is read against; `:` inside it is preserved
 */
export const setAction = (property: string, value: string): string =>
	`${SET_PREFIX}${property}:${value}`;

/**
 * The action of a slider bound to a style property.
 *
 * @param property - Name read into an intent by styleIntentOf; must not contain `:`
 */
export const sliderAction = (property: string): string =>
	`${SLIDER_PREFIX}${property}`;

/**
 * The action of a button that writes one of the document's own settings.
 *
 * @param property - The document setting (`background`, `view.open`, …); its name holds no `:`
 * @param value - The value as text, or null to drop the setting — spelled as an
 *   empty value, so no setting can be written as the empty string through an action.
 *   `:` inside it is preserved. Whether the text is a value the setting takes is
 *   checked when the press lands, not here
 */
export const documentAction = (
	property: DocumentProperty,
	value: string | null,
): string => `${DOCUMENT_PREFIX}${property}:${value ?? ""}`;

/** A menu action taken apart; `kind` says which grammar it followed. */
export type MenuAction =
	| { kind: "command"; commandId: string }
	| { kind: "toggle"; id: string }
	| { kind: "set"; property: string; value: string }
	| { kind: "slider"; property: string }
	| { kind: "doc"; property: string; value: string | null };

/**
 * Reads a menu target's action back into its pieces.
 *
 * @param action - `event.targetAction`; undefined (a press on the target's body) and any string outside the grammar give null
 * @returns The pieces, or null. A `set:` or `doc:` with no second separator is null too: there is no value to write
 */
export const parseMenuAction = (
	action: string | undefined,
): MenuAction | null => {
	if (action === undefined) {
		return null;
	}
	if (action.startsWith(COMMAND_PREFIX)) {
		return { kind: "command", commandId: action.slice(COMMAND_PREFIX.length) };
	}
	if (action.startsWith(TOGGLE_PREFIX)) {
		return { kind: "toggle", id: action.slice(TOGGLE_PREFIX.length) };
	}
	if (action.startsWith(SET_PREFIX)) {
		const rest = action.slice(SET_PREFIX.length);
		const separatorIndex = rest.indexOf(":");
		if (separatorIndex === -1) {
			return null;
		}
		return {
			kind: "set",
			property: rest.slice(0, separatorIndex),
			value: rest.slice(separatorIndex + 1),
		};
	}
	if (action.startsWith(DOCUMENT_PREFIX)) {
		const rest = action.slice(DOCUMENT_PREFIX.length);
		const separatorIndex = rest.indexOf(":");
		if (separatorIndex === -1) {
			return null;
		}
		const value = rest.slice(separatorIndex + 1);
		return {
			kind: "doc",
			property: rest.slice(0, separatorIndex),
			value: value === "" ? null : value,
		};
	}
	if (action.startsWith(SLIDER_PREFIX)) {
		return { kind: "slider", property: action.slice(SLIDER_PREFIX.length) };
	}
	return null;
};

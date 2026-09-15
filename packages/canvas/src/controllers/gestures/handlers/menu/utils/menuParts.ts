/**
 * The `data-part` grammar of the menu targets (`targetKind: "menu"`): what the
 * toolbar, the context menu, the ObjectMenu, the properties sidebar and the
 * stencil category flyouts write into the DOM, and what their gesture handlers
 * read back out of `event.targetPart`.
 *
 * - `command:{commandId}` — run a command (handleCommand)
 * - `toggle:{id}` — open / close the UI the id names (a menu section, a flyout,
 *   a sidebar accordion); UI state only, never the document
 * - `set:{property}:{value}` — write a style property outright
 *   (StylePropertyRegistry); the value may itself contain `:`
 * - `slider:{property}` — a slider bound to a style property, whose value rides
 *   on the event (`inputValue`) rather than in the part
 *
 * Writers build the strings with the functions below rather than spelling the
 * prefixes, and readers take them apart with {@link parseMenuPart}, so the
 * grammar has one home. The e2e selectors deliberately keep the literal strings:
 * they check the DOM contract from the outside.
 */

const COMMAND_PREFIX = "command:";
const TOGGLE_PREFIX = "toggle:";
const SET_PREFIX = "set:";
const SLIDER_PREFIX = "slider:";

/**
 * The part of a button that runs a command.
 *
 * @param commandId - Id of a registered command (`CommandRegistry`); an unregistered id is a no-op at press time
 */
export const commandPart = (commandId: string): string =>
	`${COMMAND_PREFIX}${commandId}`;

/**
 * The part of a button that opens or closes a piece of UI.
 *
 * @param id - What the press toggles: an ObjectMenu section, a stencil category, a sidebar section. Must not contain `:`, which would be read as a separator by nobody today but keeps the part unambiguous
 */
export const togglePart = (id: string): string => `${TOGGLE_PREFIX}${id}`;

/**
 * The part of a button that writes one style property.
 *
 * @param property - Name resolved by StylePropertyRegistry (`fill`, `label.fontWeight`, …); must not contain `:`
 * @param value - The value as the property's handler parses it; `:` inside it is preserved
 */
export const setPart = (property: string, value: string): string =>
	`${SET_PREFIX}${property}:${value}`;

/**
 * The part of a slider bound to a style property.
 *
 * @param property - Name resolved by StylePropertyRegistry; must not contain `:`
 */
export const sliderPart = (property: string): string =>
	`${SLIDER_PREFIX}${property}`;

/** A menu part taken apart; `kind` says which grammar it followed. */
export type MenuPart =
	| { kind: "command"; commandId: string }
	| { kind: "toggle"; id: string }
	| { kind: "set"; property: string; value: string }
	| { kind: "slider"; property: string };

/**
 * Reads a menu target's part back into its pieces.
 *
 * @param part - `event.targetPart`; undefined (a press on the target's body) and any string outside the grammar give null
 * @returns The pieces, or null. A `set:` with no second separator is null too: there is no value to write
 */
export const parseMenuPart = (part: string | undefined): MenuPart | null => {
	if (part === undefined) {
		return null;
	}
	if (part.startsWith(COMMAND_PREFIX)) {
		return { kind: "command", commandId: part.slice(COMMAND_PREFIX.length) };
	}
	if (part.startsWith(TOGGLE_PREFIX)) {
		return { kind: "toggle", id: part.slice(TOGGLE_PREFIX.length) };
	}
	if (part.startsWith(SET_PREFIX)) {
		const rest = part.slice(SET_PREFIX.length);
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
	if (part.startsWith(SLIDER_PREFIX)) {
		return { kind: "slider", property: part.slice(SLIDER_PREFIX.length) };
	}
	return null;
};

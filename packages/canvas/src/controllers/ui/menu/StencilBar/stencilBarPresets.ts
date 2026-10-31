/**
 * The presets the stencil bar pins when the host names none
 * (`stencilBar.presetIds` omitted): core's basic primitives, ordered area →
 * line → text. Core owns nothing else, so anything a plugin supplies shows on
 * the bar only when the host names it.
 *
 * Also the presets of `DEFAULT_TOOLBAR_TOOLS_SECTION`, the top bar's former
 * shape tools, which is built from this list.
 */
export const DEFAULT_STENCIL_BAR_PRESET_IDS: readonly string[] = [
	"rect",
	"ellipse",
	"polygon",
	"polyline",
	"text",
];

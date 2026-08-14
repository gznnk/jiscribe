import type { TextSlot } from "../schemas/objects/types/TextSlot";

/**
 * What a text style field is drawn with when neither the slot nor the object's
 * type declares one (ObjectTextStyleDefaultsRegistry). The last resort of the
 * three surfaces that must agree on a style — display (TextOverlayFrame),
 * editing (TextEditor) and measurement (resolveTextObjectFont) — so it is kept
 * here rather than repeated as a default parameter in each of them.
 *
 * `fontFamily` is deliberately absent: an unset family follows the host theme
 * (`CanvasTheme.fontFamily`), a property of the viewer rather than of the
 * document, so no constant can stand in for it.
 */
export const TEXT_STYLE_FALLBACK = {
	textAlign: "center",
	verticalAlign: "middle",
	fontColor: "#000000",
	fontSize: 16,
	fontWeight: "normal",
	fontStyle: "normal",
	textDecoration: "none",
} as const satisfies Omit<TextSlot, "text" | "fontFamily">;

import type { CanvasDoc } from "@jiscribe/doc";

/**
 * What the page is handed by the HTML written around it. Crosses as JSON on
 * `window`, so the document travels with the file rather than being fetched:
 * the whole point of the output is that it needs nothing beside it.
 */
export type PreviewPayload = {
	/** The document to mount; already parsed and validated on the Node side. */
	doc: CanvasDoc;
};

/** Name the payload is published under on `window`; shared so the two sides cannot drift. */
export const PREVIEW_GLOBAL = "jiscribePreview";

/**
 * One shipped family, in the two forms the preview needs it: the name CSS and
 * `document.fonts` know it by, and the axes Google Fonts is asked for.
 */
type PreviewFace = {
	family: string;
	/** The part of a `css2` `family=` value after the colon. */
	axes: string;
};

/**
 * The seven families behind `CANVAS_FONT_FAMILIES`, at the weights and styles
 * `@jiscribe/canvas/fonts.css` imports.
 *
 * The preview does not use that stylesheet: it names some 850 subset files (50MB
 * against a 2MB page), none of which a single file can carry. Google Fonts serves
 * the same faces, split by unicode-range the same way, from the one stylesheet
 * host a page is allowed to reach — so a box measured against a family here is
 * measured against the face the editor would have used.
 */
const PREVIEW_FACES: readonly PreviewFace[] = [
	{ family: "Source Sans 3", axes: "ital,wght@0,400;0,700;1,400;1,700" },
	{ family: "Source Serif 4", axes: "ital,wght@0,400;0,700;1,400;1,700" },
	{ family: "Source Code Pro", axes: "ital,wght@0,400;0,700;1,400;1,700" },
	{ family: "Noto Sans JP", axes: "wght@400;700" },
	{ family: "Noto Serif JP", axes: "wght@400;700" },
	{ family: "Caveat", axes: "wght@400;700" },
	// Klee One's heaviest drawn weight is 600, which "bold" resolves to.
	{ family: "Klee One", axes: "wght@400;600" },
];

/** The `<link>` href the page loads the shipped families from. */
export const PREVIEW_FONTS_HREF = `https://fonts.googleapis.com/css2?${PREVIEW_FACES.map(
	(face) => `family=${face.family.split(" ").join("+")}:${face.axes}`,
).join("&")}&display=swap`;

/** The family names, for the page to wait on before it measures anything. */
export const PREVIEW_FONT_FAMILIES: readonly string[] = PREVIEW_FACES.map(
	(face) => face.family,
);

import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";

const SVG_NS = "http://www.w3.org/2000/svg";

/** Namespace for jiscribe-specific data embedded in SVG for round-tripping. */
const JISCRIBE_NS = "https://jiscribe.dev/ns/canvas";
const SOURCE_LOCAL_NAME = "source";

/**
 * Embeds a CanvasDoc (the `.jis.json` content) into the SVG's `<metadata>`.
 *
 * Like draw.io's editable SVG, the editing source is stored in the same file
 * as the visuals (`<text>`, ...) so it can be restored for re-editing. The
 * JSON lives in an element of a jiscribe-specific namespace, so browsers and
 * GitHub rendering are unaffected.
 */
export const embedCanvasSource = (svg: SVGSVGElement, doc: CanvasDoc): void => {
	const metadata = document.createElementNS(SVG_NS, "metadata");
	const source = document.createElementNS(
		JISCRIBE_NS,
		`jiscribe:${SOURCE_LOCAL_NAME}`,
	);
	source.setAttribute("data-jiscribe-version", String(doc.version ?? 1));
	source.textContent = JSON.stringify(doc);
	metadata.appendChild(source);
	svg.insertBefore(metadata, svg.firstChild);
};

/**
 * Extracts the CanvasDoc embedded by {@link embedCanvasSource} from an SVG.
 * Returns null when missing or unparsable (groundwork for re-editing / import).
 */
export const extractCanvasSource = (svg: SVGSVGElement): CanvasDoc | null => {
	const source = svg.getElementsByTagNameNS(JISCRIBE_NS, SOURCE_LOCAL_NAME)[0];
	const json = source?.textContent;
	if (!json) {
		return null;
	}
	try {
		return JSON.parse(json) as CanvasDoc;
	} catch {
		return null;
	}
};

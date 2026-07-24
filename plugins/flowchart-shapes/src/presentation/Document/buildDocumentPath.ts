import { DOCUMENT_WAVE_RATIO } from "../../schema/document/DocumentDoc";

/**
 * Builds the document path (rect with a wavy bottom edge) for a bounding box
 * whose top-left corner is at (x, y). The right half of the wave dips to the
 * bounding-box bottom and the left half rises symmetrically above the wave
 * centerline. Shared by the object renderer (centered origin) and the
 * draw-drag preview.
 */
export const buildDocumentPath = (
	x: number,
	y: number,
	width: number,
	height: number,
): string => {
	const amplitude = height * DOCUMENT_WAVE_RATIO;
	const waveY = y + height - amplitude;
	return (
		`M ${x} ${y} H ${x + width} V ${waveY} ` +
		`Q ${x + width * 0.75} ${waveY + amplitude * 2} ${x + width * 0.5} ${waveY} ` +
		`Q ${x + width * 0.25} ${waveY - amplitude * 2} ${x} ${waveY} Z`
	);
};

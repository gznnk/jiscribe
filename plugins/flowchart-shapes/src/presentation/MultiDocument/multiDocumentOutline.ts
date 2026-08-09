import type { ObjectOutlineCalculator } from "@jiscribe/canvas";
import { OUTLINE_CURVE_SEGMENTS } from "@jiscribe/canvas-sdk";
import {
	sampleQuadraticBezier,
	type Dimensions,
	type Point,
} from "@jiscribe/geometry";

import { calcMultiDocumentSilhouette } from "./calcMultiDocumentSilhouette";

/**
 * Multi-document outline (centered): the union silhouette of the three stacked
 * sheets, with its wave arcs sampled into points. Connectors attach to the
 * shape's outer edge, so the outline takes the union rather than the individual
 * sheets the renderer draws.
 */
export const multiDocumentOutline: ObjectOutlineCalculator<Dimensions> = ({
	width,
	height,
}) => {
	const { start, segments } = calcMultiDocumentSilhouette(
		-width / 2,
		-height / 2,
		width,
		height,
	);
	const points: Point[] = [start];
	let current = start;
	for (const segment of segments) {
		if (segment.kind === "quad") {
			points.push(
				...sampleQuadraticBezier(
					current,
					segment.control,
					segment.to,
					OUTLINE_CURVE_SEGMENTS,
				).slice(1),
			);
		} else {
			points.push(segment.to);
		}
		current = segment.to;
	}
	return points;
};

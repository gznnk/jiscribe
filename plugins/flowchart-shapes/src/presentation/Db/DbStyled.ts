import styled from "@emotion/styled";
import { ShapeBodyPath } from "@jiscribe/canvas-sdk";

export const DbRootGroup = styled.g`
	cursor: grab;
`;

/**
 * The cap's front edge. Decoration only, so the body silhouette answers hit
 * testing; the override has to be CSS, since ShapeBodyPath's own
 * `pointer-events: auto` beats a presentation attribute.
 */
export const DbCapEdgePath = styled(ShapeBodyPath)`
	pointer-events: none;
`;

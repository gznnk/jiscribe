import type { CanvasDoc } from "../../../model/canvas/CanvasDoc";
import { createDocOps } from "../../createDocOps";

const docOps = createDocOps();

const SHAPE_TYPES = ["rect", "ellipse", "text"] as const;
const GRID_COLUMNS = 50;
const GRID_PITCH = 200;
// The first GROUP_SIZE shapes of every GROUP_STRIDE are grouped, so a tenth of the shapes
// sit in groups, as in a diagram with a few clusters.
const GROUP_SIZE = 5;
const GROUP_STRIDE = 50;

/** The size of a document {@link buildConnectedDoc} builds. */
export type ConnectedDocSize = {
	/** Shapes laid on a grid, cycling rect / ellipse / text, each holding a short text. */
	shapeCount: number;
	/** Connectors between distinct shapes; needs `shapeCount` of 2 or more when positive. */
	connectorCount: number;
};

/**
 * A document built through the doc ops, so it is what the parser accepts as it stands.
 *
 * @param size - How many shapes and connectors; the same size yields the same document
 * @returns The doc plus the shape ids in creation order (connectors and groups excluded)
 */
export const buildConnectedDoc = ({
	shapeCount,
	connectorCount,
}: ConnectedDocSize): { doc: CanvasDoc; shapeIds: string[] } => {
	const doc: CanvasDoc = { version: 1, root: [] };
	const shapeIds = docOps.addObjects(
		doc,
		Array.from({ length: shapeCount }, (_, index) => ({
			type: SHAPE_TYPES[index % SHAPE_TYPES.length],
			x: (index % GRID_COLUMNS) * GRID_PITCH,
			y: Math.floor(index / GRID_COLUMNS) * GRID_PITCH,
			text: `Shape ${index}`,
		})),
	);
	docOps.connectMany(
		doc,
		Array.from({ length: connectorCount }, (_, index) => {
			const sourceIndex = index % shapeCount;
			// The offset runs 1..shapeCount-1, so a connector never joins a shape to itself.
			const targetIndex =
				(sourceIndex + 1 + ((index * 7) % (shapeCount - 1))) % shapeCount;
			return {
				sourceId: shapeIds[sourceIndex],
				targetId: shapeIds[targetIndex],
			};
		}),
	);
	for (let start = 0; start + GROUP_SIZE <= shapeCount; start += GROUP_STRIDE) {
		docOps.groupObjects(doc, shapeIds.slice(start, start + GROUP_SIZE));
	}
	return { doc, shapeIds };
};

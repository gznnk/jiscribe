import type { AiHandleControl } from "../types";

/** The way in the client tests share: every method answers as an idle, empty canvas would, and a test swaps only the return values it needs */
export const createFakeHandleControl = (
	overrides: Partial<AiHandleControl> = {},
): AiHandleControl => ({
	isAvailable: () => true,
	selectObjects: (ids) => ({ selectedIds: ids, ignoredIds: [] }),
	getSelectedIds: () => [],
	centerView: (point, zoom) => ({
		minX: point.x,
		minY: point.y,
		zoom: zoom ?? 1,
	}),
	setView: (camera) => camera,
	getView: () => ({
		viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
		visibleWorldRect: { x: 0, y: 0, width: 800, height: 600 },
	}),
	fitView: () => ({ minX: 0, minY: 0, zoom: 1 }),
	fitViewToRect: () => ({ minX: 0, minY: 0, zoom: 1 }),
	measureText: () => null,
	findOverlaps: () => [],
	measureConnectorPath: () => null,
	measureVisualBounds: () => null,
	hitTest: () => [],
	toSvgString: async () => "<svg></svg>",
	getInteractionStatus: () => ({
		drag: null,
		isInertialScrolling: false,
		editingTextId: null,
		drawingShapeType: null,
		modal: null,
		isBusy: false,
	}),
	toWorld: () => null,
	toClient: () => null,
	...overrides,
});

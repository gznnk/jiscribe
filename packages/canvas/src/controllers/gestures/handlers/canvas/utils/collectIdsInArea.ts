import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import { isConnectorState } from "../../../../../states/objects/connections/connector/ConnectorState";
import { calcObjectBoundingBox } from "../../../../utils/calcObjectBoundingBox";

/**
 * Collects the IDs of objects fully contained within the area-selection rectangle.
 * Traverses all objects (including group children).
 */
export function collectIdsInArea(
	objects: Record<string, ObjectState>,
	areaMinX: number,
	areaMinY: number,
	areaMaxX: number,
	areaMaxY: number,
): string[] {
	const result: string[] = [];

	for (const obj of Object.values(objects)) {
		if (!obj) {
			continue;
		}

		// Connectors follow the shapes they attach to; marquee selects shapes only.
		if (isConnectorState(obj)) {
			continue;
		}

		const bbox = calcObjectBoundingBox(obj, objects);

		// null check (e.g. empty Poly)
		if (!bbox) {
			continue;
		}

		// Check whether it is fully contained
		if (
			bbox.left >= areaMinX &&
			bbox.right <= areaMaxX &&
			bbox.top >= areaMinY &&
			bbox.bottom <= areaMaxY
		) {
			result.push(obj.id);
		}
	}

	return result;
}

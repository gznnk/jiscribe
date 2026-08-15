import { bench, describe } from "vitest";

import {
	copyObjectsRecord,
	createCowObjects,
	materializeObjects,
} from "../cowObjects";

type Item = { id: string; cx: number; cy: number };

const OBJECT_COUNT = 5000;
const CHANGED_COUNT = 3;

const buildObjects = (): Record<string, Item> => {
	const objects: Record<string, Item> = {};
	for (let index = 0; index < OBJECT_COUNT; index++) {
		objects[`obj-${index}`] = { id: `obj-${index}`, cx: index, cy: index };
	}
	return objects;
};

const baseObjects = buildObjects();
const changedIds = Array.from(
	{ length: CHANGED_COUNT },
	(_, index) => `obj-${index * 100}`,
);

// Simulates one drag frame: clone the map and write the moved objects.
describe(`clone + ${CHANGED_COUNT} writes (${OBJECT_COUNT} objects)`, () => {
	bench("full spread (before #213)", () => {
		const objects = { ...baseObjects };
		for (const id of changedIds) {
			objects[id] = { ...baseObjects[id], cx: baseObjects[id].cx + 1 };
		}
	});

	bench("createCowObjects (after #213)", () => {
		const objects = createCowObjects(baseObjects);
		for (const id of changedIds) {
			objects[id] = { ...baseObjects[id], cx: baseObjects[id].cx + 1 };
		}
	});
});

// Simulates the frame including the render pass that reads every object once
// (ObjectsRenderer traverses all ids). This is where Proxy read overhead shows,
// so the comparison must include it.
describe(`clone + writes + full read pass (${OBJECT_COUNT} objects)`, () => {
	const allIds = Object.keys(baseObjects);

	bench("full spread + plain reads (before #213)", () => {
		const objects = { ...baseObjects };
		for (const id of changedIds) {
			objects[id] = { ...baseObjects[id], cx: baseObjects[id].cx + 1 };
		}
		let sum = 0;
		for (const id of allIds) {
			sum += objects[id].cx;
		}
		if (sum < 0) {
			throw new Error("unreachable");
		}
	});

	bench("createCowObjects + proxied reads (after #213)", () => {
		const objects = createCowObjects(baseObjects);
		for (const id of changedIds) {
			objects[id] = { ...baseObjects[id], cx: baseObjects[id].cx + 1 };
		}
		let sum = 0;
		for (const id of allIds) {
			sum += objects[id].cx;
		}
		if (sum < 0) {
			throw new Error("unreachable");
		}
	});
});

// One-time cost paid at gesture end (was previously paid on every frame).
describe(`materialize once per gesture (${OBJECT_COUNT} objects)`, () => {
	const cowView = (() => {
		const objects = createCowObjects(baseObjects);
		for (const id of changedIds) {
			objects[id] = { ...baseObjects[id], cx: baseObjects[id].cx + 1 };
		}
		return objects;
	})();

	bench("materializeObjects", () => {
		materializeObjects(cowView);
	});
});

// A path that needs a fresh writable Record (updateAffectedGroupBounds and the
// re-measure pass both do) can be handed a view. Spreading one pays a Proxy trap
// per key for the identical result.
describe(`copy a view into a writable record (${OBJECT_COUNT} objects)`, () => {
	const cowView = (() => {
		const objects = createCowObjects(baseObjects);
		for (const id of changedIds) {
			objects[id] = { ...baseObjects[id], cx: baseObjects[id].cx + 1 };
		}
		return objects;
	})();

	bench("spread", () => {
		const copied = { ...cowView };
		copied[changedIds[0]] = baseObjects[changedIds[0]];
	});

	bench("copyObjectsRecord", () => {
		const copied = copyObjectsRecord(cowView);
		copied[changedIds[0]] = baseObjects[changedIds[0]];
	});
});

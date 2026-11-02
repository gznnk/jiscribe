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

const writeChangedObjects = (objects: Record<string, Item>): void => {
	for (const id of changedIds) {
		objects[id] = { ...baseObjects[id], cx: baseObjects[id].cx + 1 };
	}
};

const buildCowView = (): Record<string, Item> => {
	const objects = createCowObjects(baseObjects);
	writeChangedObjects(objects);
	return objects;
};

describe("createCowObjects: one drag frame", () => {
	const allIds = Object.keys(baseObjects);

	bench(`${OBJECT_COUNT} objects, ${CHANGED_COUNT} writes`, () => {
		writeChangedObjects(createCowObjects(baseObjects));
	});

	// ObjectsRenderer reads every object once per frame, which is where the
	// Proxy's read overhead shows.
	bench(
		`${OBJECT_COUNT} objects, ${CHANGED_COUNT} writes + read every object`,
		() => {
			const objects = createCowObjects(baseObjects);
			writeChangedObjects(objects);
			let sum = 0;
			for (const id of allIds) {
				sum += objects[id].cx;
			}
			if (sum < 0) {
				throw new Error("unreachable");
			}
		},
	);
});

// Paid once at gesture end.
describe("materializeObjects: end of a gesture", () => {
	const cowView = buildCowView();

	bench(`${OBJECT_COUNT} objects, ${CHANGED_COUNT} written`, () => {
		materializeObjects(cowView);
	});
});

// A path that needs a fresh writable Record (the re-measure pass does) can be
// handed a view.
describe("copyObjectsRecord: a view into a writable record", () => {
	const cowView = buildCowView();

	bench(`${OBJECT_COUNT} objects, ${CHANGED_COUNT} written`, () => {
		const copied = copyObjectsRecord(cowView);
		copied[changedIds[0]] = baseObjects[changedIds[0]];
	});
});

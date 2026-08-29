/**
 * Measures what one history entry actually costs in memory, for the three ways
 * the history layer can hold its snapshots:
 *
 * - `lazy`      — the entry stays an unresolved DocSnapshot (references into the
 *                 committed state; unchanged ObjectStates are shared).
 * - `resolved`  — the entry's Doc is materialized, which is what really happens
 *                 today: useNotifySaveRequest resolves `history.present` on every
 *                 commit when the host passes `onCommit`, and resolveDocSnapshot
 *                 then drops `source`.
 * - `memoized`  — same, but `canvasToDoc` reuses the ObjectDoc it already built
 *                 for an unchanged ObjectState (the proposed fix).
 *
 * Run with:
 *   node --expose-gc --import tsx src/controllers/utils/__benchmarks__/historyMemory.ts
 */

import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import type { ObjectDoc } from "@jiscribe/doc/model/objects/base/ObjectDoc";
import type { GroupDoc } from "@jiscribe/doc/model/objects/primitives/group/GroupDoc";
import { RECT_DOC_DEFAULTS } from "@jiscribe/doc/model/objects/primitives/rect/RectDoc";
import {
	createEstimateTextMeasurement,
	offerTextMeasurement,
} from "@jiscribe/doc/unstable";

import { canvasToState } from "../../../states/canvas/CanvasMapper";
import type { CanvasState } from "../../../states/canvas/CanvasState";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import type { ObjectMapperRegistry } from "../../../states/registry/ObjectMapperRegistry";
import type { DocSnapshot, DocSnapshotSource } from "../../CanvasTypes";
import type { ObjectBehaviorRegistry } from "../../gestures/registry/ObjectBehaviorRegistry";
import type { CanvasRegistries } from "../../registries/CanvasRegistries";
import { createCanvasRegistries } from "../../registries/createCanvasRegistries";
import { materializeObjects } from "../cowObjects";
import { moveSelection } from "../moveSelection";
import {
	createDocSnapshotFromState,
	resolveDocSnapshot,
} from "../resolveDocSnapshot";

offerTextMeasurement(createEstimateTextMeasurement());

/** Entry count `recordHistoryIfNeeded` caps `past` at. */
const HISTORY_DEPTH = 50;

/** Object counts to report, from a small diagram to a large one. */
const OBJECT_COUNTS = [200, 1000, 5000];

/** Share of the objects joined by a connector, matching a real diagram's mix. */
const CONNECTOR_RATIO = 0.25;

const gc = (): void => {
	const collect = (globalThis as { gc?: () => void }).gc;
	if (!collect) {
		throw new Error("run with --expose-gc");
	}
	// Twice: the first pass can leave objects that only became unreachable
	// through it, and the second collects those.
	collect();
	collect();
};

const heapUsed = (): number => process.memoryUsage().heapUsed;

/**
 * A document of `count` objects: rects carrying text, a quarter of them joined
 * by connectors, laid out on a grid.
 */
const buildDoc = (count: number): CanvasDoc => {
	const root: unknown[] = [];
	const columns = Math.ceil(Math.sqrt(count));

	for (let index = 0; index < count; index++) {
		root.push({
			...RECT_DOC_DEFAULTS,
			id: `rect-${index}`,
			x: (index % columns) * 200,
			y: Math.floor(index / columns) * 150,
			text: `Step ${index}`,
		});
	}

	const connectorCount = Math.floor(count * CONNECTOR_RATIO);
	for (let index = 0; index < connectorCount; index++) {
		root.push({
			id: `conn-${index}`,
			type: "connector",
			points: [],
			source: { owner: { id: `rect-${index}` }, anchor: { kind: "center" } },
			target: {
				owner: { id: `rect-${index + 1}` },
				anchor: { kind: "center" },
			},
		});
	}

	return { version: 1, root } as unknown as CanvasDoc;
};

/**
 * One commit's worth of change: one object nudged through the real move path,
 * materialized back to a plain record the way handleGesture does at the end of
 * a gesture. That is exactly what a committed state hands to the history layer.
 */
const commitOneMove = (
	state: DocSnapshotSource,
	index: number,
	objectBehavior: ObjectBehaviorRegistry,
): DocSnapshotSource => {
	const { objects } = moveSelection({
		selectedIds: [`rect-${index % state.rootIds.length}`],
		srcObjects: state.objects,
		srcMultiSelectGroup: null,
		delta: { x: 1, y: 0 },
		objectBehavior,
	});
	return { ...state, objects: materializeObjects(objects) };
};

/**
 * `canvasToDoc` with the ObjectDoc it built for an ObjectState remembered, so a
 * later conversion of a state that shares that object reuses the node instead of
 * building an equal one.
 *
 * Groups cannot be keyed on their own state alone: a child moving leaves the
 * parent's GroupState untouched, so the entry is reused only when every child
 * doc came back identical too.
 */
const createMemoizedCanvasToDoc = (): ((
	state: DocSnapshotSource,
	mapper: ObjectMapperRegistry,
) => CanvasDoc) => {
	const leafDocs = new WeakMap<ObjectState, ObjectDoc>();
	const groupDocs = new WeakMap<
		ObjectState,
		{ doc: GroupDoc; children: ObjectDoc[] }
	>();

	return (state, mapper) => {
		const reconstruct = (id: string): ObjectDoc => {
			const objState = state.objects[id];

			if (objState.type === "group") {
				const children = (objState as GroupState).childIds.map(reconstruct);
				const memoized = groupDocs.get(objState);
				if (
					memoized &&
					memoized.children.length === children.length &&
					memoized.children.every((child, at) => child === children[at])
				) {
					return memoized.doc;
				}
				const groupDoc = mapper.toDoc(objState) as GroupDoc;
				groupDoc.children = children;
				groupDocs.set(objState, { doc: groupDoc, children });
				return groupDoc;
			}

			const memoized = leafDocs.get(objState);
			if (memoized) {
				return memoized;
			}
			const objDoc = mapper.toDoc(objState);
			leafDocs.set(objState, objDoc);
			return objDoc;
		};

		return {
			version: 1,
			...(state.background !== undefined
				? { background: state.background }
				: {}),
			...(state.view !== undefined ? { view: state.view } : {}),
			root: state.rootIds.map(reconstruct),
		} as CanvasDoc;
	};
};

type Mode = "lazy" | "resolved" | "memoized";

/**
 * Builds `HISTORY_DEPTH` entries the way `recordHistoryIfNeeded` does, one
 * single-object move per commit, and returns everything the canvas would still
 * be holding afterwards.
 */
const buildHistory = (
	initial: CanvasState,
	mode: Mode,
	registries: CanvasRegistries,
): { past: DocSnapshot[]; present: DocSnapshot; live: DocSnapshotSource } => {
	const mapper = registries.objectMapper;
	const memoizedCanvasToDoc =
		mode === "memoized" ? createMemoizedCanvasToDoc() : null;

	let live: DocSnapshotSource = {
		objects: initial.objects,
		rootIds: initial.rootIds,
		background: initial.background,
		view: initial.view,
	};
	let present = createDocSnapshotFromState(live);
	const past: DocSnapshot[] = [];

	for (let commit = 0; commit < HISTORY_DEPTH; commit++) {
		past.push(present);
		live = commitOneMove(live, commit, registries.objectBehavior);
		present = createDocSnapshotFromState(live);

		// What useNotifySaveRequest does on every commit when the host saves.
		if (mode === "resolved") {
			resolveDocSnapshot(present, mapper);
		}
		if (mode === "memoized" && memoizedCanvasToDoc) {
			present.doc = memoizedCanvasToDoc(
				present.source as DocSnapshotSource,
				mapper,
			);
			present.source = null;
		}
	}

	return { past: past.slice(-HISTORY_DEPTH), present, live };
};

const measure = (
	initial: CanvasState,
	mode: Mode,
	registries: CanvasRegistries,
): number => {
	gc();
	const before = heapUsed();
	const held = buildHistory(initial, mode, registries);
	gc();
	const after = heapUsed();
	// Keep the history reachable across the measurement.
	if (held.past.length !== HISTORY_DEPTH) {
		throw new Error("history depth mismatch");
	}
	return after - before;
};

const formatMb = (bytes: number): string =>
	`${(bytes / 1024 / 1024).toFixed(1)} MB`;

const formatKb = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KB`;

const main = (): void => {
	const registries = createCanvasRegistries();
	const { objectMapper, objectContentResizer } = registries;

	console.log(`history depth ${HISTORY_DEPTH}, one object moved per commit\n`);
	console.log("objects | mode     | history heap | per entry | doc build");
	console.log("--------|----------|--------------|-----------|----------");

	for (const count of OBJECT_COUNTS) {
		const doc = buildDoc(count);
		const initial = canvasToState(doc, objectMapper, objectContentResizer);

		for (const mode of ["lazy", "resolved", "memoized"] as const) {
			const bytes = measure(initial, mode, registries);

			// Wall clock of the conversions the mode performs, measured separately
			// so the heap figure is not inflated by timing instrumentation.
			const started = performance.now();
			buildHistory(initial, mode, registries);
			const elapsed = performance.now() - started;

			console.log(
				`${String(count).padStart(7)} | ${mode.padEnd(8)} | ${formatMb(
					bytes,
				).padStart(12)} | ${formatKb(bytes / HISTORY_DEPTH).padStart(
					9,
				)} | ${`${elapsed.toFixed(0)} ms`.padStart(9)}`,
			);
		}
	}
};

main();

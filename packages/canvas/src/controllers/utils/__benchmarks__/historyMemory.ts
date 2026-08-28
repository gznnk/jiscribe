/**
 * Measures what one history entry actually costs in memory, for the three ways
 * the history layer can end up holding its snapshots:
 *
 * - `lazy`      — the entry stays an unresolved DocSnapshot (references into the
 *                 committed state; unchanged ObjectStates are shared).
 * - `resolved`  — the entry's Doc is materialized, which is what really happens
 *                 whenever the host passes `onCommit`: useNotifySaveRequest
 *                 resolves `history.present` on every commit, and
 *                 resolveDocSnapshot then drops `source`.
 * - `unshared`  — the same, with `canvasToDoc`'s node sharing defeated (every
 *                 conversion gets a mapper that has never seen these objects).
 *                 This is what `resolved` cost before the sharing, and what it
 *                 would cost again if the sharing were dropped.
 *
 * Run with:
 *   node --expose-gc --import tsx src/controllers/utils/__benchmarks__/historyMemory.ts
 */

import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { RECT_DOC_DEFAULTS } from "@jiscribe/doc/model/objects/primitives/rect/RectDoc";
import {
	createEstimateTextMeasurement,
	offerTextMeasurement,
} from "@jiscribe/doc/unstable";

import { canvasToState } from "../../../states/canvas/CanvasMapper";
import type { DocSnapshot, DocSnapshotSource } from "../../CanvasTypes";
import type { ObjectBehaviorRegistry } from "../../gestures/registry/ObjectBehaviorRegistry";
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

type Mode = "lazy" | "resolved" | "unshared";

/**
 * Builds `HISTORY_DEPTH` entries the way `recordHistoryIfNeeded` does, one
 * single-object move per commit, and returns everything the canvas would still
 * be holding afterwards.
 *
 * The registries are built here rather than handed in so each run starts with an
 * empty doc-node cache — one shared between runs would bill the first run for
 * nodes the later ones then get for free.
 */
const buildHistory = (
	count: number,
	mode: Mode,
): { past: DocSnapshot[]; present: DocSnapshot; live: DocSnapshotSource } => {
	const registries = createCanvasRegistries();
	const initial = canvasToState(
		buildDoc(count),
		registries.objectMapper,
		registries.objectContentResizer,
	);

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

		if (mode === "lazy") {
			continue;
		}
		// What useNotifySaveRequest does on every commit when the host saves. A
		// mapper of its own has no cached node to offer, which is how `unshared`
		// pays the full conversion every time without a second implementation.
		resolveDocSnapshot(
			present,
			mode === "unshared"
				? createCanvasRegistries().objectMapper
				: registries.objectMapper,
		);
	}

	return { past, present, live };
};

const measure = (count: number, mode: Mode): number => {
	gc();
	const before = heapUsed();
	const held = buildHistory(count, mode);
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
	console.log(`history depth ${HISTORY_DEPTH}, one object moved per commit\n`);
	console.log("objects | mode     | history heap | per entry | build");
	console.log("--------|----------|--------------|-----------|--------");

	for (const count of OBJECT_COUNTS) {
		for (const mode of ["lazy", "resolved", "unshared"] as const) {
			// The heap figure comes from its own run so the timing below cannot
			// inflate it, and the timing from another so it measures a warm process.
			const bytes = measure(count, mode);
			const started = performance.now();
			buildHistory(count, mode);
			const elapsed = performance.now() - started;

			console.log(
				`${String(count).padStart(7)} | ${mode.padEnd(8)} | ${formatMb(
					bytes,
				).padStart(12)} | ${formatKb(bytes / HISTORY_DEPTH).padStart(
					9,
				)} | ${`${elapsed.toFixed(0)} ms`.padStart(7)}`,
			);
		}
	}
};

main();

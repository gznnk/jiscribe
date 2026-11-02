import {
	ConnectPointIds,
	type ConnectPointId,
} from "@jiscribe/doc/model/objects/types/EndpointRef";
import type { Point } from "@jiscribe/geometry";
import { bench, describe } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import { calcConnectPoint, type AnchorFrame } from "../../calcConnectPoint";
import { resolveOrthogonalRoute } from "../resolveOrthogonalRoute";

// The router avoids only the two shapes a connector joins (routeOrthogonalConnector), so
// what grows its per-frame cost is the number of connectors re-routed, not the number of
// shapes on the canvas.

type FrameObject = ObjectState & AnchorFrame;

const rect = (id: string, cx: number, cy: number, rotation = 0): FrameObject =>
	({
		id,
		type: "rect",
		cx,
		cy,
		width: 120,
		height: 80,
		rotation,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as FrameObject;

/** One end of a connector: the owner and the connect point it is attached to. */
type RouteEnd = {
	object: FrameObject;
	connectPointId: ConnectPointId;
	point: Point;
};

const endOf = (
	object: FrameObject,
	connectPointId: ConnectPointId,
): RouteEnd => ({
	object,
	connectPointId,
	point: calcConnectPoint(object, connectPointId),
});

const routeBetween = (source: RouteEnd, target: RouteEnd): void => {
	resolveOrthogonalRoute(
		{ kind: "connectPoint", id: source.connectPointId },
		{ kind: "connectPoint", id: target.connectPointId },
		source.point,
		target.point,
		source.object,
		target.object,
	);
};

// Layouts that take different branches of the router: a straight run, an S-bend, a
// wrap-around, a rotated owner, and a self-loop.
describe("resolveOrthogonalRoute: one route", () => {
	const selfLoopOwner = rect("a", 0, 0);
	const layouts: [string, RouteEnd, RouteEnd][] = [
		[
			"facing faces, straight",
			endOf(rect("a", 0, 0), "rightCenter"),
			endOf(rect("b", 400, 0), "leftCenter"),
		],
		[
			"facing faces, offset (S-bend)",
			endOf(rect("a", 0, 0), "rightCenter"),
			endOf(rect("b", 400, 200), "leftCenter"),
		],
		[
			"same-side faces (wrap-around)",
			endOf(rect("a", 0, 0), "rightCenter"),
			endOf(rect("b", 400, 30), "rightCenter"),
		],
		[
			"owner rotated 30°",
			endOf(rect("a", 0, 0, 30), "bottomCenter"),
			endOf(rect("b", 300, 250), "topCenter"),
		],
		[
			"self-loop",
			endOf(selfLoopOwner, "topCenter"),
			endOf(selfLoopOwner, "rightCenter"),
		],
	];
	for (const [label, source, target] of layouts) {
		bench(label, () => {
			routeBetween(source, target);
		});
	}
});

/**
 * The far ends of `spokeCount` connectors from a hub at the origin: spokes on rings around
 * it, attached at every face in turn, so a frame mixes straight runs, bends and wrap-arounds.
 * The hub's face for spoke `index` is `ConnectPointIds[index % 4]`.
 */
const buildSpokeEnds = (spokeCount: number): RouteEnd[] =>
	Array.from({ length: spokeCount }, (_, index) => {
		const angle = (index / spokeCount) * Math.PI * 2;
		const radius = 400 + (index % 7) * 60;
		return endOf(
			rect(
				`spoke-${index}`,
				Math.cos(angle) * radius,
				Math.sin(angle) * radius,
			),
			ConnectPointIds[Math.floor(index / 4) % 4],
		);
	});

// One frame of dragging the hub: every connector hanging off it is re-routed.
describe("resolveOrthogonalRoute: drag a hub, re-route its connectors", () => {
	for (const spokeCount of [10, 100, 1000]) {
		const spokeEnds = buildSpokeEnds(spokeCount);
		let step = 0;
		bench(`${spokeCount} connectors`, () => {
			const hub = rect("hub", ++step % 50, 0);
			const hubEnds = ConnectPointIds.map((connectPointId) =>
				endOf(hub, connectPointId),
			);
			spokeEnds.forEach((spokeEnd, index) => {
				routeBetween(hubEnds[index % 4], spokeEnd);
			});
		});
	}
});

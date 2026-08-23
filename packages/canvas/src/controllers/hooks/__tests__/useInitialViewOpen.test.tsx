// @vitest-environment jsdom

import type { ViewDoc } from "@jiscribe/doc/model/canvas/ViewDoc";
import type { Dimensions } from "@jiscribe/geometry";
import { act, createRef } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { CanvasAction } from "../../reducer/CanvasActions";
import { useInitialViewOpen } from "../useInitialViewOpen";

/**
 * What the hook decides is *when* a document's framing intent is applied, and
 * against which measurement — the fit arithmetic itself belongs to
 * calcInitialCameraFromView. So these drive the container's reported box by hand
 * and watch what reaches dispatch.
 */

/** One 800x400 rect at the origin; the same extent the fit tests use. */
const rectAt = (
	x: number,
	y: number,
	width: number,
	height: number,
): ObjectState =>
	({
		id: "r1",
		type: "rect",
		cx: x + width / 2,
		cy: y + height / 2,
		width,
		height,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as ObjectState;

const objects: Record<string, ObjectState> = { r1: rectAt(0, 0, 800, 400) };

/** Registry stand-in: no shape draws outside its geometry box here. */
const visualBounds = { get: () => undefined };

const roots: { unmount: () => void }[] = [];

/**
 * Mounts the hook on a div whose measured box is fixed at `size`, and returns
 * the dispatch spy plus a way to re-render with a different size.
 */
const mountWithContainerSize = (
	view: ViewDoc | undefined,
	size: Dimensions,
) => {
	const dispatch = vi.fn<(action: CanvasAction) => void>();
	const containerRef = createRef<HTMLDivElement>() as {
		current: HTMLDivElement | null;
	};
	const container = document.createElement("div");
	let measured = size;
	container.getBoundingClientRect = () =>
		({ width: measured.width, height: measured.height }) as DOMRect;
	containerRef.current = container;

	const Probe = ({ reportedSize }: { reportedSize: Dimensions }) => {
		useInitialViewOpen({
			view,
			containerRef,
			viewportSize: reportedSize,
			objects,
			visualBounds,
			dispatch,
		});
		return null;
	};

	const host = document.createElement("div");
	const root = createRoot(host);
	roots.push(root);
	act(() => {
		root.render(<Probe reportedSize={size} />);
	});

	return {
		dispatch,
		/** Re-renders with a new measured box, the way a CONTAINER_RESIZE does. */
		remeasure: (next: Dimensions) => {
			measured = next;
			act(() => {
				root.render(<Probe reportedSize={next} />);
			});
		},
	};
};

afterEach(() => {
	act(() => {
		roots.splice(0).forEach((root) => {
			root.unmount();
		});
	});
});

describe("useInitialViewOpen", () => {
	it("dispatches the fitted camera together with the measured size", () => {
		const { dispatch } = mountWithContainerSize(
			{ padding: { left: 100, right: 100 }, open: "fit-width" },
			{ width: 1000, height: 500 },
		);
		expect(dispatch).toHaveBeenCalledTimes(1);
		expect(dispatch).toHaveBeenCalledWith({
			type: "APPLY_INITIAL_VIEW",
			viewport: { width: 1000, height: 500, zoom: 1, minX: -100, minY: 0 },
		});
	});

	it("does nothing when the document declares no open mode", () => {
		const { dispatch } = mountWithContainerSize(
			{ padding: { top: 48 } },
			{ width: 1000, height: 500 },
		);
		expect(dispatch).not.toHaveBeenCalled();
	});

	it("does nothing when the host withheld the view (its own camera wins)", () => {
		const { dispatch } = mountWithContainerSize(undefined, {
			width: 1000,
			height: 500,
		});
		expect(dispatch).not.toHaveBeenCalled();
	});

	it("applies the intent only once, not again on a later resize", () => {
		const { dispatch, remeasure } = mountWithContainerSize(
			{ open: "fit-all" },
			{ width: 1000, height: 500 },
		);
		expect(dispatch).toHaveBeenCalledTimes(1);
		remeasure({ width: 600, height: 300 });
		expect(dispatch).toHaveBeenCalledTimes(1);
	});

	it("waits for a real measurement instead of fitting against an empty box", () => {
		const { dispatch, remeasure } = mountWithContainerSize(
			{ open: "fit-all" },
			{ width: 0, height: 0 },
		);
		expect(dispatch).not.toHaveBeenCalled();

		remeasure({ width: 1000, height: 500 });
		expect(dispatch).toHaveBeenCalledTimes(1);
		expect(dispatch.mock.calls[0][0]).toEqual({
			type: "APPLY_INITIAL_VIEW",
			viewport: { width: 1000, height: 500, zoom: 1.25, minX: 0, minY: 0 },
		});
	});

	it("leaves the camera alone when there is no content to fit", () => {
		const dispatch = vi.fn<(action: CanvasAction) => void>();
		const container = document.createElement("div");
		container.getBoundingClientRect = () =>
			({ width: 1000, height: 500 }) as DOMRect;
		const containerRef = { current: container };

		const Probe = () => {
			useInitialViewOpen({
				view: { open: "fit-all" },
				containerRef,
				viewportSize: { width: 1000, height: 500 },
				objects: {},
				visualBounds,
				dispatch,
			});
			return null;
		};
		const root = createRoot(document.createElement("div"));
		roots.push(root);
		act(() => {
			root.render(<Probe />);
		});
		expect(dispatch).not.toHaveBeenCalled();
	});
});

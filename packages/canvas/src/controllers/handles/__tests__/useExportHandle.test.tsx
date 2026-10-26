// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
	BuildExportSvgOptions,
	ResolveImageBlob,
} from "../../../rendering/export";
import {
	canvasToSvgString,
	rasterizeSvgToPng,
} from "../../../rendering/export";
import type { CanvasControllerState } from "../../CanvasTypes";
import { twoRectsWithConnectorDoc } from "../../commands/__tests__/support/fixtures";
import { createTestState } from "../../reducer/__tests__/support/createTestState";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import type { SnapshotRenderScope } from "../../utils/SnapshotRenderScope";
import { type CanvasExportHandle, useExportHandle } from "../useExportHandle";

/**
 * The handle's own wiring around the export pipeline (resolveExportOptions and
 * the serializers are tested on their own): null before the view mounts, the
 * render scope each region asks for, the region a capture reports, and a handle
 * that stays the same object while the image resolver changes under it.
 */

vi.mock("../../../rendering/export", () => ({
	canvasToSvgString: vi.fn(() => Promise.resolve("<svg/>")),
	rasterizeSvgToPng: vi.fn(() =>
		Promise.resolve({ blob: new Blob(), width: 320, height: 160 }),
	),
}));

// Without this React treats every `act` below as unsupported and warns.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const roots: { unmount: () => void }[] = [];

beforeEach(() => {
	vi.mocked(canvasToSvgString).mockClear();
	vi.mocked(rasterizeSvgToPng).mockClear();
});

afterEach(() => {
	act(() => {
		roots.splice(0).forEach((root) => {
			root.unmount();
		});
	});
});

const registries = createTestRegistries();

type ProbeProps = {
	canvasState: CanvasControllerState;
	resolveImageBlob: ResolveImageBlob;
};

/**
 * Mounts the hook with `svgElement` as the view's `<svg>` (null for a view not
 * mounted yet) and records every render scope a snapshot is taken under.
 */
const mountHandle = (
	initialProps: ProbeProps,
	svgElement: SVGSVGElement | null,
) => {
	const svgRef = { current: svgElement };
	const renderScopes: SnapshotRenderScope[] = [];
	const withSnapshotRenderScope = <T,>(
		renderScope: SnapshotRenderScope,
		snapshot: () => T,
	): T => {
		renderScopes.push(renderScope);
		return snapshot();
	};
	let returned: CanvasExportHandle | null = null;
	const Probe = ({ canvasState, resolveImageBlob }: ProbeProps) => {
		returned = useExportHandle(
			canvasState,
			registries,
			svgRef,
			withSnapshotRenderScope,
			resolveImageBlob,
		);
		return null;
	};
	const root = createRoot(document.createElement("div"));
	roots.push(root);
	const render = (props: ProbeProps): CanvasExportHandle => {
		act(() => {
			root.render(<Probe {...props} />);
		});
		if (returned === null) {
			throw new Error("the probe did not render");
		}
		return returned;
	};
	return { renderScopes, first: render(initialProps), render };
};

const createSvgElement = (): SVGSVGElement =>
	document.createElementNS("http://www.w3.org/2000/svg", "svg");

const unusedResolver: ResolveImageBlob = () => undefined;

/** The options the last `canvasToSvgString` call was handed. */
const lastSvgOptions = (): BuildExportSvgOptions => {
	const call = vi.mocked(canvasToSvgString).mock.lastCall;
	if (call === undefined) {
		throw new Error("canvasToSvgString was not called");
	}
	return call[1] as BuildExportSvgOptions;
};

describe("useExportHandle", () => {
	it("yields null from both methods before the view has mounted its svg", async () => {
		const { first } = mountHandle(
			{
				canvasState: createTestState(twoRectsWithConnectorDoc),
				resolveImageBlob: unusedResolver,
			},
			null,
		);
		await expect(first.toSvgString()).resolves.toBeNull();
		await expect(first.capturePng()).resolves.toBeNull();
		expect(canvasToSvgString).not.toHaveBeenCalled();
		expect(rasterizeSvgToPng).not.toHaveBeenCalled();
	});

	it("snapshots the whole tree by default, and only the isolated ids for an isolated region", async () => {
		const { first, renderScopes } = mountHandle(
			{
				canvasState: createTestState(twoRectsWithConnectorDoc),
				resolveImageBlob: unusedResolver,
			},
			createSvgElement(),
		);
		await first.toSvgString();
		await first.toSvgString({ region: { ids: ["rect-1"], isolate: true } });
		expect(renderScopes[0]).toBe("all");
		expect([...(renderScopes[1] as ReadonlySet<string>)]).toEqual(["rect-1"]);
	});

	it("reports the fitted viewBox as the capture region, with the rasterized size and the scale passed through", async () => {
		const { first } = mountHandle(
			{
				canvasState: createTestState(twoRectsWithConnectorDoc),
				resolveImageBlob: unusedResolver,
			},
			createSvgElement(),
		);
		const capture = await first.capturePng({ margin: 0, scale: 3 });
		// rect-1 spans (0,0)-(10,10) and rect-2 (100,100)-(110,110).
		expect(capture?.region).toEqual({ x: 0, y: 0, width: 110, height: 110 });
		expect(capture?.pixelWidth).toBe(320);
		expect(capture?.pixelHeight).toBe(160);
		expect(vi.mocked(rasterizeSvgToPng).mock.lastCall?.[1]).toMatchObject({
			scale: 3,
			maxPixelSize: undefined,
		});
	});

	it("falls back to the visible world rect for an empty canvas, which has no viewBox to report", async () => {
		const canvasState = createTestState(
			{ version: 1, root: [] } as unknown as typeof twoRectsWithConnectorDoc,
			{
				viewport: { minX: 10, minY: 20, width: 400, height: 200, zoom: 2 },
			},
		);
		const { first } = mountHandle(
			{ canvasState, resolveImageBlob: unusedResolver },
			createSvgElement(),
		);
		const capture = await first.capturePng();
		expect(capture?.region).toEqual({ x: 10, y: 20, width: 200, height: 100 });
	});

	it("keeps the handle across a new image resolver and reads the latest one at export time", async () => {
		const canvasState = createTestState(twoRectsWithConnectorDoc);
		const staleResolver = vi.fn<ResolveImageBlob>(() => undefined);
		const latestResolver = vi.fn<ResolveImageBlob>(() => undefined);
		const { first, render } = mountHandle(
			{ canvasState, resolveImageBlob: staleResolver },
			createSvgElement(),
		);
		const next = render({ canvasState, resolveImageBlob: latestResolver });
		expect(next).toBe(first);

		await first.toSvgString();
		lastSvgOptions().resolveImageBlob?.("image://a");
		expect(latestResolver).toHaveBeenCalledWith("image://a");
		expect(staleResolver).not.toHaveBeenCalled();
	});

	it("exports the state of the latest commit through a handle built on an earlier one", async () => {
		const { first, render, renderScopes } = mountHandle(
			{
				canvasState: createTestState(twoRectsWithConnectorDoc),
				resolveImageBlob: unusedResolver,
			},
			createSvgElement(),
		);
		render({
			canvasState: createTestState({
				version: 1,
				root: [{ id: "late", type: "rect", x: 0, y: 0, width: 10, height: 10 }],
			} as unknown as typeof twoRectsWithConnectorDoc),
			resolveImageBlob: unusedResolver,
		});
		await first.toSvgString({ region: { ids: ["late"], isolate: true } });
		expect([...(renderScopes[0] as ReadonlySet<string>)]).toEqual(["late"]);
	});
});

// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import type { Viewport } from "../../../rendering/Viewport";
import { twoRectsWithConnectorDoc } from "../../commands/__tests__/support/fixtures";
import { createTestState } from "../../reducer/__tests__/support/createTestState";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { useVisibleObjectIds } from "../useVisibleObjectIds";

/**
 * The hook's own contract on top of calcVisibleObjectIds (tested on its own):
 * the returned Set keeps its identity while the membership holds, so a pan that
 * crosses no object boundary leaves the memoized ObjectsRenderer alone.
 */

// Without this React treats every `act` below as unsupported and warns.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const roots: { unmount: () => void }[] = [];

afterEach(() => {
	act(() => {
		roots.splice(0).forEach((root) => {
			root.unmount();
		});
	});
});

const registries = createTestRegistries();
// rect-1 at (0,0), rect-2 at (100,100), both 10 wide, and a connector between them.
const { objects, rootIds } = createTestState(twoRectsWithConnectorDoc);

const homeViewport: Viewport = {
	minX: 0,
	minY: 0,
	width: 800,
	height: 600,
	zoom: 1,
};

/** A camera far enough right that every fixture object falls outside the cull margin. */
const farAwayViewport: Viewport = { ...homeViewport, minX: 5000 };

type ProbeProps = { viewport: Viewport; textEditObjectId: string | null };

/** Mounts the hook and returns a way to re-render it, reading back the Set it returned. */
const mount = (initialProps: ProbeProps) => {
	let returned: ReadonlySet<string> | null = null;
	const Probe = ({ viewport, textEditObjectId }: ProbeProps) => {
		returned = useVisibleObjectIds(
			objects,
			rootIds,
			viewport,
			textEditObjectId,
			registries,
		);
		return null;
	};
	const root = createRoot(document.createElement("div"));
	roots.push(root);
	const render = (props: ProbeProps): ReadonlySet<string> => {
		act(() => {
			root.render(<Probe {...props} />);
		});
		if (returned === null) {
			throw new Error("the probe did not render");
		}
		return returned;
	};
	return { first: render(initialProps), render };
};

describe("useVisibleObjectIds", () => {
	it("keeps the same Set through a pan that changes no membership", () => {
		const { first, render } = mount({
			viewport: homeViewport,
			textEditObjectId: null,
		});
		expect([...first].sort()).toEqual(["conn-1", "rect-1", "rect-2"]);
		expect(
			render({
				viewport: { ...homeViewport, minX: 5, minY: -5 },
				textEditObjectId: null,
			}),
		).toBe(first);
	});

	it("hands back a new Set once the membership changes, and holds that one in turn", () => {
		const { first, render } = mount({
			viewport: homeViewport,
			textEditObjectId: null,
		});
		const emptied = render({
			viewport: farAwayViewport,
			textEditObjectId: null,
		});
		expect(emptied).not.toBe(first);
		expect(emptied.size).toBe(0);
		expect(
			render({
				viewport: { ...farAwayViewport, minX: 5100 },
				textEditObjectId: null,
			}),
		).toBe(emptied);
	});

	it("keeps the object under an open text edit rendered while it is off screen", () => {
		const { first } = mount({
			viewport: farAwayViewport,
			textEditObjectId: "rect-1",
		});
		expect([...first]).toEqual(["rect-1"]);
	});
});

// @vitest-environment jsdom

import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import { createTestState } from "../../../../../reducer/__tests__/support/createTestState";
import { rectDoc } from "../../../../../reducer/__tests__/support/fixtures";
import { createCanvasRegistries } from "../../../../../registries/createCanvasRegistries";
import { createCowObjects } from "../../../../../utils/cowObjects";
import { RectIcon } from "../../../../objects/primitives/RectIcon";
import { resolveStencilCategories } from "../../../StencilLibrary/utils/resolveStencilCategory";
import { useDocumentCategoryIds } from "../useDocumentCategoryIds";

/**
 * What the hook adds to tallyDocumentCategories is the memory between renders:
 * the tally a render leaves is what the next one is counted against, so a
 * re-render whose objects keep their types hands the rail the same array.
 */

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const { stencil } = createCanvasRegistries();
const librarySections = resolveStencilCategories(
	[{ id: "boxes", label: "Boxes", icon: RectIcon, presetIds: ["rect"] }],
	stencil,
);
const RAIL_PRESET_IDS = ["text"];

let unmount: (() => void) | null = null;

afterEach(() => {
	unmount?.();
	unmount = null;
});

/** Mounts the hook on a probe driven by re-rendering, and records every answer. */
const renderHook = (initialObjects: Record<string, ObjectState>) => {
	const answers: (readonly string[])[] = [];
	const Probe = ({ objects }: { objects: Record<string, ObjectState> }) => {
		answers.push(
			useDocumentCategoryIds(
				objects,
				librarySections,
				RAIL_PRESET_IDS,
				stencil,
			),
		);
		return null;
	};
	const root = createRoot(document.createElement("div"));
	act(() => root.render(<Probe objects={initialObjects} />));
	unmount = () => act(() => root.unmount());
	return {
		answers,
		rerender: (objects: Record<string, ObjectState>) =>
			act(() => root.render(<Probe objects={objects} />)),
	};
};

describe("useDocumentCategoryIds", () => {
	it("answers the same array for new objects keeping their types", () => {
		const objects = createTestState({
			version: 1,
			root: [rectDoc("rect-1", 0, 0)],
		} as CanvasDoc).objects;
		const { answers, rerender } = renderHook(objects);
		expect(answers[0]).toEqual(["boxes"]);

		// A drag step (copy-on-write) and a plain map from a command alike
		const dragStep = createCowObjects(objects);
		dragStep["rect-1"] = { ...objects["rect-1"] };
		rerender(dragStep);
		rerender({ ...objects });

		expect(answers).toHaveLength(3);
		expect(answers[1]).toBe(answers[0]);
		expect(answers[2]).toBe(answers[0]);
	});

	it("answers a new array once a type changes the categories", () => {
		const objects = createTestState({
			version: 1,
			root: [rectDoc("rect-1", 0, 0)],
		} as CanvasDoc).objects;
		const { answers, rerender } = renderHook(objects);
		rerender({});
		expect(answers[1]).toEqual([]);
	});
});

import { beforeAll, describe, expect, it } from "vitest";

import type { CanvasDoc } from "../../../../schemas/canvas/CanvasDoc";
import { deepFreezeState } from "../../../__tests__/support/deepFreezeState";
import { createInitialControllerState } from "../../../reducer/createInitialControllerState";
import { initializeObjectRegistry } from "../../../setup/initializeObjectRegistry";
import { StartTextEditCommand } from "../StartTextEditCommand";

const rect = {
	id: "rect-1",
	type: "rect",
	x: 0,
	y: 0,
	width: 100,
	height: 100,
};

const svg = {
	id: "svg-1",
	type: "svg",
	x: 0,
	y: 0,
	width: 100,
	height: 100,
	svgText: "<svg xmlns='http://www.w3.org/2000/svg'></svg>",
};

const doc = { version: 1, root: [rect, svg] } as unknown as CanvasDoc;

const stateWithSelection = (selectedId: string) =>
	deepFreezeState({
		...createInitialControllerState(doc),
		selectedIds: [selectedId],
	});

describe("StartTextEditCommand", () => {
	beforeAll(() => {
		initializeObjectRegistry();
	});

	it("a rect that supports text can start editing", () => {
		const state = stateWithSelection("rect-1");
		expect(StartTextEditCommand.canExecute?.(state)).toBe(true);
		expect(StartTextEditCommand.execute(state).textEditState?.objectId).toBe(
			"rect-1",
		);
	});

	it("an svg that does not support text does not start editing", () => {
		const state = stateWithSelection("svg-1");
		expect(StartTextEditCommand.canExecute?.(state)).toBe(false);
		// returns the state unchanged when editing is not entered
		expect(StartTextEditCommand.execute(state)).toBe(state);
	});
});

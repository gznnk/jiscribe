import type { Camera, CanvasSidebarsState } from "@jiscribe/canvas";
import { describe, expect, it } from "vitest";

import { createPersistedState, type VscodeStateApi } from "../persistedState";

/** Stand-in for the VSCode API's state, which is one value per page. */
const makeStateApi = (): VscodeStateApi & { stored: unknown } => ({
	stored: null,
	getState() {
		return this.stored;
	},
	setState(state: unknown) {
		this.stored = state;
	},
});

const camera: Camera = { minX: -120, minY: 40, zoom: 1.5 };
const sidebars: CanvasSidebarsState = {
	left: { isOpen: true },
	right: { isOpen: false },
	panels: {
		stencilLibrary: { collapsedSectionIds: ["flowchart"] },
		properties: { collapsedSectionIds: [] },
	},
};

describe("createPersistedState", () => {
	it("reads undefined before anything is stored", () => {
		const { readPersistedCamera, readPersistedSidebars } =
			createPersistedState(makeStateApi());
		expect(readPersistedCamera()).toBeUndefined();
		expect(readPersistedSidebars()).toBeUndefined();
	});

	it("reads back what it stored", () => {
		const { readPersistedCamera, persistCamera } =
			createPersistedState(makeStateApi());
		persistCamera(camera);
		expect(readPersistedCamera()).toEqual(camera);
	});

	it("keeps the camera and the sidebars side by side", () => {
		const stateApi = makeStateApi();
		const {
			readPersistedCamera,
			persistCamera,
			readPersistedSidebars,
			persistSidebars,
		} = createPersistedState(stateApi);

		persistCamera(camera);
		persistSidebars(sidebars);

		expect(readPersistedCamera()).toEqual(camera);
		expect(readPersistedSidebars()).toEqual(sidebars);
	});

	it("leaves unrelated stored fields alone", () => {
		const stateApi = makeStateApi();
		stateApi.stored = { camera, unrelated: "kept" };
		createPersistedState(stateApi).persistSidebars(sidebars);
		expect(stateApi.stored).toEqual({ camera, sidebars, unrelated: "kept" });
	});

	it("sees a write made through another accessor over the same handle", () => {
		const stateApi = makeStateApi();
		createPersistedState(stateApi).persistCamera(camera);
		expect(createPersistedState(stateApi).readPersistedCamera()).toEqual(
			camera,
		);
	});
});

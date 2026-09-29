/**
 * The Webview's getState/setState storage, extracted from index.tsx.
 *
 * Kept behind a factory rather than reading a module-level handle, so the
 * accessors can be exercised against a fake instead of the real
 * acquireVsCodeApi(), which exists only inside a Webview.
 */

import type { Camera, CanvasSidebarsState } from "@jiscribe/canvas";

/** The getState/setState half of what acquireVsCodeApi() returns. */
export type VscodeStateApi = {
	getState(): unknown;
	setState(state: unknown): void;
};

/**
 * Webview-local state saved via getState/setState. With
 * retainContextWhenHidden: false (#138), the Webview is discarded when the tab
 * hides, but this survives the reload — so we save the viewport (camera) and the
 * sidebar open/collapsed state, and restore both on remount. The document isn't
 * included, as the Extension re-sends it via "ready".
 */
type PersistedState = {
	camera?: Camera;
	sidebars?: CanvasSidebarsState;
};

/** The four accessors over one VSCode API handle's persisted state. */
export type PersistedStateAccess = {
	/** Camera stored by the last persistCamera, undefined before the first one. */
	readPersistedCamera: () => Camera | undefined;
	/** Stores `camera`, leaving the stored sidebar state as it is. */
	persistCamera: (camera: Camera) => void;
	/** Sidebar state stored by the last persistSidebars, undefined before the first one. */
	readPersistedSidebars: () => CanvasSidebarsState | undefined;
	/** Stores `sidebars`, leaving the stored camera as it is. */
	persistSidebars: (sidebars: CanvasSidebarsState) => void;
};

/**
 * Binds the persisted-state accessors to one VSCode API handle.
 *
 * @param vscodeApi - the state half of acquireVsCodeApi(); whatever getState()
 *   returns is treated as a {@link PersistedState} without validation, as
 *   nothing but this module ever writes it, and a null (nothing stored yet) is
 *   read as an empty state
 * @returns accessors that read the stored state at call time, so each writer
 *   merges into what is there rather than replacing it
 */
export const createPersistedState = (
	vscodeApi: VscodeStateApi,
): PersistedStateAccess => {
	const readPersistedState = (): PersistedState =>
		(vscodeApi.getState() as PersistedState | null) ?? {};

	return {
		readPersistedCamera: () => readPersistedState().camera ?? undefined,
		persistCamera: (camera) => {
			vscodeApi.setState({ ...readPersistedState(), camera });
		},
		readPersistedSidebars: () => readPersistedState().sidebars ?? undefined,
		persistSidebars: (sidebars) => {
			vscodeApi.setState({ ...readPersistedState(), sidebars });
		},
	};
};

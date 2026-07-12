import type { CanvasDoc } from "../../../../schemas/canvas/CanvasDoc";
import { deepFreezeState } from "../../../__tests__/support/deepFreezeState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { createInitialControllerState } from "../../../reducer/createInitialControllerState";
import { createTestRegistries } from "../../../setup/createCanvasRegistries";

/**
 * commands 結合テスト用の CanvasControllerState を構築する。
 *
 * production と同じ createInitialControllerState を土台にするため初期値が prod とドリフトしない。
 * テスト固有の差分（選択・rootIds の並びなど）は overrides で渡す。
 * 返す state は deepFreezeState で凍結し、in-place ミューテートを検知する。
 */
export const createCommandState = (
	doc: CanvasDoc,
	overrides?: Partial<CanvasControllerState>,
): CanvasControllerState =>
	deepFreezeState({
		...createInitialControllerState(doc, createTestRegistries()),
		...overrides,
	});

import type { CanvasDoc } from "../../../../schemas/canvas/CanvasDoc";
import { deepFreezeState } from "../../../__tests__/support/deepFreezeState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { createTestRegistries } from "../../../setup/createCanvasRegistries";
import { createInitialControllerState } from "../../createInitialControllerState";

/**
 * 結合テスト用の CanvasControllerState を構築する。
 *
 * production と同じ createInitialControllerState を土台にするため、初期 state の
 * デフォルト値が prod とドリフトしない。テスト固有の差分（選択など）は overrides で渡す。
 * 返す state は deepFreezeState で凍結し、in-place ミューテートを検知する。
 */
export const createTestState = (
	doc: CanvasDoc,
	overrides?: Partial<CanvasControllerState>,
): CanvasControllerState =>
	deepFreezeState({
		...createInitialControllerState(doc, createTestRegistries()),
		...overrides,
	});

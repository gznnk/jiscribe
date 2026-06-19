import type { CanvasDoc } from "../../../../schemas/canvas/CanvasDoc";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { createInitialControllerState } from "../../createInitialControllerState";

/**
 * 結合テスト用の CanvasControllerState を構築する。
 *
 * production と同じ createInitialControllerState を土台にするため、初期 state の
 * デフォルト値が prod とドリフトしない。テスト固有の差分（選択など）は overrides で渡す。
 */
export const createTestState = (
	doc: CanvasDoc,
	overrides?: Partial<CanvasControllerState>,
): CanvasControllerState => ({
	...createInitialControllerState(doc),
	...overrides,
});

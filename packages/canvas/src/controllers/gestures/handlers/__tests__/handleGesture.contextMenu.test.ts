import { beforeAll, describe, expect, it } from "vitest";

import type { CanvasDoc } from "../../../../schemas/canvas/CanvasDoc";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { createInitialControllerState } from "../../../reducer/createInitialControllerState";
import { initializeGestureHandlerRegistry } from "../../../setup/initializeGestureHandlerRegistry";
import { initializeObjectRegistry } from "../../../setup/initializeObjectRegistry";
import type { Gesture } from "../../recognizer/GestureRecognizerTypes";
import { handleGesture } from "../handleGesture";

beforeAll(() => {
	initializeObjectRegistry();
	initializeGestureHandlerRegistry();
});

const emptyDoc: CanvasDoc = {
	version: 1,
	root: [],
} as unknown as CanvasDoc;

/**
 * コンテキストメニューが開いている state を作る。
 * 図形 a とコネクター c を 1 つずつ持たせ、各対象上の pressed を再現できるようにする。
 */
const openMenuState = (): CanvasControllerState => {
	const base = createInitialControllerState(emptyDoc);
	const rect = { id: "a", type: "rect" } as unknown as ObjectState;
	const connector = { id: "c", type: "connector" } as unknown as ObjectState;
	return {
		...base,
		objects: { ...base.objects, a: rect, c: connector },
		rootIds: [...base.rootIds, "a", "c"],
		contextMenuPosition: { clientX: 100, clientY: 100 },
	};
};

const pressedOn = (targetKind: string, targetId: string): Gesture =>
	({
		type: "pressed",
		button: 0,
		targetKind,
		targetId,
		mods: { shift: false, alt: false, ctrl: false, meta: false },
	}) as unknown as Gesture;

describe("handleGesture - コンテキストメニューの自動クローズ", () => {
	it("図形上の左クリック押下でメニューを閉じる", () => {
		const nextState = handleGesture(openMenuState(), pressedOn("object", "a"));
		expect(nextState.contextMenuPosition).toBeNull();
	});

	it("コネクター上の左クリック押下でメニューを閉じる", () => {
		const nextState = handleGesture(
			openMenuState(),
			pressedOn("connector", "c"),
		);
		expect(nextState.contextMenuPosition).toBeNull();
	});

	it("コントロール上の左クリック押下でメニューを閉じる", () => {
		const nextState = handleGesture(
			openMenuState(),
			pressedOn("control", "transform-control:nw"),
		);
		expect(nextState.contextMenuPosition).toBeNull();
	});

	it("ツールバー上の左クリック押下でメニューを閉じる", () => {
		const nextState = handleGesture(
			openMenuState(),
			pressedOn("toolbar", "toolbar:command:zoomIn"),
		);
		expect(nextState.contextMenuPosition).toBeNull();
	});

	it("シェイプライブラリ項目上の左クリック押下でメニューを閉じる", () => {
		const nextState = handleGesture(
			openMenuState(),
			pressedOn("menu-item", "menu-item:rect"),
		);
		expect(nextState.contextMenuPosition).toBeNull();
	});

	it("ObjectMenu 上の左クリック押下でメニューを閉じる", () => {
		const nextState = handleGesture(
			openMenuState(),
			pressedOn("object-menu", "object-menu:command:group"),
		);
		expect(nextState.contextMenuPosition).toBeNull();
	});

	it("メニュー項目（context-menu）の押下では閉じない（click を届かせるため）", () => {
		const nextState = handleGesture(
			openMenuState(),
			pressedOn("context-menu", "context-menu:copy"),
		);
		expect(nextState.contextMenuPosition).toEqual({
			clientX: 100,
			clientY: 100,
		});
	});
});

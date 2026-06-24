import { describe, expect, it } from "vitest";

import type { TransformDoc } from "../../../../schemas/objects/base/TransformDoc";
import {
	mapTransformDocToState,
	mapTransformStateToDoc,
} from "../TransformMapper";
import type { TransformState } from "../TransformState";

describe("TransformMapper", () => {
	describe("mapTransformDocToState", () => {
		it("rotation 未指定は 0 に、flip 未指定は scale 1 になる", () => {
			const state = mapTransformDocToState({} as TransformDoc);

			expect(state.rotation).toBe(0);
			expect(state.scaleX).toBe(1);
			expect(state.scaleY).toBe(1);
		});

		it("flipX/flipY=true は scaleX/scaleY=-1 に変換する", () => {
			const state = mapTransformDocToState({
				flipX: true,
				flipY: true,
			} as TransformDoc);

			expect(state.scaleX).toBe(-1);
			expect(state.scaleY).toBe(-1);
		});

		it("rotation と lockAspectRatio を保持する", () => {
			const state = mapTransformDocToState({
				rotation: 45,
				lockAspectRatio: true,
			} as TransformDoc);

			expect(state.rotation).toBe(45);
			expect(state.lockAspectRatio).toBe(true);
		});
	});

	describe("mapTransformStateToDoc", () => {
		it("rotation 0 は省略し、正の scale は flip を省略する", () => {
			const doc = mapTransformStateToDoc({
				rotation: 0,
				scaleX: 1,
				scaleY: 1,
			} as TransformState);

			expect(doc.rotation).toBeUndefined();
			expect(doc.flipX).toBeUndefined();
			expect(doc.flipY).toBeUndefined();
		});

		it("負の scaleX/scaleY は flipX/flipY=true に変換する", () => {
			const doc = mapTransformStateToDoc({
				rotation: 90,
				scaleX: -1,
				scaleY: -1,
			} as TransformState);

			expect(doc.rotation).toBe(90);
			expect(doc.flipX).toBe(true);
			expect(doc.flipY).toBe(true);
		});

		it("lockAspectRatio を保持する", () => {
			const doc = mapTransformStateToDoc({
				rotation: 0,
				scaleX: 1,
				scaleY: 1,
				lockAspectRatio: true,
			} as TransformState);

			expect(doc.lockAspectRatio).toBe(true);
		});
	});

	describe("round-trip", () => {
		it("Doc→State→Doc で rotation と flip が保たれる", () => {
			const src: TransformDoc = {
				rotation: 30,
				flipX: true,
				lockAspectRatio: true,
			} as TransformDoc;

			const restored = mapTransformStateToDoc(mapTransformDocToState(src));

			expect(restored.rotation).toBe(30);
			expect(restored.flipX).toBe(true);
			expect(restored.flipY).toBeUndefined();
			expect(restored.lockAspectRatio).toBe(true);
		});
	});
});

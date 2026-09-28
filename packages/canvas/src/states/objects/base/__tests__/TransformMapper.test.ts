import type { TransformDoc } from "@jiscribe/doc/model/objects/base/TransformDoc";
import { describe, expect, it } from "vitest";

import {
	mapTransformDocToState,
	mapTransformStateToDoc,
} from "../TransformMapper";
import type { TransformState } from "../TransformState";

describe("TransformMapper", () => {
	describe("mapTransformDocToState", () => {
		it("fills every unspecified field with its default", () => {
			const state = mapTransformDocToState({} as TransformDoc);

			expect(state).toEqual({
				rotation: 0,
				scaleX: 1,
				scaleY: 1,
				lockAspectRatio: false,
			});
		});

		it("converts flipX/flipY=true to scaleX/scaleY=-1", () => {
			const state = mapTransformDocToState({
				flipX: true,
				flipY: true,
			} as TransformDoc);

			expect(state.scaleX).toBe(-1);
			expect(state.scaleY).toBe(-1);
		});

		it("preserves rotation and lockAspectRatio", () => {
			const state = mapTransformDocToState({
				rotation: 45,
				lockAspectRatio: true,
			} as TransformDoc);

			expect(state.rotation).toBe(45);
			expect(state.lockAspectRatio).toBe(true);
		});
	});

	describe("mapTransformStateToDoc", () => {
		it("leaves out the keys of every field at its default", () => {
			const doc = mapTransformStateToDoc({
				rotation: 0,
				scaleX: 1,
				scaleY: 1,
				lockAspectRatio: false,
			});

			expect(Object.keys(doc)).toEqual([]);
		});

		it("converts negative scaleX/scaleY to flipX/flipY=true", () => {
			const doc = mapTransformStateToDoc({
				rotation: 90,
				scaleX: -1,
				scaleY: -1,
			} as TransformState);

			expect(doc.rotation).toBe(90);
			expect(doc.flipX).toBe(true);
			expect(doc.flipY).toBe(true);
		});

		it("rounds rotation to the persisted precision", () => {
			const doc = mapTransformStateToDoc({
				rotation: 10 / 3,
				scaleX: 1,
				scaleY: 1,
			} as TransformState);

			expect(doc.rotation).toBe(3.333);
		});

		it("drops a rotation that is only float noise away from upright", () => {
			const doc = mapTransformStateToDoc({
				rotation: 1e-9,
				scaleX: 1,
				scaleY: 1,
			} as TransformState);

			expect("rotation" in doc).toBe(false);
		});

		it("preserves lockAspectRatio", () => {
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
		it("preserves rotation and flip through Doc→State→Doc", () => {
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

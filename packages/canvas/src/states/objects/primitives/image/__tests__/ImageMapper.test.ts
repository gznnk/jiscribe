import type { ImageDoc } from "@jiscribe/doc/model/objects/primitives/image/ImageDoc";
import { describe, expect, it } from "vitest";

import { imageToDoc, imageToState } from "../ImageMapper";
import type { ImageState } from "../ImageState";

describe("ImageMapper", () => {
	describe("imageToState", () => {
		it("converts rect-style x/y/width/height into frame cx/cy and preserves src", () => {
			const doc = {
				id: "image-1",
				type: "image",
				x: 10,
				y: 20,
				width: 200,
				height: 120,
				rotation: 45,
				flipX: true,
				src: "images/logo.png",
			} as unknown as ImageDoc;

			const state = imageToState(doc);

			expect(state.id).toBe("image-1");
			expect(state.type).toBe("image");
			expect(state.cx).toBe(110); // x + width / 2
			expect(state.cy).toBe(80); // y + height / 2
			expect(state.width).toBe(200);
			expect(state.height).toBe(120);
			expect(state.rotation).toBe(45);
			expect(state.scaleX).toBe(-1); // flipX = true
			expect(state.scaleY).toBe(1);
			expect(state.src).toBe("images/logo.png");
		});

		it("defaults to rotation 0 / scale 1 when transform is unspecified", () => {
			const doc = {
				id: "image-2",
				type: "image",
				x: 0,
				y: 0,
				width: 80,
				height: 80,
				src: "a.png",
			} as unknown as ImageDoc;

			const state = imageToState(doc);

			expect(state.rotation).toBe(0);
			expect(state.scaleX).toBe(1);
			expect(state.scaleY).toBe(1);
		});
	});

	describe("imageToDoc", () => {
		it("converts frame cx/cy back into rect x/y and preserves src", () => {
			const state = {
				id: "image-1",
				type: "image",
				cx: 110,
				cy: 80,
				width: 200,
				height: 120,
				rotation: 0,
				scaleX: 1,
				scaleY: -1,
				src: "images/logo.png",
			} as unknown as ImageState;

			const doc = imageToDoc(state);

			expect(doc.id).toBe("image-1");
			expect(doc.type).toBe("image");
			expect(doc.x).toBe(10); // cx - width / 2
			expect(doc.y).toBe(20); // cy - height / 2
			expect(doc.width).toBe(200);
			expect(doc.height).toBe(120);
			expect(doc.rotation).toBeUndefined();
			expect(doc.flipX).toBeUndefined();
			expect(doc.flipY).toBe(true); // scaleY < 0
			expect(doc.src).toBe("images/logo.png");
		});
	});

	describe("round-trip", () => {
		it("preserves position, size, and src through Doc→State→Doc", () => {
			const src = {
				id: "image-rt",
				type: "image",
				x: 5,
				y: 15,
				width: 120,
				height: 60,
				rotation: 30,
				src: "assets/photo.jpg",
			} as unknown as ImageDoc;

			const restored = imageToDoc(imageToState(src));

			expect(restored.x).toBe(src.x);
			expect(restored.y).toBe(src.y);
			expect(restored.width).toBe(src.width);
			expect(restored.height).toBe(src.height);
			expect(restored.rotation).toBe(src.rotation);
			expect(restored.src).toBe(src.src);
		});
	});
});

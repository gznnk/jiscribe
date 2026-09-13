import { describe, expect, it } from "vitest";

import { createNonceDeliveryGuard } from "../createNonceDeliveryGuard";

describe("createNonceDeliveryGuard", () => {
	it("delivers the first nonce", () => {
		const guard = createNonceDeliveryGuard();
		expect(guard.shouldDeliver("nonce-a")).toBe(true);
	});

	it("rejects a repeat of the just-delivered nonce (early flush followed by the same commit's schedule)", () => {
		const guard = createNonceDeliveryGuard();
		expect(guard.shouldDeliver("nonce-a")).toBe(true);
		expect(guard.shouldDeliver("nonce-a")).toBe(false);
		expect(guard.shouldDeliver("nonce-a")).toBe(false);
	});

	it("delivers each new nonce once across a sequence of commits", () => {
		const guard = createNonceDeliveryGuard();
		expect(guard.shouldDeliver("nonce-a")).toBe(true);
		expect(guard.shouldDeliver("nonce-b")).toBe(true);
		expect(guard.shouldDeliver("nonce-b")).toBe(false);
		expect(guard.shouldDeliver("nonce-c")).toBe(true);
	});

	it("guards are independent instances", () => {
		const guardA = createNonceDeliveryGuard();
		const guardB = createNonceDeliveryGuard();
		expect(guardA.shouldDeliver("nonce-a")).toBe(true);
		expect(guardB.shouldDeliver("nonce-a")).toBe(true);
	});
});

// The parsing behind the host's DNS-rebinding guard. canvasHostAccess.test.ts
// covers the guard wired into a running host; the spellings a header can take are
// enumerated here, where each one is a single call.

import { describe, expect, it } from "vitest";

import { isAllowedHostHeader, isAllowedOrigin } from "../host/requestGuards";

const PORT = 5190;

describe("isAllowedHostHeader", () => {
	it.each([
		"localhost:5190",
		"127.0.0.1:5190",
		"[::1]:5190",
		"LocalHost:5190",
		"localhost",
		"[::1]",
	])("answers to %s", (hostHeader) => {
		expect(isAllowedHostHeader(hostHeader, PORT)).toBe(true);
	});

	it.each([
		["another port", "localhost:5191"],
		["an empty port", "localhost:"],
		["a rebound name", "attacker.example:5190"],
		["a name that only starts like ours", "127.0.0.1.nip.io:5190"],
		["IPv6 without its brackets", "::1"],
		["an unclosed bracket", "[::1:5190"],
		["text after the bracket that is no port", "[::1]5190"],
		["an empty header", ""],
	])("refuses %s", (_, hostHeader) => {
		expect(isAllowedHostHeader(hostHeader, PORT)).toBe(false);
	});

	it("refuses a request with no Host header at all", () => {
		expect(isAllowedHostHeader(undefined, PORT)).toBe(false);
	});
});

describe("isAllowedOrigin", () => {
	it.each([
		"http://localhost:5190",
		"http://127.0.0.1:5190",
		"http://[::1]:5190",
		"http://LOCALHOST:5190",
	])("answers to %s", (origin) => {
		expect(isAllowedOrigin(origin, PORT)).toBe(true);
	});

	it.each([
		["https, which the host does not serve", "https://localhost:5190"],
		["another port", "http://localhost:5191"],
		["a rebound name", "http://attacker.example:5190"],
		["the opaque origin of a sandboxed page", "null"],
		["a bare name taken as port 80", "http://localhost"],
	])("refuses %s", (_, origin) => {
		expect(isAllowedOrigin(origin, PORT)).toBe(false);
	});

	it("reads an origin without a port as port 80", () => {
		expect(isAllowedOrigin("http://localhost", 80)).toBe(true);
	});
});

// Covers the stepping a host does when the port it wants is taken. Real servers
// are listened with: the case under test is what the operating system says, which
// nothing else can stand in for.

import http from "node:http";
import type { AddressInfo } from "node:net";

import { afterEach, describe, expect, it } from "vitest";

import { listenOnAvailablePort } from "../host/listenOnAvailablePort";

const openServers: http.Server[] = [];

afterEach(async () => {
	for (const server of openServers.splice(0)) {
		await new Promise<void>((resolve) => {
			server.close(() => {
				resolve();
			});
		});
	}
});

/** A server that is closed again by the teardown, listening or not */
const createTestServer = (): http.Server => {
	const server = http.createServer();
	openServers.push(server);
	return server;
};

/** Takes a port nothing else is on, by letting the system pick one */
const listenOnAnyPort = async (): Promise<number> => {
	const server = createTestServer();
	await new Promise<void>((resolve, reject) => {
		server.once("error", reject);
		server.once("listening", resolve);
		server.listen(0, "127.0.0.1");
	});
	return (server.address() as AddressInfo).port;
};

describe("listenOnAvailablePort", () => {
	it("stays on the port it was given when nothing holds it", async () => {
		const freePort = await listenOnAnyPort();
		await new Promise<void>((resolve) => {
			openServers.splice(0, 1)[0].close(() => {
				resolve();
			});
		});
		const server = createTestServer();

		expect(await listenOnAvailablePort(server, freePort)).toBe(freePort);
		expect((server.address() as AddressInfo).port).toBe(freePort);
	});

	it("steps up past a port that is taken, and listens on the one it reports", async () => {
		// Another MCP process serving a canvas of its own is the everyday case here
		const takenPort = await listenOnAnyPort();
		const server = createTestServer();

		const port = await listenOnAvailablePort(server, takenPort);

		expect(port).toBeGreaterThan(takenPort);
		expect((server.address() as AddressInfo).port).toBe(port);
	});
});

import { describe, expect, it } from "vitest";

import type {
	ExtensionToWebviewMessage,
	WebviewToExtensionMessage,
} from "../../types/messages";
import { createWebviewBridgeRegistry } from "../webviewBridgeRegistry";

/** Document keys as the providers form them (`uri.toString()`). */
const documentKey = "file:///tmp/canvas.jis";
const otherDocumentKey = "file:///tmp/other.jis";

/** A commit as the Webview posts one. */
function updateFromWebview(data: string): WebviewToExtensionMessage {
	return { type: "update", data };
}

/** An update as the extension posts one. */
function updateToWebview(data: string): ExtensionToWebviewMessage {
	return { type: "update", data, docType: "json" };
}

/** An endpoint that only records what it was handed, standing in for a panel. */
function createRecordingEndpoint() {
	const received: WebviewToExtensionMessage[] = [];
	return {
		received,
		endpoint: {
			receiveFromWebview: (message: WebviewToExtensionMessage) => {
				received.push(message);
			},
		},
	};
}

describe("webviewBridgeRegistry", () => {
	it("delivers an injected message to the registered endpoint", () => {
		const registry = createWebviewBridgeRegistry();
		const { received, endpoint } = createRecordingEndpoint();
		registry.register(documentKey, endpoint);

		registry.postAsWebview(documentKey, updateFromWebview("{}"));

		expect(received).toEqual([updateFromWebview("{}")]);
	});

	it("keeps two documents' endpoints apart", () => {
		const registry = createWebviewBridgeRegistry();
		const first = createRecordingEndpoint();
		const second = createRecordingEndpoint();
		registry.register(documentKey, first.endpoint);
		registry.register(otherDocumentKey, second.endpoint);

		registry.postAsWebview(otherDocumentKey, updateFromWebview("{}"));

		expect(first.received).toEqual([]);
		expect(second.received).toEqual([updateFromWebview("{}")]);
	});

	it("throws when no editor is registered for the key", () => {
		const registry = createWebviewBridgeRegistry();

		expect(() =>
			registry.postAsWebview(documentKey, updateFromWebview("{}")),
		).toThrow(documentKey);
	});

	it("routes to the newest registration when a document is registered again, and a stale disposer cannot drop it", () => {
		const registry = createWebviewBridgeRegistry();
		const older = createRecordingEndpoint();
		const newer = createRecordingEndpoint();
		const olderRegistration = registry.register(documentKey, older.endpoint);
		registry.register(documentKey, newer.endpoint);

		registry.postAsWebview(documentKey, { type: "ready" });
		olderRegistration.dispose();
		registry.postAsWebview(documentKey, { type: "ready" });

		expect(older.received).toEqual([]);
		expect(newer.received).toEqual([{ type: "ready" }, { type: "ready" }]);
	});

	it("throws again once the registration is disposed", () => {
		const registry = createWebviewBridgeRegistry();
		const registration = registry.register(
			documentKey,
			createRecordingEndpoint().endpoint,
		);

		registration.dispose();

		expect(() =>
			registry.postAsWebview(documentKey, updateFromWebview("{}")),
		).toThrow(documentKey);
	});

	it("takes a registration again after the previous one was disposed", () => {
		const registry = createWebviewBridgeRegistry();
		registry
			.register(documentKey, createRecordingEndpoint().endpoint)
			.dispose();
		const reopened = createRecordingEndpoint();
		registry.register(documentKey, reopened.endpoint);

		registry.postAsWebview(documentKey, updateFromWebview("{}"));

		expect(reopened.received).toEqual([updateFromWebview("{}")]);
	});

	it("delivers the sent messages to a listener in post order", () => {
		const registry = createWebviewBridgeRegistry();
		const sent: ExtensionToWebviewMessage[] = [];
		registry.onMessageToWebview(documentKey, (message) => sent.push(message));

		// Before any register(): a message posted while the Webview is still
		// loading has to reach the listener too.
		registry.notifySentToWebview(documentKey, updateToWebview("first"));
		registry.notifySentToWebview(documentKey, updateToWebview("second"));

		expect(sent).toEqual([updateToWebview("first"), updateToWebview("second")]);
	});

	it("does not deliver another document's sent messages", () => {
		const registry = createWebviewBridgeRegistry();
		const sent: ExtensionToWebviewMessage[] = [];
		registry.onMessageToWebview(documentKey, (message) => sent.push(message));

		registry.notifySentToWebview(otherDocumentKey, updateToWebview("first"));

		expect(sent).toEqual([]);
	});

	it("stops delivering to a disposed listener", () => {
		const registry = createWebviewBridgeRegistry();
		const sent: ExtensionToWebviewMessage[] = [];
		const subscription = registry.onMessageToWebview(documentKey, (message) =>
			sent.push(message),
		);

		registry.notifySentToWebview(documentKey, updateToWebview("first"));
		subscription.dispose();
		registry.notifySentToWebview(documentKey, updateToWebview("second"));

		expect(sent).toEqual([updateToWebview("first")]);
	});

	it("delivers to every listener of one document", () => {
		const registry = createWebviewBridgeRegistry();
		const firstSent: ExtensionToWebviewMessage[] = [];
		const secondSent: ExtensionToWebviewMessage[] = [];
		registry.onMessageToWebview(documentKey, (message) =>
			firstSent.push(message),
		);
		registry.onMessageToWebview(documentKey, (message) =>
			secondSent.push(message),
		);

		registry.notifySentToWebview(documentKey, updateToWebview("first"));

		expect(firstSent).toEqual([updateToWebview("first")]);
		expect(secondSent).toEqual([updateToWebview("first")]);
	});

	it("lets a listener dispose itself while being notified", () => {
		const registry = createWebviewBridgeRegistry();
		const sent: ExtensionToWebviewMessage[] = [];
		const subscription = registry.onMessageToWebview(documentKey, (message) => {
			sent.push(message);
			subscription.dispose();
		});

		registry.notifySentToWebview(documentKey, updateToWebview("first"));
		registry.notifySentToWebview(documentKey, updateToWebview("second"));

		expect(sent).toEqual([updateToWebview("first")]);
	});
});

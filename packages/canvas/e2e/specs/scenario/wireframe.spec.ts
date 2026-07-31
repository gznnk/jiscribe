/**
 * Scenario: assemble a wireframe of a login screen.
 *
 * Stands in for "an AI drives the canvas app to draft a screen design". A
 * header, input fields and a primary button are placed using nothing but basic
 * operations that have their own specs, and the result is checked for the
 * expected makeup: part count plus labels.
 */

import { placeLabeledShape, type Rect } from "./buildDiagram";
import { test, expect } from "../../fixtures";

test.describe("scenario: wireframe", () => {
	test("assembles a wireframe of a login screen", async ({ canvas }) => {
		const header: Rect = { x: 520, y: 140, width: 400, height: 60 };
		const emailField: Rect = { x: 520, y: 260, width: 400, height: 50 };
		const passwordField: Rect = { x: 520, y: 340, width: 400, height: 50 };
		const loginButton: Rect = { x: 520, y: 440, width: 400, height: 60 };

		await placeLabeledShape(canvas, {
			tool: "Rectangle",
			rect: header,
			label: "MyApp",
		});
		await placeLabeledShape(canvas, {
			tool: "Rectangle",
			rect: emailField,
			label: "Email",
		});
		await placeLabeledShape(canvas, {
			tool: "Rectangle",
			rect: passwordField,
			label: "Password",
		});
		await placeLabeledShape(canvas, {
			tool: "Rectangle",
			rect: loginButton,
			label: "Log in",
			fill: "#2563eb",
		});

		// Makeup: exactly 4 parts.
		const objects = await canvas.captureObjects();
		const rects = objects.filter((obj) => obj.tag === "rect");
		expect(rects).toHaveLength(4);

		// Every part's label is on screen.
		const body = canvas.page.locator("body");
		for (const label of ["MyApp", "Email", "Password", "Log in"]) {
			await expect(body).toContainText(label);
		}

		// The primary button was given a different fill, so the parts cannot all share
		// one. Only the distinction is checked, not the exact normalized color value.
		const distinctFills = new Set(rects.map((rect) => rect.fill));
		expect(distinctFills.size).toBeGreaterThan(1);
	});
});

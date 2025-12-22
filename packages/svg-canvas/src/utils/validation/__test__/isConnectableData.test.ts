import type { ConnectableState } from "../../../types/state/shapes/ConnectableState";
import type { ConnectPointState } from "../../../types/state/shapes/ConnectPointState";
import { isConnectableState } from "../isConnectableState";

describe("isConnectableState", () => {
	// Valid ConnectableState object for testing
	const validConnectPointState: ConnectPointState = {
		id: "point1",
		type: "Rectangle",
		x: 0,
		y: 0,
		name: "connection-point",
	};

	const validConnectableState: ConnectableState = {
		connectEnabled: true,
		showConnectPoints: true,
		connectPoints: [validConnectPointState],
	};

	describe("Valid ConnectableState", () => {
		it("should return true for valid ConnectableState with showConnectPoints true", () => {
			expect(isConnectableState(validConnectableState)).toBe(true);
		});

		it("should return true for valid ConnectableState with showConnectPoints false", () => {
			const data: ConnectableState = {
				connectEnabled: true,
				showConnectPoints: false,
				connectPoints: [validConnectPointState],
			};
			expect(isConnectableState(data)).toBe(true);
		});

		it("should return true for valid ConnectableState with empty connectPoints array", () => {
			const data: ConnectableState = {
				connectEnabled: true,
				showConnectPoints: true,
				connectPoints: [],
			};
			expect(isConnectableState(data)).toBe(true);
		});

		it("should return true for valid ConnectableState with multiple connectPoints", () => {
			const data: ConnectableState = {
				connectEnabled: true,
				showConnectPoints: true,
				connectPoints: [
					validConnectPointState,
					{
						id: "point2",
						type: "Ellipse",
						x: 10,
						y: 10,
						name: "another-point",
					},
				],
			};
			expect(isConnectableState(data)).toBe(true);
		});
	});

	describe("Invalid data types", () => {
		it("should return false for null", () => {
			expect(isConnectableState(null)).toBe(false);
		});

		it("should return false for undefined", () => {
			expect(isConnectableState(undefined)).toBe(false);
		});

		it("should return false for string", () => {
			expect(isConnectableState("not an object")).toBe(false);
		});

		it("should return false for number", () => {
			expect(isConnectableState(123)).toBe(false);
		});

		it("should return false for boolean", () => {
			expect(isConnectableState(true)).toBe(false);
		});

		it("should return false for array", () => {
			expect(isConnectableState([])).toBe(false);
		});
	});

	describe("Missing required properties", () => {
		it("should return false for object without connectEnabled property", () => {
			const data = {
				showConnectPoints: true,
				connectPoints: [],
			};
			expect(isConnectableState(data)).toBe(false);
		});

		it("should return false for object without connectPoints property", () => {
			const data = {
				connectEnabled: true,
				showConnectPoints: true,
			};
			expect(isConnectableState(data)).toBe(false);
		});

		it("should return false for object without showConnectPoints property", () => {
			const data = {
				connectEnabled: true,
				connectPoints: [],
			};
			expect(isConnectableState(data)).toBe(false);
		});

		it("should return false for object with connectEnabled that is not a boolean", () => {
			const data = {
				connectEnabled: "true",
				showConnectPoints: true,
				connectPoints: [],
			};
			expect(isConnectableState(data)).toBe(false);
		});

		it("should return false for object with connectEnabled as null", () => {
			const data = {
				connectEnabled: null,
				showConnectPoints: true,
				connectPoints: [],
			};
			expect(isConnectableState(data)).toBe(false);
		});

		it("should return false for object with connectEnabled as undefined", () => {
			const data = {
				connectEnabled: undefined,
				showConnectPoints: true,
				connectPoints: [],
			};
			expect(isConnectableState(data)).toBe(false);
		});

		it("should return false for object with connectPoints that is not an array", () => {
			const data = {
				connectEnabled: true,
				showConnectPoints: true,
				connectPoints: "not an array",
			};
			expect(isConnectableState(data)).toBe(false);
		});

		it("should return false for object with connectPoints as null", () => {
			const data = {
				connectEnabled: true,
				showConnectPoints: true,
				connectPoints: null,
			};
			expect(isConnectableState(data)).toBe(false);
		});

		it("should return false for object with connectPoints as undefined", () => {
			const data = {
				connectEnabled: true,
				showConnectPoints: true,
				connectPoints: undefined,
			};
			expect(isConnectableState(data)).toBe(false);
		});

		it("should return false for object with showConnectPoints that is not a boolean", () => {
			const data = {
				connectEnabled: true,
				showConnectPoints: "true",
				connectPoints: [],
			};
			expect(isConnectableState(data)).toBe(false);
		});

		it("should return false for object with showConnectPoints as null", () => {
			const data = {
				connectEnabled: true,
				showConnectPoints: null,
				connectPoints: [],
			};
			expect(isConnectableState(data)).toBe(false);
		});

		it("should return false for object with showConnectPoints as undefined", () => {
			const data = {
				connectEnabled: true,
				showConnectPoints: undefined,
				connectPoints: [],
			};
			expect(isConnectableState(data)).toBe(false);
		});
	});

	describe("Edge cases", () => {
		it("should return true for object with additional properties", () => {
			const data = {
				connectEnabled: true,
				showConnectPoints: true,
				connectPoints: [],
				extraProperty: "should be ignored",
			};
			expect(isConnectableState(data)).toBe(true);
		});

		it("should return false for object missing connectEnabled", () => {
			const data = {
				showConnectPoints: true,
				connectPoints: [],
			};
			expect(isConnectableState(data)).toBe(false);
		});

		it("should return false for object missing showConnectPoints", () => {
			const data = {
				connectEnabled: true,
				connectPoints: [],
			};
			expect(isConnectableState(data)).toBe(false);
		});

		it("should return false for object missing connectPoints", () => {
			const data = {
				connectEnabled: true,
				showConnectPoints: true,
			};
			expect(isConnectableState(data)).toBe(false);
		});
	});

	/**
	 * Validation completeness test.
	 * This test ensures that if ConnectableState type definition changes,
	 * the validation function needs to be updated accordingly.
	 *
	 * If this test fails, it means:
	 * 1. ConnectableState type has been modified
	 * 2. isConnectableState validation function needs to be updated
	 * 3. This test suite needs to be updated to include new properties
	 */
	describe("Validation completeness", () => {
		it("should validate all required properties of ConnectableState type", () => {
			// This test creates an object that should match ConnectableState exactly
			const completeValidData: ConnectableState = {
				connectEnabled: true,
				showConnectPoints: true,
				connectPoints: [validConnectPointState],
			} as const satisfies ConnectableState;

			// Test that our validator accepts the complete valid data
			expect(isConnectableState(completeValidData)).toBe(true);

			// Test missing each required property one by one
			// If ConnectableState gains new required properties, add tests here

			// Missing connectEnabled - should fail
			const missingConnectEnabled = {
				showConnectPoints: true,
				connectPoints: [validConnectPointState],
			};
			expect(isConnectableState(missingConnectEnabled)).toBe(false);

			// Missing showConnectPoints - should fail
			const missingShowConnectPoints = {
				connectEnabled: true,
				connectPoints: [validConnectPointState],
			};
			expect(isConnectableState(missingShowConnectPoints)).toBe(false);

			// Missing connectPoints - should fail
			const missingConnectPoints = {
				connectEnabled: true,
				showConnectPoints: true,
			};
			expect(isConnectableState(missingConnectPoints)).toBe(false);
		});

		/**
		 * Property coverage test.
		 * This test documents which properties are currently being validated.
		 * When ConnectableState type changes, update this test to maintain coverage.
		 */
		it("should document current validation coverage", () => {
			// Current implementation validates:
			// 1. Object is not null
			// 2. Object is an object type
			// 3. Has 'connectEnabled' property
			// 4. connectEnabled is a boolean
			// 5. Has 'showConnectPoints' property
			// 6. showConnectPoints is a boolean
			// 7. Has 'connectPoints' property
			// 8. connectPoints is an array

			// Properties NOT currently validated:
			// - connectPoints array contents/structure
			// - connectPoints array element types

			const minimalValidObject = {
				connectEnabled: true,
				showConnectPoints: true,
				connectPoints: [], // All three properties are now validated
			};

			expect(isConnectableState(minimalValidObject)).toBe(true);

			// This test serves as documentation of current behavior
			// and will need updates when validation logic is enhanced
		});

		/**
		 * Future-proofing test.
		 * If ConnectableState type definition is extended with new required properties,
		 * this test will help identify that the validator needs updating.
		 */
		it("should handle future ConnectableState extensions", () => {
			// Create a type-safe object that satisfies current ConnectableState
			const currentValidData: ConnectableState = {
				connectEnabled: true,
				showConnectPoints: false,
				connectPoints: [],
			};

			// This should always pass for current valid data
			expect(isConnectableState(currentValidData)).toBe(true);

			// When new required properties are added to ConnectableState:
			// 1. TypeScript will error on the above object creation
			// 2. Add the new properties to make it compile
			// 3. Update isConnectableState function to validate new properties
			// 4. Add specific tests for the new properties
		});
	});
});

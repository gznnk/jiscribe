/**
 * Test-only entry (`@workspace/canvas-sdk/testing`): suites shared by the shape
 * plugins' unit tests. Kept out of `.` / `./doc` so no runtime bundle can reach it.
 *
 * vitest is imported directly here (devDependency); publishing this package to npm
 * would require making it a peerDependency.
 */

export { createParseCheckSuite } from "./testing/createParseCheckSuite";
export type {
	ParseCheckAcceptCase,
	ParseCheckDoc,
	ParseCheckRejectCase,
	ParseCheckSuiteParams,
} from "./testing/createParseCheckSuite";

import js from "@eslint/js";
import prettierConfig from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
	{
		ignores: ["**/dist", "**/node_modules", ".dependency-graph"],
	},
	{
		extends: [
			js.configs.recommended,
			...tseslint.configs.recommended,
			prettierConfig,
		],
		files: ["**/*.{js,jsx,mjs,cjs,ts,tsx}"],
		languageOptions: {
			ecmaVersion: 2023,
			globals: globals.browser,
			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
			},
		},
		plugins: {
			react,
			"react-hooks": reactHooks,
			import: importPlugin,
		},
		settings: {
			react: {
				version: "detect",
			},
		},
		rules: {
			// React rules
			...react.configs.recommended.rules,
			...react.configs["jsx-runtime"].rules,
			"react/prop-types": "off",

			// React hooks rules
			...reactHooks.configs.recommended.rules,
			"react-hooks/set-state-in-effect": "off",
			"react-hooks/refs": "off",
			"react-hooks/immutability": "off",

			// Import rules
			"import/order": [
				"error",
				{
					groups: [
						"builtin",
						"external",
						"internal",
						["parent", "sibling"],
						"index",
					],
					"newlines-between": "always",
					alphabetize: {
						order: "asc",
						caseInsensitive: true,
					},
				},
			],
			"import/newline-after-import": "error",
			"import/no-duplicates": "error",
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{
							group: ["@jiscribe/*/src/*"],
							message:
								"Import through the package root (for example @jiscribe/geometry). Reaching into src/ is not allowed.",
						},
					],
				},
			],

			// TypeScript rules
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
				},
			],
			"@typescript-eslint/no-explicit-any": "error",
			"@typescript-eslint/consistent-type-imports": [
				"error",
				{
					prefer: "type-imports",
					disallowTypeAnnotations: true,
					fixStyle: "separate-type-imports",
				},
			],

			// General rules
			"prefer-const": "error",
			"no-var": "error",
			"object-shorthand": "error",
			"prefer-template": "error",
			curly: ["error", "all"],
		},
	},
	{
		// Node.js build scripts (esbuild): they run in Node, not in a browser
		files: ["**/*.mjs", "**/*.cjs"],
		languageOptions: {
			globals: globals.node,
		},
	},
	{
		// Playwright e2e: excluded because a fixture's use() is mistaken for a React Hook
		files: ["**/e2e/**", "**/playwright*.config.ts"],
		rules: {
			"react-hooks/rules-of-hooks": "off",
		},
	},
	{
		// The canvas headless (doc) layer: ban react / @emotion and relative reach into
		// the presentation, controller and state layers, so UI independence is enforced
		// structurally (consumed through ./doc and ./unstable-doc).
		// __tests__ is excluded because registration tests use the test helpers from
		// controllers/registries.
		files: [
			"packages/canvas/src/doc.ts",
			"packages/canvas/src/unstable-doc.ts",
			"packages/canvas/src/schemas/**",
			"packages/canvas/src/docOps/**",
		],
		ignores: ["**/__tests__/**"],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{
							group: ["@jiscribe/*/src/*"],
							message:
								"Import through the package root. Reaching into src/ is not allowed.",
						},
						{
							group: ["react", "react/*", "react-dom", "react-dom/*"],
							message:
								"Do not pull in react / react-dom; it would break the headless (doc) layer.",
						},
						{
							group: ["@emotion/*"],
							message:
								"Do not pull in @emotion; it would break the headless (doc) layer.",
						},
						{
							group: [
								"**/presentations/**",
								"**/controllers/**",
								"**/states/**",
							],
							message:
								"The headless (doc) layer cannot depend on the presentation / controller / state layers.",
						},
					],
				},
			],
		},
	},
	{
		// The canvas Doc<->State boundary: double casts (as unknown as) are banned (#207).
		// Brand crossings are collected in states/objects/utils/rebrand.ts, which keeps
		// field type checking intact. Only the two files listed in ignores are exempt:
		// the features-generic mapper bodies are beyond what TypeScript can check in
		// principle (conditional types are not reduced while the type argument is
		// unresolved), which each file states in its JSDoc.
		// When adding an exemption, write down on the spot why it cannot be checked.
		files: ["packages/canvas/src/states/**", "packages/canvas/src/schemas/**"],
		ignores: [
			"**/__tests__/**",
			"packages/canvas/src/states/objects/base/FrameMapper.ts",
			"packages/canvas/src/states/objects/base/PolyMapper.ts",
		],
		rules: {
			"no-restricted-syntax": [
				"error",
				{
					selector:
						'TSAsExpression > TSAsExpression[typeAnnotation.type="TSUnknownKeyword"]',
					message:
						"Double casts (as unknown as) are not allowed. Use rebrand<T>() when all you need is to attach a brand (#207).",
				},
			],
		},
	},
	{
		// canvas-sdk is a pseudo-external consumer of canvas
		// (packages/canvas/docs/13-authoring-plugins.md): like a plugin, it only sees
		// the public canvas entry points.
		files: ["packages/canvas-sdk/src/**"],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{
							group: [
								"@jiscribe/canvas/**",
								"!@jiscribe/canvas/doc",
								"!@jiscribe/canvas/unstable",
								"!@jiscribe/canvas/unstable-doc",
								"**/canvas/src/**",
							],
							message:
								"The internals of canvas are out of reach. Only @jiscribe/canvas and ./doc, ./unstable, ./unstable-doc are available.",
						},
						{
							group: ["@jiscribe/*/src/*"],
							message:
								"Import through the package root. Reaching into src/ is not allowed.",
						},
					],
				},
			],
		},
	},
	{
		// The canvas-sdk headless (doc) layer: ban the canvas UI entry points
		// (root / unstable), react / @emotion, and reach into this package's own
		// presentation layer.
		files: [
			"packages/canvas-sdk/src/doc.ts",
			"packages/canvas-sdk/src/schema/**",
		],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					paths: [
						{
							name: "@jiscribe/canvas",
							message:
								"This would break the headless (doc) layer. Take types and values from @jiscribe/canvas/doc.",
						},
						{
							name: "@jiscribe/canvas/unstable",
							message:
								"This would break the headless (doc) layer. Use @jiscribe/canvas/unstable-doc.",
						},
					],
					patterns: [
						{
							group: ["@jiscribe/*/src/*", "**/canvas/src/**"],
							message:
								"Import through the package root. Reaching into src/ is not allowed.",
						},
						{
							group: ["react", "react/*", "react-dom", "react-dom/*"],
							message:
								"Do not pull in react / react-dom; it would break the headless (doc) layer.",
						},
						{
							group: ["@emotion/*"],
							message:
								"Do not pull in @emotion; it would break the headless (doc) layer.",
						},
						{
							group: ["**/presentation/**"],
							message:
								"The headless (doc) layer cannot depend on the presentation layer.",
						},
					],
				},
			],
		},
	},
	{
		// Plugins do not look at the canvas unstable entry points directly: the
		// shape-authoring kit (@jiscribe/canvas-sdk) is their only contact with the
		// public canvas surface.
		files: ["plugins/*/src/**"],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					paths: [
						{
							name: "@jiscribe/canvas/unstable",
							message:
								"Use @jiscribe/canvas-sdk instead (@jiscribe/canvas-sdk/doc for headless).",
						},
						{
							name: "@jiscribe/canvas/unstable-doc",
							message: "Use @jiscribe/canvas-sdk/doc instead.",
						},
					],
					patterns: [
						{
							group: ["@jiscribe/*/src/*"],
							message:
								"Import through the package root. Reaching into src/ is not allowed.",
						},
					],
				},
			],
		},
	},
	{
		// The plugin headless (schema / doc) layer: ban the canvas / canvas-sdk UI entry
		// points, react / @emotion, and relative reach into this package's own UI layer;
		// only @jiscribe/canvas/doc and @jiscribe/canvas-sdk/doc are allowed.
		files: ["plugins/*/src/schema/**", "plugins/*/src/doc.ts"],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					paths: [
						{
							name: "@jiscribe/canvas",
							message:
								"This would break the headless (doc) layer. Take types and values from @jiscribe/canvas/doc.",
						},
						{
							name: "@jiscribe/canvas/unstable",
							message:
								"This would break the headless (doc) layer. Use @jiscribe/canvas-sdk/doc.",
						},
						{
							name: "@jiscribe/canvas/unstable-doc",
							message: "Use @jiscribe/canvas-sdk/doc instead.",
						},
						{
							name: "@jiscribe/canvas-sdk",
							message:
								"This would break the headless (doc) layer. Use @jiscribe/canvas-sdk/doc.",
						},
					],
					patterns: [
						{
							group: ["@jiscribe/*/src/*"],
							message:
								"Import through the package root. Reaching into src/ is not allowed.",
						},
						{
							group: ["react", "react/*", "react-dom", "react-dom/*"],
							message:
								"Do not pull in react / react-dom; it would break the headless (doc) layer.",
						},
						{
							group: ["@emotion/*"],
							message:
								"Do not pull in @emotion; it would break the headless (doc) layer.",
						},
						{
							group: [
								"**/presentation/**",
								"**/state/**",
								"**/stencil/**",
								"**/controls/**",
								"**/menu/**",
							],
							message:
								"The headless (doc) layer cannot depend on the presentation / state / stencil / controls / menu layers.",
						},
					],
				},
			],
		},
	},
);

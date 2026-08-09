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
								"パッケージルート（例: @jiscribe/geometry）経由でインポートしてください。src/ 内部への直接到達は禁止です。",
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
		// Node.js ビルドスクリプト（esbuild）: ブラウザではなく Node 環境で実行される
		files: ["**/*.mjs", "**/*.cjs"],
		languageOptions: {
			globals: globals.node,
		},
	},
	{
		// Playwright e2e: fixture の use() を React Hook と誤認するため除外
		files: ["**/e2e/**", "**/playwright*.config.ts"],
		rules: {
			"react-hooks/rules-of-hooks": "off",
		},
	},
	{
		// canvas の headless（doc）層: react / @emotion や presentation・controller・state
		// 層への相対到達を禁止し、UI 非依存を構造的に守る（./doc・./unstable-doc から使う）。
		// __tests__ は登録テストで controllers/registries の test ヘルパーを使うため除外。
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
								"パッケージルート経由でインポートしてください。src/ 内部への直接到達は禁止です。",
						},
						{
							group: ["react", "react/*", "react-dom", "react-dom/*"],
							message:
								"headless（doc 層）を守るため react / react-dom を引き込まないでください。",
						},
						{
							group: ["@emotion/*"],
							message:
								"headless（doc 層）を守るため @emotion を引き込まないでください。",
						},
						{
							group: [
								"**/presentations/**",
								"**/controllers/**",
								"**/states/**",
							],
							message:
								"headless（doc 層）は presentation / controller / state 層に依存できません。",
						},
					],
				},
			],
		},
	},
	{
		// canvas の Doc↔State 境界: 二重キャスト（as unknown as）を禁止する（#207）。
		// ブランド越えは states/objects/utils/rebrand.ts に集約済みで、フィールドの
		// 型検査を捨てずに書ける。ignores に挙がっている2ファイルだけが例外で、
		// features ジェネリックな mapper 本体は TypeScript が原理的に検査できない
		// （型引数が未解決の間は条件型が簡約されない）ため各ファイルの JSDoc で明示する。
		// 例外を増やすときは、なぜ検査不能なのかをその場に書くこと。
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
						"二重キャスト（as unknown as）は禁止です。ブランドを付けるだけなら rebrand<T>() を使ってください（#207）。",
				},
			],
		},
	},
	{
		// canvas-sdk は canvas の疑似外部（docs/05_extensibility/canvas-sdk-plan.md §2）:
		// プラグインと同じく canvas の公開エントリだけを見る。
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
								"canvas の内部へは到達できません。@jiscribe/canvas と ./doc・./unstable・./unstable-doc のみ使えます。",
						},
						{
							group: ["@jiscribe/*/src/*"],
							message:
								"パッケージルート経由でインポートしてください。src/ 内部への直接到達は禁止です。",
						},
					],
				},
			],
		},
	},
	{
		// canvas-sdk の headless（doc）層: canvas の UI 入口（root / unstable）と
		// react / @emotion、自パッケージ内 presentation 層への到達を禁止する。
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
								"headless（doc 層）を守るため。型・値は @jiscribe/canvas/doc を使ってください。",
						},
						{
							name: "@jiscribe/canvas/unstable",
							message:
								"headless（doc 層）を守るため。@jiscribe/canvas/unstable-doc を使ってください。",
						},
					],
					patterns: [
						{
							group: ["@jiscribe/*/src/*", "**/canvas/src/**"],
							message:
								"パッケージルート経由でインポートしてください。src/ 内部への直接到達は禁止です。",
						},
						{
							group: ["react", "react/*", "react-dom", "react-dom/*"],
							message:
								"headless（doc 層）を守るため react / react-dom を引き込まないでください。",
						},
						{
							group: ["@emotion/*"],
							message:
								"headless（doc 層）を守るため @emotion を引き込まないでください。",
						},
						{
							group: ["**/presentation/**"],
							message: "headless（doc 層）は presentation 層に依存できません。",
						},
					],
				},
			],
		},
	},
	{
		// プラグインは canvas の unstable 系を直接見ない: 量産キット
		// （@jiscribe/canvas-sdk）が canvas 公開面との唯一の接点になる。
		files: ["plugins/*/src/**"],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					paths: [
						{
							name: "@jiscribe/canvas/unstable",
							message:
								"@jiscribe/canvas-sdk を使ってください（headless は @jiscribe/canvas-sdk/doc）。",
						},
						{
							name: "@jiscribe/canvas/unstable-doc",
							message: "@jiscribe/canvas-sdk/doc を使ってください。",
						},
					],
					patterns: [
						{
							group: ["@jiscribe/*/src/*"],
							message:
								"パッケージルート経由でインポートしてください。src/ 内部への直接到達は禁止です。",
						},
					],
				},
			],
		},
	},
	{
		// プラグインの headless（schema / doc）層: canvas / canvas-sdk の UI 入口と
		// react / @emotion、自パッケージ内 UI 層への相対到達を禁止し、
		// @jiscribe/canvas/doc・@jiscribe/canvas-sdk/doc のみ許可する。
		files: ["plugins/*/src/schema/**", "plugins/*/src/doc.ts"],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					paths: [
						{
							name: "@jiscribe/canvas",
							message:
								"headless（doc 層）を守るため。型・値は @jiscribe/canvas/doc を使ってください。",
						},
						{
							name: "@jiscribe/canvas/unstable",
							message:
								"headless（doc 層）を守るため。@jiscribe/canvas-sdk/doc を使ってください。",
						},
						{
							name: "@jiscribe/canvas/unstable-doc",
							message: "@jiscribe/canvas-sdk/doc を使ってください。",
						},
						{
							name: "@jiscribe/canvas-sdk",
							message:
								"headless（doc 層）を守るため。@jiscribe/canvas-sdk/doc を使ってください。",
						},
					],
					patterns: [
						{
							group: ["@jiscribe/*/src/*"],
							message:
								"パッケージルート経由でインポートしてください。src/ 内部への直接到達は禁止です。",
						},
						{
							group: ["react", "react/*", "react-dom", "react-dom/*"],
							message:
								"headless（doc 層）を守るため react / react-dom を引き込まないでください。",
						},
						{
							group: ["@emotion/*"],
							message:
								"headless（doc 層）を守るため @emotion を引き込まないでください。",
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
								"headless（doc 層）は presentation / state / stencil / controls / menu 層に依存できません。",
						},
					],
				},
			],
		},
	},
);

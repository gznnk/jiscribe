export default {
	preset: "ts-jest",
	testEnvironment: "jsdom",
	moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
	testMatch: ["**/?(*.)+(spec|test).[tj]s?(x)"],
	moduleNameMapper: {
		"\\.(css|less|scss|sass)$": "identity-obj-proxy",
	},
	transform: {
		"^.+\\.(ts|tsx)$": [
			"ts-jest",
			{
				tsconfig: {
					jsx: "react-jsx",
				},
			},
		],
	},
};

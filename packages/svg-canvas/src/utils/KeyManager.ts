class KeyManager {
	public static readonly OPENAI_API_KEY_STORAGE = "openai_api_key";
	public static readonly GEMINI_API_KEY_STORAGE = "gemini_api_key";

	private storageKey: string;

	constructor(storageKey: string) {
		this.storageKey = storageKey;
	}

	// Save the API key to localStorage
	saveKey(apiKey: string): void {
		localStorage.setItem(this.storageKey, apiKey);
	}

	// Load the API key from localStorage
	loadKey(): string | null {
		return localStorage.getItem(this.storageKey);
	}

	// Remove the API key from localStorage
	removeKey(): void {
		localStorage.removeItem(this.storageKey);
	}
}

export const OpenAiKeyManager = new KeyManager(
	KeyManager.OPENAI_API_KEY_STORAGE,
);

export const GeminiKeyManager = new KeyManager(
	KeyManager.GEMINI_API_KEY_STORAGE,
);

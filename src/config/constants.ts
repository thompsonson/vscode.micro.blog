/**
 * Configuration constants for the Micro.blog VS Code extension
 */

export const API_ENDPOINTS = {
	TOKEN_VERIFY: 'https://micro.blog/account/verify',
	MICROPUB_VERIFICATION: 'https://micro.blog/micropub',
	MICROPUB_CONFIG: 'https://micro.blog/micropub?q=config',
	MICROPUB_SOURCE: 'https://micro.blog/micropub?q=source'
} as const;

export const STORAGE_KEYS = {
	BLOG_CONFIG: 'microblog.blog',
	CREDENTIALS: 'microblog.credentials'
} as const;

export const SETTINGS = {
	API_ENDPOINT: 'microblog.apiEndpoint'
} as const;

export const TIMEOUTS = {
	API_REQUEST: 10000, // 10 seconds
	AUTH_VALIDATION: 15000 // 15 seconds
} as const;
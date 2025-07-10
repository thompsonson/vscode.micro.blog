export class Credentials {
	constructor(public readonly appToken: string) {
		if (!appToken || !appToken.trim()) {
			throw new Error('App token is required');
		}
	}

	getAuthorizationHeader(): string {
		return `Bearer ${this.appToken}`;
	}

	static isValid(token: string): boolean {
		return !!(token && token.trim().length > 0);
	}
}
export class Blog {
	constructor(
		public readonly domain: string,
		public readonly name: string,
		public readonly apiEndpoint: string
	) {
		if (!domain || !domain.trim()) {
			throw new Error('Blog domain is required');
		}
		if (!apiEndpoint || !apiEndpoint.trim()) {
			throw new Error('API endpoint is required');
		}
	}

	static create(domain: string, name?: string): Blog {
		const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
		// Always use the main micro.blog API endpoint - personal domains don't support micropub
		const apiEndpoint = 'https://micro.blog/micropub';
		const blogName = name || cleanDomain;
		
		return new Blog(cleanDomain, blogName, apiEndpoint);
	}
}
import * as https from 'https';
import { URL } from 'url';
import { Post, PostProperties } from '../domain/Post';
import { Credentials } from '../domain/Credentials';
import { TIMEOUTS } from '../config/constants';

export interface MicropubResponse {
	type: string[];
	properties: PostProperties;
	url?: string;
}

export class ApiClient {
	constructor(private credentials: Credentials) {}

	async fetchPosts(endpoint: string): Promise<Post[]> {
		const url = new URL(endpoint);
		url.searchParams.set('q', 'source');
		
		console.log(`[Micro.blog] Fetching posts from: ${url.hostname}${url.pathname}`);
		
		return new Promise((resolve, reject) => {
			const options = {
				hostname: url.hostname,
				port: url.port || 443,
				path: url.pathname + url.search,
				method: 'GET',
				headers: {
					'Authorization': this.credentials.getAuthorizationHeader(),
					'Accept': 'application/json'
				}
			};

			const req = https.request(options, (res) => {
				let data = '';
				
				res.on('data', (chunk) => {
					data += chunk;
				});
				
				res.on('end', () => {
					try {
						if (res.statusCode === 200) {
							const response = JSON.parse(data);
							const posts = this.parseMicropubResponse(response);
							console.log(`[Micro.blog] Successfully fetched ${posts.length} posts`);
							resolve(posts);
						} else {
							console.error(`[Micro.blog] API request failed with status ${res.statusCode}`);
							reject(new Error(`API request failed with status ${res.statusCode}`));
						}
					} catch (error) {
						console.error(`[Micro.blog] Failed to parse API response:`, error);
						reject(new Error(`Failed to parse API response: ${error}`));
					}
				});
			});

			req.on('error', (error) => {
				console.error(`[Micro.blog] Network error:`, error);
				reject(new Error(`Network error: ${error.message}`));
			});

			req.setTimeout(TIMEOUTS.API_REQUEST, () => {
				req.destroy();
				reject(new Error('Request timeout'));
			});

			req.end();
		});
	}

	async validateCredentials(endpoint: string): Promise<boolean> {
		try {
			await this.fetchPosts(endpoint);
			return true;
		} catch (error) {
			console.error(`[Micro.blog] Credential validation failed:`, error);
			return false;
		}
	}

	private parseMicropubResponse(response: any): Post[] {
		if (!response || !Array.isArray(response.items)) {
			return [];
		}

		return response.items
			.filter((item: any) => item.type && item.type.includes('h-entry'))
			.map((item: any) => {
				const properties: PostProperties = {
					content: this.extractContent(item.properties),
					name: this.extractProperty(item.properties, 'name'),
					published: this.extractProperty(item.properties, 'published'),
					'post-status': this.extractProperty(item.properties, 'post-status') as 'published' | 'draft',
					category: this.extractArrayProperty(item.properties, 'category')
				};

				return new Post(properties, item.properties?.url?.[0]);
			});
	}

	private extractContent(properties: any): string {
		if (properties.content) {
			const content = properties.content[0];
			if (typeof content === 'string') {
				return content;
			}
			if (content && content.html) {
				return content.html;
			}
			if (content && content.value) {
				return content.value;
			}
		}
		return '';
	}

	private extractProperty(properties: any, key: string): string | undefined {
		return properties[key]?.[0];
	}

	private extractArrayProperty(properties: any, key: string): string[] | undefined {
		return properties[key];
	}
}
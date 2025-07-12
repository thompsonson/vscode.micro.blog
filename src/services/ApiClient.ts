import * as https from 'https';
import { URL } from 'url';
import { Post, PostProperties } from '../domain/Post';
import { Page, PageProperties } from '../domain/Page';
import { Credentials } from '../domain/Credentials';
import { UploadFile } from '../domain/UploadFile';
import { TIMEOUTS } from '../config/constants';
import { MicropubPost } from './PublishingService';

export interface MicropubResponse {
	type: string[];
	properties: PostProperties;
	url?: string;
}

export interface VerifyTokenResponse {
	name: string;
	username: string;
	avatar?: string;
	error?: string;
}

export interface PublishResponse {
	url?: string;
	error?: string;
}

export interface MicropubConfig {
	'media-endpoint'?: string;
	'syndicate-to'?: Array<{
		uid: string;
		name: string;
	}>;
}

export interface UploadResponse {
	url?: string;
	error?: string;
}

export interface MediaQueryResponse {
	items: Array<{
		url: string;
		published: string;
		alt?: string;
		sizes?: {
			large: string;
			medium?: string;
			small?: string;
		};
		cdn?: {
			large: string;
			medium?: string;
			small?: string;
		};
	}>;
}

export interface ContentResponse {
	posts: Post[];
	pages: Page[];
}

export class ApiClient {
	constructor(private credentials: Credentials) {}

	async fetchPosts(endpoint: string): Promise<Post[]> {
		const content = await this.fetchContent(endpoint);
		return content.posts;
	}

	async fetchPages(endpoint: string): Promise<Page[]> {
		const url = new URL(endpoint);
		url.searchParams.set('q', 'source');
		url.searchParams.set('mp-channel', 'pages');
		
		console.log(`[Micro.blog] Fetching pages from: ${url.hostname}${url.pathname}${url.search}`);
		
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
							const pages = this.parsePagesResponse(response);
							console.log(`[Micro.blog] Successfully fetched ${pages.length} pages`);
							resolve(pages);
						} else {
							console.error(`[Micro.blog] Pages API request failed with status ${res.statusCode}`);
							reject(new Error(`Pages API request failed with status ${res.statusCode}`));
						}
					} catch (error) {
						console.error(`[Micro.blog] Failed to parse pages API response:`, error);
						reject(new Error(`Failed to parse pages API response: ${error}`));
					}
				});
			});

			req.on('error', (error) => {
				console.error(`[Micro.blog] Network error during pages fetch:`, error);
				reject(new Error(`Network error: ${error.message}`));
			});

			req.setTimeout(TIMEOUTS.API_REQUEST, () => {
				req.destroy();
				reject(new Error('Pages request timeout'));
			});

			req.end();
		});
	}

	async fetchContent(endpoint: string): Promise<ContentResponse> {
		const url = new URL(endpoint);
		url.searchParams.set('q', 'source');
		
		console.log(`[Micro.blog] Fetching content from: ${url.hostname}${url.pathname}`);
		
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
							const content = this.parseContentResponse(response);
							console.log(`[Micro.blog] Successfully fetched ${content.posts.length} posts and ${content.pages.length} pages`);
							resolve(content);
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

	async verifyToken(endpoint: string): Promise<VerifyTokenResponse> {
		const url = new URL(endpoint);
		
		console.log(`[Micro.blog] Verifying token at: ${url.hostname}${url.pathname}`);
		
		return new Promise((resolve, reject) => {
			const postData = `token=${encodeURIComponent(this.credentials.appToken)}`;
			
			const options = {
				hostname: url.hostname,
				port: url.port || 443,
				path: url.pathname,
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'Content-Length': Buffer.byteLength(postData),
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
						const response = JSON.parse(data) as VerifyTokenResponse;
						
						if (response.error) {
							console.error(`[Micro.blog] Token verification failed: ${response.error}`);
							reject(new Error(response.error));
						} else {
							console.log(`[Micro.blog] Token verified for user: ${response.name} (@${response.username})`);
							resolve(response);
						}
					} catch (error) {
						console.error(`[Micro.blog] Failed to parse verification response:`, error);
						reject(new Error(`Failed to parse verification response: ${error}`));
					}
				});
			});

			req.on('error', (error) => {
				console.error(`[Micro.blog] Network error during verification:`, error);
				reject(new Error(`Network error: ${error.message}`));
			});

			req.setTimeout(TIMEOUTS.AUTH_VALIDATION, () => {
				req.destroy();
				reject(new Error('Token verification timeout'));
			});

			req.write(postData);
			req.end();
		});
	}

	async getConfig(endpoint: string): Promise<MicropubConfig> {
		const url = new URL(endpoint);
		url.searchParams.set('q', 'config');
		
		console.log(`[Micro.blog] Getting config from: ${url.hostname}${url.pathname}`);
		
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
							const config = JSON.parse(data) as MicropubConfig;
							console.log(`[Micro.blog] Config retrieved successfully`);
							resolve(config);
						} else {
							console.error(`[Micro.blog] Config request failed with status ${res.statusCode}`);
							reject(new Error(`Config request failed with status ${res.statusCode}`));
						}
					} catch (error) {
						console.error(`[Micro.blog] Failed to parse config response:`, error);
						reject(new Error(`Failed to parse config response: ${error}`));
					}
				});
			});

			req.on('error', (error) => {
				console.error(`[Micro.blog] Network error during config request:`, error);
				reject(new Error(`Network error: ${error.message}`));
			});

			req.setTimeout(TIMEOUTS.API_REQUEST, () => {
				req.destroy();
				reject(new Error('Config request timeout'));
			});

			req.end();
		});
	}

	async uploadMedia(mediaEndpoint: string, fileData: Buffer, fileName: string, mimeType: string): Promise<UploadResponse> {
		const url = new URL(mediaEndpoint);
		
		console.log(`[Micro.blog] Uploading media: ${fileName} to ${url.hostname}${url.pathname}`);
		
		return new Promise((resolve, reject) => {
			// Create multipart form data boundary
			const boundary = `----formdata-boundary-${Date.now()}`;
			
			// Build multipart body
			const formData = [
				`--${boundary}`,
				`Content-Disposition: form-data; name="file"; filename="${fileName}"`,
				`Content-Type: ${mimeType}`,
				'',
				fileData.toString('binary'),
				`--${boundary}--`
			].join('\r\n');
			
			const postBody = Buffer.from(formData, 'binary');
			
			const options = {
				hostname: url.hostname,
				port: url.port || 443,
				path: url.pathname,
				method: 'POST',
				headers: {
					'Authorization': this.credentials.getAuthorizationHeader(),
					'Content-Type': `multipart/form-data; boundary=${boundary}`,
					'Content-Length': postBody.length
				}
			};

			const req = https.request(options, (res) => {
				let data = '';
				
				res.on('data', (chunk) => {
					data += chunk;
				});
				
				res.on('end', () => {
					try {
						if (res.statusCode === 201 || res.statusCode === 202) {
							// Successful upload - URL should be in Location header
							const location = res.headers.location as string;
							if (location) {
								console.log(`[Micro.blog] Media uploaded successfully: ${location}`);
								resolve({ url: location });
							} else {
								// Try to parse JSON response for URL
								try {
									const response = JSON.parse(data);
									if (response.url) {
										console.log(`[Micro.blog] Media uploaded successfully: ${response.url}`);
										resolve({ url: response.url });
									} else {
										reject(new Error('Upload successful but no URL returned'));
									}
								} catch {
									reject(new Error('Upload successful but no URL in Location header or response body'));
								}
							}
						} else {
							console.error(`[Micro.blog] Media upload failed with status ${res.statusCode}`);
							reject(new Error(`Media upload failed with status ${res.statusCode}`));
						}
					} catch (error) {
						console.error(`[Micro.blog] Failed to process upload response:`, error);
						reject(new Error(`Failed to process upload response: ${error}`));
					}
				});
			});

			req.on('error', (error) => {
				console.error(`[Micro.blog] Network error during media upload:`, error);
				reject(new Error(`Network error: ${error.message}`));
			});

			req.setTimeout(TIMEOUTS.API_REQUEST * 3, () => { // Longer timeout for file uploads
				req.destroy();
				reject(new Error('Media upload timeout'));
			});

			req.write(postBody);
			req.end();
		});
	}

	async publishPost(postData: MicropubPost): Promise<PublishResponse> {
		const url = new URL('https://micro.blog/micropub');
		
		console.log(`[Micro.blog] Publishing post: ${postData.name}`);
		
		return new Promise((resolve, reject) => {
			// Convert post data to form-encoded format
			const formData = new URLSearchParams();
			formData.append('h', postData.h);
			formData.append('name', postData.name);
			formData.append('content', postData.content);
			
			const postBody = formData.toString();
			
			const options = {
				hostname: url.hostname,
				port: url.port || 443,
				path: url.pathname,
				method: 'POST',
				headers: {
					'Authorization': this.credentials.getAuthorizationHeader(),
					'Content-Type': 'application/x-www-form-urlencoded',
					'Content-Length': Buffer.byteLength(postBody),
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
						if (res.statusCode === 201 || res.statusCode === 202) {
							// Successful post creation
							const location = res.headers.location as string;
							console.log(`[Micro.blog] Post published successfully: ${location || 'No location header'}`);
							resolve({ url: location });
						} else {
							console.error(`[Micro.blog] Publishing failed with status ${res.statusCode}`);
							reject(new Error(`Publishing failed with status ${res.statusCode}`));
						}
					} catch (error) {
						console.error(`[Micro.blog] Failed to process publish response:`, error);
						reject(new Error(`Failed to process publish response: ${error}`));
					}
				});
			});

			req.on('error', (error) => {
				console.error(`[Micro.blog] Network error during publishing:`, error);
				reject(new Error(`Network error: ${error.message}`));
			});

			req.setTimeout(TIMEOUTS.API_REQUEST, () => {
				req.destroy();
				reject(new Error('Publish request timeout'));
			});

			req.write(postBody);
			req.end();
		});
	}

	async fetchUploadedMedia(): Promise<UploadFile[]> {
		const url = new URL('https://micro.blog/micropub/media');
		url.searchParams.set('q', 'source');
		
		console.log(`[Micro.blog] ApiClient: fetchUploadedMedia called`);
		console.log(`[Micro.blog] ApiClient: Fetching uploaded media from: ${url.hostname}${url.pathname}${url.search}`);
		console.log(`[Micro.blog] ApiClient: Using authorization header: ${this.credentials.getAuthorizationHeader().substring(0, 20)}...`);
		
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

			console.log(`[Micro.blog] ApiClient: Making request to:`, options);

			const req = https.request(options, (res) => {
				let data = '';
				console.log(`[Micro.blog] ApiClient: Response status:`, res.statusCode);
				console.log(`[Micro.blog] ApiClient: Response headers:`, res.headers);
				
				res.on('data', (chunk) => {
					data += chunk;
				});
				
				res.on('end', () => {
					console.log(`[Micro.blog] ApiClient: Response data length:`, data.length);
					console.log(`[Micro.blog] ApiClient: Response data preview:`, data.substring(0, 200));
					try {
						if (res.statusCode === 200) {
							const response = JSON.parse(data) as MediaQueryResponse;
							console.log(`[Micro.blog] ApiClient: Parsed response:`, {
								hasItems: !!response.items,
								itemCount: response.items?.length || 0
							});
							const uploadFiles = this.parseMediaResponse(response);
							console.log(`[Micro.blog] ApiClient: Successfully fetched ${uploadFiles.length} uploaded media files`);
							resolve(uploadFiles);
						} else {
							console.error(`[Micro.blog] ApiClient: Media fetch failed with status ${res.statusCode}, response:`, data);
							reject(new Error(`Media fetch failed with status ${res.statusCode}`));
						}
					} catch (error) {
						console.error(`[Micro.blog] ApiClient: Failed to parse media response:`, error);
						console.error(`[Micro.blog] ApiClient: Raw response data:`, data);
						reject(new Error(`Failed to parse media response: ${error}`));
					}
				});
			});

			req.on('error', (error) => {
				console.error(`[Micro.blog] Network error during media fetch:`, error);
				reject(new Error(`Network error: ${error.message}`));
			});

			req.setTimeout(TIMEOUTS.API_REQUEST, () => {
				req.destroy();
				reject(new Error('Media fetch timeout'));
			});

			req.end();
		});
	}

	private parseContentResponse(response: any): ContentResponse {
		if (!response || !Array.isArray(response.items)) {
			return { posts: [], pages: [] };
		}

		const posts: Post[] = [];

		response.items
			.filter((item: any) => item.type && item.type.includes('h-entry'))
			.forEach((item: any) => {
				const name = this.extractProperty(item.properties, 'name');
				const content = this.extractContent(item.properties);
				const published = this.extractProperty(item.properties, 'published');
				const postStatus = this.extractProperty(item.properties, 'post-status') as 'published' | 'draft';
				const category = this.extractArrayProperty(item.properties, 'category');
				const url = item.properties?.url?.[0];

				// Posts endpoint only returns posts - no page detection needed
				const postProperties: PostProperties = {
					content,
					name,
					published,
					'post-status': postStatus,
					category
				};
				posts.push(new Post(postProperties, url));
			});

		return { posts, pages: [] }; // Pages come from separate API endpoint
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

	private parseMediaResponse(response: MediaQueryResponse): UploadFile[] {
		if (!response || !Array.isArray(response.items)) {
			return [];
		}

		return response.items.map(item => UploadFile.fromApiResponse(item));
	}

	private parsePagesResponse(response: any): Page[] {
		if (!response || !Array.isArray(response.items)) {
			return [];
		}

		const pages: Page[] = [];

		response.items
			.filter((item: any) => item.type && item.type.includes('h-entry'))
			.forEach((item: any) => {
				const name = this.extractProperty(item.properties, 'name');
				const content = this.extractContent(item.properties);
				const published = this.extractProperty(item.properties, 'published');
				const postStatus = this.extractProperty(item.properties, 'post-status') as 'published' | 'draft';
				const category = this.extractArrayProperty(item.properties, 'category');
				const url = item.properties?.url?.[0];

				// No heuristics needed - pages API returns only pages
				if (name && content) {
					const pageProperties: PageProperties = {
						name,
						content,
						published,
						'post-status': postStatus,
						category
					};
					pages.push(new Page(pageProperties, url));
				}
			});

		return pages;
	}
}
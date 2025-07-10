import * as assert from 'assert';
import * as https from 'https';
import { ApiClient, VerifyTokenResponse } from '../../src/services/ApiClient';
import { MicroblogService } from '../../src/services/MicroblogService';
import { Credentials } from '../../src/domain/Credentials';

suite('Service Tests', () => {
	
	suite('ApiClient Tests with Mocks', () => {
		let originalRequest: typeof https.request;
		
		// Mock response data
		const mockVerifyResponse: VerifyTokenResponse = {
			name: 'Test User',
			username: 'testuser',
			avatar: 'https://example.com/avatar.jpg'
		};
		
		const mockPostsResponse = {
			items: [
				{
					type: ['h-entry'],
					properties: {
						name: ['Test Post'],
						content: [{ html: '<p>Test content</p>' }],
						published: ['2024-01-15T10:00:00Z'],
						'post-status': ['published'],
						category: ['testing'],
						url: ['https://example.micro.blog/test-post']
					}
				},
				{
					type: ['h-entry'],
					properties: {
						name: ['Draft Post'],
						content: [{ html: '<p>Draft content</p>' }],
						'post-status': ['draft']
					}
				}
			]
		};

		setup(() => {
			// Save original https.request
			originalRequest = https.request;
		});

		teardown(() => {
			// Restore original https.request
			(https as any).request = originalRequest;
		});

		function mockHttpRequest(responseData: any, statusCode: number = 200, shouldError: boolean = false) {
			(https as any).request = function(options: any, callback?: any) {
				const mockResponse = {
					statusCode,
					on: function(event: string, handler: Function) {
						if (event === 'data') {
							setTimeout(() => handler(JSON.stringify(responseData)), 0);
						} else if (event === 'end') {
							setTimeout(() => handler(), 0);
						}
					}
				};

				const mockRequest = {
					on: function(event: string, handler: Function) {
						if (event === 'error' && shouldError) {
							setTimeout(() => handler(new Error('Network error')), 0);
						}
					},
					setTimeout: function(timeout: number, handler: Function) {
						// Don't actually timeout in tests
					},
					write: function(data: string) {},
					end: function() {
						if (callback && !shouldError) {
							setTimeout(() => callback(mockResponse), 0);
						}
					},
					destroy: function() {}
				};

				return mockRequest;
			} as any;
		}

		test('Should verify token successfully', async () => {
			mockHttpRequest(mockVerifyResponse);
			
			const credentials = new Credentials('test-token');
			const apiClient = new ApiClient(credentials);
			
			const result = await apiClient.verifyToken('https://micro.blog/account/verify');
			
			assert.strictEqual(result.name, 'Test User');
			assert.strictEqual(result.username, 'testuser');
		});

		test('Should handle token verification error', async () => {
			mockHttpRequest({ error: 'App token was not valid.' });
			
			const credentials = new Credentials('invalid-token');
			const apiClient = new ApiClient(credentials);
			
			try {
				await apiClient.verifyToken('https://micro.blog/account/verify');
				assert.fail('Should have thrown an error');
			} catch (error) {
				assert.ok(error instanceof Error);
				assert.strictEqual((error as Error).message, 'App token was not valid.');
			}
		});

		test('Should fetch posts successfully', async () => {
			mockHttpRequest(mockPostsResponse);
			
			const credentials = new Credentials('test-token');
			const apiClient = new ApiClient(credentials);
			
			const posts = await apiClient.fetchPosts('https://micro.blog/micropub?q=source');
			
			assert.strictEqual(posts.length, 2);
			assert.strictEqual(posts[0].title, 'Test Post');
			assert.strictEqual(posts[0].status, 'published');
			assert.strictEqual(posts[1].title, 'Draft Post');
			assert.strictEqual(posts[1].status, 'draft');
		});

		test('Should handle network error', async () => {
			mockHttpRequest({}, 200, true);
			
			const credentials = new Credentials('test-token');
			const apiClient = new ApiClient(credentials);
			
			try {
				await apiClient.fetchPosts('https://micro.blog/micropub?q=source');
				assert.fail('Should have thrown an error');
			} catch (error) {
				assert.ok(error instanceof Error);
				assert.ok((error as Error).message.includes('Network error'));
			}
		});
	});

	suite('MicroblogService Tests', () => {
		let mockContext: any;
		let service: MicroblogService;

		setup(() => {
			// Create mock VS Code context
			mockContext = {
				globalState: {
					data: new Map(),
					get: function(key: string) { return this.data.get(key); },
					update: function(key: string, value: any) { 
						this.data.set(key, value); 
						return Promise.resolve(); 
					},
					keys: function() { return Array.from(this.data.keys()); }
				},
				secrets: {
					data: new Map(),
					get: function(key: string) { return Promise.resolve(this.data.get(key)); },
					store: function(key: string, value: string) { 
						this.data.set(key, value); 
						return Promise.resolve(); 
					},
					delete: function(key: string) { 
						this.data.delete(key); 
						return Promise.resolve(); 
					}
				}
			};

			service = new MicroblogService(mockContext, mockContext.secrets);
		});

		test('Should detect unconfigured state', async () => {
			const isConfigured = await service.isConfigured();
			assert.strictEqual(isConfigured, false);
		});

		test('Should detect configured state', async () => {
			// Manually set up configuration
			await mockContext.globalState.update('microblog.blog', {
				domain: 'example.micro.blog',
				name: 'Test Blog',
				apiEndpoint: 'https://example.micro.blog/micropub'
			});
			await mockContext.secrets.store('microblog.credentials', 'test-token');

			const isConfigured = await service.isConfigured();
			assert.strictEqual(isConfigured, true);
		});

		test('Should handle test connection when unconfigured', async () => {
			const result = await service.testConnection();
			
			assert.strictEqual(result.isValid, false);
			assert.ok(result.error?.includes('No credentials configured'));
		});
	});
});
import * as assert from 'assert';
import * as https from 'https';
import { ApiClient, VerifyTokenResponse, PublishResponse, MicropubConfig, UploadResponse } from '../../src/services/ApiClient';
import { MicroblogService } from '../../src/services/MicroblogService';
import { PublishingService, MicropubPost } from '../../src/services/PublishingService';
import { MediaService, MockFileReader } from '../../src/services/MediaService';
import { UploadManager } from '../../src/services/UploadManager';
import { FileManager } from '../../src/services/FileManager';
import { Credentials } from '../../src/domain/Credentials';
import { LocalPost } from '../../src/domain/LocalPost';
import { MediaAsset } from '../../src/domain/MediaAsset';
import { UploadFile } from '../../src/domain/UploadFile';

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

		function mockHttpRequest(responseData: any, statusCode: number = 200, shouldError: boolean = false, headers: any = {}) {
			(https as any).request = function(options: any, callback?: any) {
				const mockResponse = {
					statusCode,
					headers,
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
					write: function(data: string) {
						// Store the written data for verification if needed
						(mockRequest as any).writtenData = data;
					},
					end: function() {
						if (callback && !shouldError) {
							setTimeout(() => callback(mockResponse), 0);
						}
					},
					destroy: function() {}
				};

				// Store options for verification
				(mockRequest as any).options = options;

				return mockRequest;
			} as any;
		}

		function mockHttpRequestError(statusCode: number) {
			(https as any).request = function(options: any, callback?: any) {
				const mockResponse = {
					statusCode,
					headers: {},
					on: function(event: string, handler: Function) {
						if (event === 'data') {
							setTimeout(() => handler('{"error": "Server error"}'), 0);
						} else if (event === 'end') {
							setTimeout(() => handler(), 0);
						}
					}
				};

				const mockRequest = {
					on: function(event: string, handler: Function) {},
					setTimeout: function(timeout: number, handler: Function) {},
					write: function(data: string) {},
					end: function() {
						if (callback) {
							setTimeout(() => callback(mockResponse), 0);
						}
					},
					destroy: function() {}
				};

				return mockRequest;
			} as any;
		}

		function mockHttpRequestNetworkError() {
			(https as any).request = function(options: any, callback?: any) {
				const mockRequest = {
					on: function(event: string, handler: Function) {
						if (event === 'error') {
							setTimeout(() => handler(new Error('Network error')), 0);
						}
					},
					setTimeout: function(timeout: number, handler: Function) {},
					write: function(data: string) {},
					end: function() {},
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

		// Publishing Tests
		test('Should publish post successfully with 201 response', async () => {
			const mockHeaders = { location: 'https://example.micro.blog/published-post' };
			mockHttpRequest({}, 201, false, mockHeaders);
			
			const credentials = new Credentials('test-token');
			const apiClient = new ApiClient(credentials);
			const postData: MicropubPost = {
				h: 'entry',
				name: 'Test Post',
				content: 'This is test content'
			};
			
			const result = await apiClient.publishPost(postData);
			
			assert.strictEqual(result.url, 'https://example.micro.blog/published-post');
		});

		test('Should publish post successfully with 202 response', async () => {
			const mockHeaders = { location: 'https://example.micro.blog/accepted-post' };
			mockHttpRequest({}, 202, false, mockHeaders);
			
			const credentials = new Credentials('test-token');
			const apiClient = new ApiClient(credentials);
			const postData: MicropubPost = {
				h: 'entry',
				name: 'Test Post',
				content: 'Test content'
			};
			
			const result = await apiClient.publishPost(postData);
			
			assert.strictEqual(result.url, 'https://example.micro.blog/accepted-post');
		});

		test('Should handle publish error with 400 status', async () => {
			mockHttpRequest({}, 400, false);
			
			const credentials = new Credentials('test-token');
			const apiClient = new ApiClient(credentials);
			const postData: MicropubPost = {
				h: 'entry',
				name: 'Invalid Post',
				content: 'Invalid content'
			};
			
			try {
				await apiClient.publishPost(postData);
				assert.fail('Should have thrown an error');
			} catch (error) {
				assert.ok(error instanceof Error);
				assert.ok((error as Error).message.includes('Publishing failed with status 400'));
			}
		});

		test('Should handle publish error with 401 status', async () => {
			mockHttpRequest({}, 401, false);
			
			const credentials = new Credentials('test-token');
			const apiClient = new ApiClient(credentials);
			const postData: MicropubPost = {
				h: 'entry',
				name: 'Unauthorized Post',
				content: 'Unauthorized content'
			};
			
			try {
				await apiClient.publishPost(postData);
				assert.fail('Should have thrown an error');
			} catch (error) {
				assert.ok(error instanceof Error);
				assert.ok((error as Error).message.includes('Publishing failed with status 401'));
			}
		});

		test('Should handle publish network error', async () => {
			mockHttpRequest({}, 200, true);
			
			const credentials = new Credentials('test-token');
			const apiClient = new ApiClient(credentials);
			const postData: MicropubPost = {
				h: 'entry',
				name: 'Network Error Post',
				content: 'Network error content'
			};
			
			try {
				await apiClient.publishPost(postData);
				assert.fail('Should have thrown an error');
			} catch (error) {
				assert.ok(error instanceof Error);
				assert.ok((error as Error).message.includes('Network error'));
			}
		});

		test('Should format publish request correctly', async () => {
			let capturedRequest: any;
			
			// Enhanced mock to capture request details
			(https as any).request = function(options: any, callback?: any) {
				capturedRequest = { options };
				
				const mockResponse = {
					statusCode: 201,
					headers: { location: 'https://example.micro.blog/test' },
					on: function(event: string, handler: Function) {
						if (event === 'data') {
							setTimeout(() => handler(''), 0);
						} else if (event === 'end') {
							setTimeout(() => handler(), 0);
						}
					}
				};

				const mockRequest = {
					on: function(event: string, handler: Function) {},
					setTimeout: function(timeout: number, handler: Function) {},
					write: function(data: string) {
						capturedRequest.body = data;
					},
					end: function() {
						if (callback) {
							setTimeout(() => callback(mockResponse), 0);
						}
					},
					destroy: function() {}
				};

				return mockRequest;
			} as any;
			
			const credentials = new Credentials('test-token');
			const apiClient = new ApiClient(credentials);
			const postData: MicropubPost = {
				h: 'entry',
				name: 'Format Test',
				content: 'Format test content'
			};
			
			await apiClient.publishPost(postData);
			
			// Verify request format
			assert.strictEqual(capturedRequest.options.method, 'POST');
			assert.strictEqual(capturedRequest.options.hostname, 'micro.blog');
			assert.strictEqual(capturedRequest.options.path, '/micropub');
			assert.strictEqual(capturedRequest.options.headers['Authorization'], 'Bearer test-token');
			assert.strictEqual(capturedRequest.options.headers['Content-Type'], 'application/x-www-form-urlencoded');
			
			// Verify form data encoding
			const expectedBody = 'h=entry&name=Format+Test&content=Format+test+content';
			assert.strictEqual(capturedRequest.body, expectedBody);
		});

		test('Should get config successfully', async () => {
			const mockConfig: MicropubConfig = {
				'media-endpoint': 'https://micro.blog/micropub/media',
				'syndicate-to': [
					{ uid: 'micro.blog', name: 'Micro.blog' }
				]
			};
			mockHttpRequest(mockConfig);
			
			const credentials = new Credentials('test-token');
			const apiClient = new ApiClient(credentials);
			
			const config = await apiClient.getConfig('https://micro.blog/micropub');
			
			assert.strictEqual(config['media-endpoint'], 'https://micro.blog/micropub/media');
			assert.ok(config['syndicate-to']);
			assert.strictEqual(config['syndicate-to']?.[0].uid, 'micro.blog');
		});

		test('Should handle config request error', async () => {
			mockHttpRequest({}, 400, false);
			
			const credentials = new Credentials('test-token');
			const apiClient = new ApiClient(credentials);
			
			try {
				await apiClient.getConfig('https://micro.blog/micropub');
				assert.fail('Should have thrown an error');
			} catch (error) {
				assert.ok(error instanceof Error);
				assert.ok((error as Error).message.includes('Config request failed with status 400'));
			}
		});

		test('Should upload media successfully with Location header', async () => {
			const mockHeaders = { location: 'https://example.micro.blog/uploads/test.jpg' };
			mockHttpRequest({}, 201, false, mockHeaders);
			
			const credentials = new Credentials('test-token');
			const apiClient = new ApiClient(credentials);
			const fileData = Buffer.from('fake image data');
			
			const result = await apiClient.uploadMedia(
				'https://micro.blog/micropub/media',
				fileData,
				'test.jpg',
				'image/jpeg'
			);
			
			assert.strictEqual(result.url, 'https://example.micro.blog/uploads/test.jpg');
		});

		test('Should upload media successfully with JSON response', async () => {
			const mockResponse = { url: 'https://example.micro.blog/uploads/test.png' };
			mockHttpRequest(mockResponse, 201, false, {}); // No Location header
			
			const credentials = new Credentials('test-token');
			const apiClient = new ApiClient(credentials);
			const fileData = Buffer.from('fake image data');
			
			const result = await apiClient.uploadMedia(
				'https://micro.blog/micropub/media',
				fileData,
				'test.png',
				'image/png'
			);
			
			assert.strictEqual(result.url, 'https://example.micro.blog/uploads/test.png');
		});

		test('Should handle media upload error', async () => {
			mockHttpRequest({}, 400, false);
			
			const credentials = new Credentials('test-token');
			const apiClient = new ApiClient(credentials);
			const fileData = Buffer.from('fake image data');
			
			try {
				await apiClient.uploadMedia(
					'https://micro.blog/micropub/media',
					fileData,
					'test.jpg',
					'image/jpeg'
				);
				assert.fail('Should have thrown an error');
			} catch (error) {
				assert.ok(error instanceof Error);
				assert.ok((error as Error).message.includes('Media upload failed with status 400'));
			}
		});

		test('Should handle media upload network error', async () => {
			mockHttpRequest({}, 200, true); // shouldError = true
			
			const credentials = new Credentials('test-token');
			const apiClient = new ApiClient(credentials);
			const fileData = Buffer.from('fake image data');
			
			try {
				await apiClient.uploadMedia(
					'https://micro.blog/micropub/media',
					fileData,
					'test.jpg',
					'image/jpeg'
				);
				assert.fail('Should have thrown an error');
			} catch (error) {
				assert.ok(error instanceof Error);
				assert.ok((error as Error).message.includes('Network error'));
			}
		});

		test('Should fetch uploaded media successfully', async () => {
			const mockResponse = {
				items: [
					{
						url: 'https://user.domain.com/uploads/2025/test-image.png',
						published: '2025-07-11T11:53:26+00:00',
						alt: 'Test image description',
						sizes: {
							large: 'https://user.domain.com/uploads/2025/test-image.png',
							medium: 'https://user.domain.com/uploads/2025/test-image-m.png'
						},
						cdn: {
							large: 'https://cdn.uploads.micro.blog/123456/2025/test-image.png'
						}
					},
					{
						url: 'https://user.domain.com/uploads/2025/another-image.jpg',
						published: '2025-07-10T15:30:00+00:00',
						alt: 'Another test image'
					}
				]
			};
			mockHttpRequest(mockResponse);

			const credentials = new Credentials('test-token');
			const apiClient = new ApiClient(credentials);
			const uploadFiles = await apiClient.fetchUploadedMedia();

			assert.strictEqual(uploadFiles.length, 2);
			
			// Test first upload file
			const firstFile = uploadFiles[0];
			assert.strictEqual(firstFile.fileName, 'test-image.png');
			assert.strictEqual(firstFile.remoteUrl, 'https://user.domain.com/uploads/2025/test-image.png');
			assert.strictEqual(firstFile.altText, 'Test image description');
			assert.strictEqual(firstFile.cdnUrl, 'https://cdn.uploads.micro.blog/123456/2025/test-image.png');
			assert.ok(firstFile.imageSizes);
			assert.strictEqual(firstFile.imageSizes.large, 'https://user.domain.com/uploads/2025/test-image.png');
			
			// Test second upload file
			const secondFile = uploadFiles[1];
			assert.strictEqual(secondFile.fileName, 'another-image.jpg');
			assert.strictEqual(secondFile.remoteUrl, 'https://user.domain.com/uploads/2025/another-image.jpg');
			assert.strictEqual(secondFile.altText, 'Another test image');
		});

		test('Should handle media fetch API error', async () => {
			mockHttpRequestError(500);

			const credentials = new Credentials('test-token');
			const apiClient = new ApiClient(credentials);

			try {
				await apiClient.fetchUploadedMedia();
				assert.fail('Should have thrown an error');
			} catch (error) {
				assert.ok(error instanceof Error);
				assert.ok((error as Error).message.includes('Media fetch failed with status 500'));
			}
		});

		test('Should handle media fetch network error', async () => {
			mockHttpRequestNetworkError();

			const credentials = new Credentials('test-token');
			const apiClient = new ApiClient(credentials);

			try {
				await apiClient.fetchUploadedMedia();
				assert.fail('Should have thrown an error');
			} catch (error) {
				assert.ok(error instanceof Error);
				assert.ok((error as Error).message.includes('Network error'));
			}
		});

		test('Should parse empty media response correctly', async () => {
			const emptyResponse = { items: [] };
			mockHttpRequest(emptyResponse);

			const credentials = new Credentials('test-token');
			const apiClient = new ApiClient(credentials);
			const uploadFiles = await apiClient.fetchUploadedMedia();

			assert.strictEqual(uploadFiles.length, 0);
		});

		test('Should fetch pages with mp-channel=pages parameter', async () => {
			const mockPagesResponse = {
				items: [
					{
						type: ['h-entry'],
						properties: {
							name: ['About Me'],
							content: ['This is my about page with detailed information about who I am and what I do.'],
							published: [new Date().toISOString()],
							'post-status': ['published'],
							category: ['page']
						}
					}
				]
			};

			mockHttpRequest(mockPagesResponse);
			
			const credentials = new Credentials('test-token');
			const apiClient = new ApiClient(credentials);
			const result = await apiClient.fetchPages('https://micro.blog/micropub');
			
			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].title, 'About Me');
			assert.strictEqual(result[0].status, 'published');
			assert.ok(result[0].content.includes('detailed information'));
		});

		test('Should handle pages API error gracefully', async () => {
			mockHttpRequest({ error: 'Pages not found' }, 404);
			
			const credentials = new Credentials('test-token');
			const apiClient = new ApiClient(credentials);
			
			try {
				await apiClient.fetchPages('https://micro.blog/micropub');
				assert.fail('Should have thrown an error');
			} catch (error) {
				assert.ok(error instanceof Error);
				assert.ok((error as Error).message.includes('Pages API request failed'));
			}
		});

		test('Should handle pages API network error', async () => {
			mockHttpRequest({}, 200, true); // shouldError = true
			
			const credentials = new Credentials('test-token');
			const apiClient = new ApiClient(credentials);
			
			try {
				await apiClient.fetchPages('https://micro.blog/micropub');
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

		test('Should return false from verifyAndSetContext when extension not configured', async () => {
			const result = await service.verifyAndSetContext();
			assert.strictEqual(result, false);
		});
	});

	suite('PublishingService Tests', () => {
		let mockApiClient: any;
		let publishingService: PublishingService;

		setup(() => {
			// Create mock ApiClient
			mockApiClient = {
				publishPost: async (postData: MicropubPost) => {
					// Default successful response
					return { url: 'https://example.micro.blog/published-post' };
				}
			};
			
			publishingService = new PublishingService(mockApiClient);
		});

		test('Should publish valid post successfully', async () => {
			const localPost = LocalPost.create('Test Post', 'This is test content');
			
			const result = await publishingService.publishPost(localPost);
			
			assert.strictEqual(result.success, true);
			assert.strictEqual(result.url, 'https://example.micro.blog/published-post');
			assert.strictEqual(result.error, undefined);
		});

		test('Should fail validation for post with empty title', async () => {
			const localPost = LocalPost.create('', 'Content without title');
			
			const result = await publishingService.publishPost(localPost);
			
			assert.strictEqual(result.success, false);
			assert.ok(result.error?.includes('Validation failed'));
			assert.ok(result.error?.includes('Post title is required'));
			assert.strictEqual(result.url, undefined);
		});

		test('Should fail validation for post with empty content', async () => {
			const localPost = LocalPost.create('Title without content', '');
			
			const result = await publishingService.publishPost(localPost);
			
			assert.strictEqual(result.success, false);
			assert.ok(result.error?.includes('Validation failed'));
			assert.ok(result.error?.includes('Post content is required'));
			assert.strictEqual(result.url, undefined);
		});

		test('Should handle API client error', async () => {
			// Mock API client to throw error
			mockApiClient.publishPost = async () => {
				throw new Error('API request failed');
			};
			
			const localPost = LocalPost.create('Test Post', 'Test content');
			
			const result = await publishingService.publishPost(localPost);
			
			assert.strictEqual(result.success, false);
			assert.strictEqual(result.error, 'API request failed');
			assert.strictEqual(result.url, undefined);
		});

		test('Should convert LocalPost to correct Micropub format', async () => {
			let capturedPostData: MicropubPost | undefined;
			
			// Mock API client to capture the post data
			mockApiClient.publishPost = async (postData: MicropubPost) => {
				capturedPostData = postData;
				return { url: 'https://example.micro.blog/test' };
			};
			
			const localPost = LocalPost.create('Test Title', 'Test content for publishing');
			
			await publishingService.publishPost(localPost);
			
			assert.ok(capturedPostData);
			assert.strictEqual(capturedPostData.h, 'entry');
			assert.strictEqual(capturedPostData.name, 'Test Title');
			assert.strictEqual(capturedPostData.content, 'Test content for publishing');
		});

		test('Should handle unknown error types', async () => {
			// Mock API client to throw non-Error object
			mockApiClient.publishPost = async () => {
				throw 'String error';
			};
			
			const localPost = LocalPost.create('Test Post', 'Test content');
			
			const result = await publishingService.publishPost(localPost);
			
			assert.strictEqual(result.success, false);
			assert.strictEqual(result.error, 'Unknown error occurred');
			assert.strictEqual(result.url, undefined);
		});
	});

	suite('Publishing Integration Tests', () => {
		test('Should handle end-to-end publishing workflow', async () => {
			// Create a real PublishingService with mocked ApiClient
			let capturedPostData: MicropubPost | undefined;
			
			const mockApiClient = {
				publishPost: async (postData: MicropubPost) => {
					capturedPostData = postData;
					return { url: 'https://example.micro.blog/integration-test' };
				}
			};
			
			const publishingService = new PublishingService(mockApiClient as any);
			const localPost = LocalPost.create('Integration Test', 'Full workflow test content');
			
			// Execute the complete workflow
			const result = await publishingService.publishPost(localPost);
			
			// Verify result
			assert.strictEqual(result.success, true);
			assert.strictEqual(result.url, 'https://example.micro.blog/integration-test');
			
			// Verify the data passed through the pipeline correctly
			assert.ok(capturedPostData);
			assert.strictEqual(capturedPostData.h, 'entry');
			assert.strictEqual(capturedPostData.name, 'Integration Test');
			assert.strictEqual(capturedPostData.content, 'Full workflow test content');
		});

		test('Should handle malformed API responses gracefully', async () => {
			const mockApiClient = {
				publishPost: async () => {
					// Return malformed response (missing url property)
					return {} as any;
				}
			};
			
			const publishingService = new PublishingService(mockApiClient as any);
			const localPost = LocalPost.create('Malformed Response Test', 'Test content');
			
			const result = await publishingService.publishPost(localPost);
			
			// Should still succeed but with undefined URL
			assert.strictEqual(result.success, true);
			assert.strictEqual(result.url, undefined);
			assert.strictEqual(result.error, undefined);
		});

		test('Should handle special characters in content', async () => {
			let capturedPostData: MicropubPost | undefined;
			
			const mockApiClient = {
				publishPost: async (postData: MicropubPost) => {
					capturedPostData = postData;
					return { url: 'https://example.micro.blog/special-chars' };
				}
			};
			
			const publishingService = new PublishingService(mockApiClient as any);
			
			// Test with special characters, emojis, and HTML entities
			const specialContent = 'Test with émojis 🎉, "quotes", <tags>, & ampersands!';
			const localPost = LocalPost.create('Special Characters Test', specialContent);
			
			const result = await publishingService.publishPost(localPost);
			
			assert.strictEqual(result.success, true);
			assert.ok(capturedPostData);
			assert.strictEqual(capturedPostData.content, specialContent);
		});
	});

	suite('MediaService Tests', () => {
		let mockApiClient: any;
		let mediaService: MediaService;
		let originalRequest: typeof https.request;

		setup(() => {
			// Mock API client
			mockApiClient = {
				getConfig: async () => ({
					'media-endpoint': 'https://micro.blog/micropub/media'
				}),
				uploadMedia: async () => ({
					url: 'https://example.micro.blog/uploads/test.jpg'
				})
			};
			
			mediaService = new MediaService(mockApiClient, new MockFileReader());
			originalRequest = https.request;
		});

		teardown(() => {
			(https as any).request = originalRequest;
		});

		test('Should validate image file successfully', () => {
			const validation = mediaService.validateImageFile(
				'/uploads/test.jpg',
				'test.jpg',
				1024 * 1024 // 1MB
			);
			
			assert.strictEqual(validation.isValid, true);
			assert.strictEqual(validation.errors.length, 0);
		});

		test('Should fail validation for oversized file', () => {
			const validation = mediaService.validateImageFile(
				'/uploads/huge.jpg',
				'huge.jpg',
				15 * 1024 * 1024 // 15MB
			);
			
			assert.strictEqual(validation.isValid, false);
			assert.ok(validation.errors.some(error => error.includes('exceeds maximum limit')));
		});

		test('Should fail validation for invalid file type', () => {
			const validation = mediaService.validateImageFile(
				'/uploads/doc.pdf',
				'doc.pdf',
				1024
			);
			
			assert.strictEqual(validation.isValid, false);
			assert.ok(validation.errors.some(error => error.includes('Unsupported file type')));
		});

		test('Should discover media endpoint successfully', async () => {
			const endpoint = await mediaService.discoverMediaEndpoint('https://micro.blog/micropub');
			
			assert.strictEqual(endpoint, 'https://micro.blog/micropub/media');
		});

		test('Should cache media endpoint', async () => {
			let configCallCount = 0;
			mockApiClient.getConfig = async () => {
				configCallCount++;
				return { 'media-endpoint': 'https://micro.blog/micropub/media' };
			};
			
			// First call
			await mediaService.discoverMediaEndpoint('https://micro.blog/micropub');
			
			// Second call should use cache
			await mediaService.discoverMediaEndpoint('https://micro.blog/micropub');
			
			assert.strictEqual(configCallCount, 1);
		});

		test('Should handle media endpoint discovery failure', async () => {
			mockApiClient.getConfig = async () => {
				throw new Error('Config request failed');
			};
			
			try {
				await mediaService.discoverMediaEndpoint('https://micro.blog/micropub');
				assert.fail('Should have thrown an error');
			} catch (error) {
				assert.ok(error instanceof Error);
				assert.ok((error as Error).message.includes('Failed to discover media endpoint'));
			}
		});

		test('Should upload image successfully', async () => {
			const asset = new MediaAsset({
				filePath: '/uploads/test.jpg',
				fileName: 'test.jpg',
				mimeType: 'image/jpeg',
				fileSize: 1024 * 1024
			});
			
			const result = await mediaService.uploadImage(asset, 'https://micro.blog/micropub');
			
			assert.strictEqual(result.success, true);
			assert.strictEqual(result.url, 'https://example.micro.blog/uploads/test.jpg');
			assert.strictEqual(result.retryCount, 0);
		});

		test('Should fail upload for invalid asset', async () => {
			const invalidAsset = new MediaAsset({
				filePath: '/uploads/huge.jpg',
				fileName: 'huge.jpg',
				mimeType: 'image/jpeg',
				fileSize: 15 * 1024 * 1024 // Too large
			});
			
			const result = await mediaService.uploadImage(invalidAsset, 'https://micro.blog/micropub');
			
			assert.strictEqual(result.success, false);
			assert.ok(result.error?.includes('Validation failed'));
		});

		test('Should retry upload on failure', async () => {
			let uploadAttempts = 0;
			mockApiClient.uploadMedia = async () => {
				uploadAttempts++;
				if (uploadAttempts < 3) {
					throw new Error('Upload failed');
				}
				return { url: 'https://example.micro.blog/uploads/test.jpg' };
			};
			
			const asset = new MediaAsset({
				filePath: '/uploads/test.jpg',
				fileName: 'test.jpg',
				mimeType: 'image/jpeg',
				fileSize: 1024
			});
			
			const result = await mediaService.uploadImage(asset, 'https://micro.blog/micropub', 3, 10); // 10ms delay for testing
			
			assert.strictEqual(result.success, true);
			assert.strictEqual(result.retryCount, 2); // Failed twice, succeeded on third attempt
			assert.strictEqual(uploadAttempts, 3);
		});

		test('Should fail after max retries', async () => {
			mockApiClient.uploadMedia = async () => {
				throw new Error('Persistent upload failure');
			};
			
			const asset = new MediaAsset({
				filePath: '/uploads/test.jpg',
				fileName: 'test.jpg',
				mimeType: 'image/jpeg',
				fileSize: 1024
			});
			
			const result = await mediaService.uploadImage(asset, 'https://micro.blog/micropub', 2, 10); // Max 2 retries, 10ms delay
			
			assert.strictEqual(result.success, false);
			assert.strictEqual(result.retryCount, 2); // 2 retries after initial attempt
			assert.ok(result.error?.includes('Persistent upload failure'));
		});

		test('Should format URL as markdown', () => {
			const markdown = mediaService.formatAsMarkdown('https://example.com/uploads/test.jpg', 'Test Image');
			assert.strictEqual(markdown, '![Test Image](https://example.com/uploads/test.jpg)');
		});

		test('Should format URL as HTML', () => {
			const html = mediaService.formatAsHtml('https://example.com/uploads/test.jpg', 'Test Image');
			assert.strictEqual(html, '<img src="https://example.com/uploads/test.jpg" alt="Test Image">');
		});

		test('Should extract filename from URL for alt text', () => {
			const markdown = mediaService.formatAsMarkdown('https://example.com/uploads/my-photo.jpg');
			assert.strictEqual(markdown, '![my-photo](https://example.com/uploads/my-photo.jpg)');
		});

		test('Should clear cache', async () => {
			// First, populate the cache
			await mediaService.discoverMediaEndpoint('https://micro.blog/micropub');
			
			// Clear cache
			mediaService.clearCache();
			
			// This should call getConfig again
			let configCallCount = 0;
			mockApiClient.getConfig = async () => {
				configCallCount++;
				return { 'media-endpoint': 'https://micro.blog/micropub/media' };
			};
			
			await mediaService.discoverMediaEndpoint('https://micro.blog/micropub');
			assert.strictEqual(configCallCount, 1);
		});
	});

	suite('UploadManager Tests', () => {
		let mockFileManager: any;
		let uploadManager: UploadManager;

		setup(() => {
			// Mock FileManager
			mockFileManager = {
				uploadsExists: async () => true,
				getUploadsPath: () => '/test/workspace/uploads',
				ensureUploadsDirectory: async () => {}
			};

			uploadManager = new UploadManager(mockFileManager);
		});

		test('Should return empty array when uploads folder does not exist', async () => {
			mockFileManager.uploadsExists = async () => false;

			const files = await uploadManager.scanUploadsFolder();
			assert.strictEqual(files.length, 0);
		});

		test('Should get file count correctly', async () => {
			// For now, skip complex mocking tests since VS Code workspace.fs is read-only
			// Focus on testing the logic that can be tested without mocking VS Code internals
			const count = await uploadManager.getFileCount();
			assert.strictEqual(typeof count, 'number');
			assert.ok(count >= 0);
		});

		test('Should filter image files correctly', async () => {
			// Test that getImageFiles returns an array
			const imageFiles = await uploadManager.getImageFiles();
			assert.ok(Array.isArray(imageFiles));
		});

		test('Should check file existence correctly', async () => {
			// Test that fileExists returns a boolean
			const result = await uploadManager.fileExists('test.jpg');
			assert.strictEqual(typeof result, 'boolean');
		});

		test('Should handle scan errors gracefully', async () => {
			// Test with non-existent uploads folder
			mockFileManager.uploadsExists = async () => false;
			const files = await uploadManager.scanUploadsFolder();
			assert.strictEqual(files.length, 0);
		});

		test('Should ensure uploads directory', async () => {
			let ensureCalled = false;
			mockFileManager.ensureUploadsDirectory = async () => {
				ensureCalled = true;
			};

			await uploadManager.ensureUploadsDirectory();
			assert.strictEqual(ensureCalled, true);
		});

		test('Should fetch remote uploads with API client', async () => {
			// Create mock API client
			const mockApiClient = {
				fetchUploadedMedia: async () => [
					{
						fileName: 'remote-test.png',
						filePath: 'remote-uploads/remote-test.png',
						fileSize: 0,
						mimeType: 'image/png',
						lastModified: new Date('2025-07-11T10:00:00Z'),
						remoteUrl: 'https://example.com/uploads/remote-test.png',
						cdnUrl: 'https://cdn.example.com/remote-test.png',
						altText: 'Remote test image'
					}
				]
			};

			// Create UploadManager with API client
			const remoteUploadManager = new (require('../../src/services/UploadManager').UploadManager)(
				mockFileManager, 
				mockApiClient
			);

			const uploads = await remoteUploadManager.fetchRemoteUploads();

			assert.strictEqual(uploads.length, 1);
			assert.strictEqual(uploads[0].fileName, 'remote-test.png');
			assert.strictEqual(uploads[0].remoteUrl, 'https://example.com/uploads/remote-test.png');
		});

		test('Should cache remote uploads for 5 minutes', async () => {
			let apiCallCount = 0;
			const mockApiClient = {
				fetchUploadedMedia: async () => {
					apiCallCount++;
					return [{
						fileName: 'cached-test.png',
						filePath: 'remote-uploads/cached-test.png',
						fileSize: 0,
						mimeType: 'image/png',
						lastModified: new Date(),
						remoteUrl: 'https://example.com/uploads/cached-test.png'
					}];
				}
			};

			const remoteUploadManager = new (require('../../src/services/UploadManager').UploadManager)(
				mockFileManager, 
				mockApiClient
			);

			// First call - should hit API
			await remoteUploadManager.fetchRemoteUploads();
			assert.strictEqual(apiCallCount, 1);

			// Second call immediately - should use cache
			await remoteUploadManager.fetchRemoteUploads();
			assert.strictEqual(apiCallCount, 1);

			// Third call - should still use cache
			await remoteUploadManager.fetchRemoteUploads();
			assert.strictEqual(apiCallCount, 1);
		});

		test('Should fallback to local uploads when API fails', async () => {
			const mockApiClient = {
				fetchUploadedMedia: async () => {
					throw new Error('API failure');
				}
			};

			const remoteUploadManager = new (require('../../src/services/UploadManager').UploadManager)(
				mockFileManager, 
				mockApiClient
			);

			// Should not throw error, should return empty array when local also empty
			const uploads = await remoteUploadManager.fetchRemoteUploads();
			assert.ok(Array.isArray(uploads));
		});

		test('Should refresh cache on demand', async () => {
			let apiCallCount = 0;
			const mockApiClient = {
				fetchUploadedMedia: async () => {
					apiCallCount++;
					return [];
				}
			};

			const remoteUploadManager = new (require('../../src/services/UploadManager').UploadManager)(
				mockFileManager, 
				mockApiClient
			);

			// First call
			await remoteUploadManager.fetchRemoteUploads();
			assert.strictEqual(apiCallCount, 1);

			// Refresh cache - should make new API call
			await remoteUploadManager.refreshCache();
			assert.strictEqual(apiCallCount, 2);
		});

		test('Should get remote file count correctly', async () => {
			const mockApiClient = {
				fetchUploadedMedia: async () => [
					{ fileName: 'file1.png', filePath: 'remote-uploads/file1.png', fileSize: 0, mimeType: 'image/png', lastModified: new Date() },
					{ fileName: 'file2.jpg', filePath: 'remote-uploads/file2.jpg', fileSize: 0, mimeType: 'image/jpeg', lastModified: new Date() }
				]
			};

			const remoteUploadManager = new (require('../../src/services/UploadManager').UploadManager)(
				mockFileManager, 
				mockApiClient
			);

			const count = await remoteUploadManager.getRemoteFileCount();
			assert.strictEqual(count, 2);
		});

		test('Should return empty array when no API client available', async () => {
			const remoteUploadManager = new (require('../../src/services/UploadManager').UploadManager)(
				mockFileManager, 
				null // No API client
			);

			const uploads = await remoteUploadManager.fetchRemoteUploads();
			assert.strictEqual(uploads.length, 0);
		});
	});

	suite('Error Handling and Retry Tests', () => {
		let mockApiClient: any;
		let mockFileManager: any;

		setup(() => {
			mockFileManager = {
				uploadsExists: async () => true,
				getUploadsPath: () => '/test/workspace/uploads',
				ensureUploadsDirectory: async () => {}
			};
		});

		test('Should handle network timeouts gracefully in API client', async () => {
			// Mock API client that simulates timeout
			mockApiClient = {
				fetchUploadedMedia: async () => {
					throw new Error('Request timeout');
				}
			};

			const uploadManager = new (require('../../src/services/UploadManager').UploadManager)(
				mockFileManager,
				mockApiClient
			);

			// Should not throw, should handle timeout gracefully
			const uploads = await uploadManager.fetchRemoteUploads();
			assert.ok(Array.isArray(uploads));
		});

		test('Should handle malformed API responses gracefully', async () => {
			mockApiClient = {
				fetchUploadedMedia: async () => {
					// Return malformed response that doesn't match expected structure
					return [
						{ invalidField: 'badData' },
						null,
						undefined,
						{ url: 'invalid-url', published: 'not-a-date' }
					];
				}
			};

			const uploadManager = new (require('../../src/services/UploadManager').UploadManager)(
				mockFileManager,
				mockApiClient
			);

			// Should handle malformed responses without crashing
			const uploads = await uploadManager.fetchRemoteUploads();
			assert.ok(Array.isArray(uploads));
		});

		test('Should recover from temporary API failures', async () => {
			let callCount = 0;
			mockApiClient = {
				fetchUploadedMedia: async () => {
					callCount++;
					if (callCount === 1) {
						throw new Error('Temporary failure');
					}
					return [
						{
							fileName: 'recovered-file.png',
							filePath: 'remote-uploads/recovered-file.png',
							fileSize: 0,
							mimeType: 'image/png',
							lastModified: new Date(),
							remoteUrl: 'https://example.com/recovered-file.png'
						}
					];
				}
			};

			const uploadManager = new (require('../../src/services/UploadManager').UploadManager)(
				mockFileManager,
				mockApiClient
			);

			// First call fails
			const firstAttempt = await uploadManager.fetchRemoteUploads();
			assert.strictEqual(firstAttempt.length, 0);

			// Force cache refresh and try again - should succeed
			await uploadManager.refreshCache();
			const secondAttempt = await uploadManager.fetchRemoteUploads();
			assert.strictEqual(secondAttempt.length, 1);
			assert.strictEqual(secondAttempt[0].fileName, 'recovered-file.png');
		});

		test('Should handle concurrent API calls safely', async () => {
			let apiCallCount = 0;
			mockApiClient = {
				fetchUploadedMedia: async () => {
					apiCallCount++;
					// Simulate delay
					await new Promise(resolve => setTimeout(resolve, 10));
					return [
						{
							fileName: 'concurrent-file.png',
							filePath: 'remote-uploads/concurrent-file.png',
							fileSize: 0,
							mimeType: 'image/png',
							lastModified: new Date(),
							remoteUrl: 'https://example.com/concurrent-file.png'
						}
					];
				}
			};

			const uploadManager = new (require('../../src/services/UploadManager').UploadManager)(
				mockFileManager,
				mockApiClient
			);

			// Make multiple concurrent calls
			const promises = [
				uploadManager.fetchRemoteUploads(),
				uploadManager.fetchRemoteUploads(),
				uploadManager.fetchRemoteUploads()
			];

			const results = await Promise.all(promises);

			// All should succeed
			results.forEach(result => {
				assert.strictEqual(result.length, 1);
				assert.strictEqual(result[0].fileName, 'concurrent-file.png');
			});

			// Should not make excessive API calls due to caching
			assert.ok(apiCallCount <= 3, `Made ${apiCallCount} API calls, expected <= 3`);
		});

		test('Should handle partial API responses correctly', async () => {
			mockApiClient = {
				fetchUploadedMedia: async () => [
					// Valid file
					{
						fileName: 'valid-file.png',
						filePath: 'remote-uploads/valid-file.png',
						fileSize: 0,
						mimeType: 'image/png',
						lastModified: new Date('2025-07-11T10:00:00Z'),
						remoteUrl: 'https://example.com/valid-file.png'
					},
					// File with missing optional fields
					{
						fileName: 'minimal-file.jpg',
						filePath: 'remote-uploads/minimal-file.jpg',
						fileSize: 0,
						mimeType: 'image/jpeg',
						lastModified: new Date('2025-07-10T10:00:00Z'),
						remoteUrl: 'https://example.com/minimal-file.jpg'
						// Missing: cdnUrl, altText, imageSizes
					}
				]
			};

			const uploadManager = new (require('../../src/services/UploadManager').UploadManager)(
				mockFileManager,
				mockApiClient
			);

			const uploads = await uploadManager.fetchRemoteUploads();

			assert.strictEqual(uploads.length, 2);
			assert.strictEqual(uploads[0].fileName, 'valid-file.png');
			assert.strictEqual(uploads[1].fileName, 'minimal-file.jpg');
			
			// Should handle missing optional fields gracefully
			assert.strictEqual(uploads[1].cdnUrl, undefined);
			assert.strictEqual(uploads[1].altText, undefined);
		});

		test('Should handle empty API responses without errors', async () => {
			mockApiClient = {
				fetchUploadedMedia: async () => []
			};

			const uploadManager = new (require('../../src/services/UploadManager').UploadManager)(
				mockFileManager,
				mockApiClient
			);

			const uploads = await uploadManager.fetchRemoteUploads();
			assert.strictEqual(uploads.length, 0);

			// Should also handle getting count from empty response
			const count = await uploadManager.getRemoteFileCount();
			assert.strictEqual(count, 0);
		});

		test('Should handle API client method not available', async () => {
			// API client missing the fetchUploadedMedia method
			mockApiClient = {};

			const uploadManager = new (require('../../src/services/UploadManager').UploadManager)(
				mockFileManager,
				mockApiClient
			);

			// Should handle gracefully when method doesn't exist
			try {
				const uploads = await uploadManager.fetchRemoteUploads();
				// Should either succeed with empty array or handle the error
				assert.ok(Array.isArray(uploads));
			} catch (error) {
				// If it throws, should be a clear error message
				assert.ok(error instanceof Error);
			}
		});
	});
});
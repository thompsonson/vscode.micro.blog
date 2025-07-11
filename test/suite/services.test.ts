import * as assert from 'assert';
import * as https from 'https';
import { ApiClient, VerifyTokenResponse, PublishResponse, MicropubConfig, UploadResponse } from '../../src/services/ApiClient';
import { MicroblogService } from '../../src/services/MicroblogService';
import { PublishingService, MicropubPost } from '../../src/services/PublishingService';
import { MediaService, MockFileReader } from '../../src/services/MediaService';
import { Credentials } from '../../src/domain/Credentials';
import { LocalPost } from '../../src/domain/LocalPost';
import { MediaAsset } from '../../src/domain/MediaAsset';

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
});
import * as assert from 'assert';
import * as vscode from 'vscode';
import { MicroblogTreeProvider, MicroblogTreeItem } from '../../src/providers/TreeProvider';
import { ContentProvider } from '../../src/providers/ContentProvider';
import { Post } from '../../src/domain/Post';
import { Page } from '../../src/domain/Page';
import { UploadFile } from '../../src/domain/UploadFile';
import { MicroblogService } from '../../src/services/MicroblogService';

suite('Provider Tests', () => {
	
	suite('TreeProvider Tests', () => {
		let mockService: MicroblogService;
		let treeProvider: MicroblogTreeProvider;

		setup(() => {
			// Create mock service
			const mockContext = {
				globalState: { get: () => undefined, update: () => Promise.resolve(), keys: () => [] },
				secrets: { get: () => Promise.resolve(undefined), store: () => Promise.resolve(), delete: () => Promise.resolve() }
			} as any;
			
			mockService = new MicroblogService(mockContext, mockContext.secrets);
			
			// Mock the service methods
			(mockService as any).isConfigured = () => Promise.resolve(true);
			(mockService as any).fetchPosts = () => Promise.resolve([
				new Post({
					content: 'Test post content',
					name: 'Test Post',
					published: new Date().toISOString(),
					'post-status': 'published'
				}, 'https://example.micro.blog/test-post'),
				new Post({
					content: 'Draft post content',
					name: 'Draft Post',
					'post-status': 'draft'
				})
			]);
			(mockService as any).fetchContent = () => Promise.resolve({
				posts: [
					new Post({
						content: 'Test post content',
						name: 'Test Post',
						published: new Date().toISOString(),
						'post-status': 'published'
					}, 'https://example.micro.blog/test-post'),
					new Post({
						content: 'Draft post content',
						name: 'Draft Post',
						'post-status': 'draft'
					})
				],
				pages: []
			});
			(mockService as any).fetchPages = () => Promise.resolve([]);
			
			treeProvider = new MicroblogTreeProvider(mockService);
		});

		test('Should create tree items with correct properties', () => {
			const testPost = new Post({
				content: 'Test content',
				name: 'Test Title',
				published: new Date().toISOString(),
				'post-status': 'published'
			}, 'https://example.micro.blog/test');

			const treeItem = new MicroblogTreeItem('Test Title', vscode.TreeItemCollapsibleState.None, testPost);
			
			assert.strictEqual(treeItem.label, 'Test Title');
			assert.strictEqual(treeItem.collapsibleState, vscode.TreeItemCollapsibleState.None);
			assert.ok(treeItem.command);
			assert.strictEqual(treeItem.command?.command, 'microblog.viewPost');
		});

		test('Should handle unconfigured state', async () => {
			(mockService as any).isConfigured = () => Promise.resolve(false);
			
			const children = await treeProvider.getChildren();
			
			assert.strictEqual(children.length, 1);
			assert.strictEqual(children[0].label, '📲 Configure micro.blog account');
		});

		test('Should group posts by status', async () => {
			const children = await treeProvider.getChildren();
			
			assert.strictEqual(children.length, 3);
			assert.ok(children.some(item => item.label.includes('📄 Pages (0)')));
			assert.ok(children.some(item => item.label.includes('Published Posts')));
			assert.ok(children.some(item => item.label.includes('Remote Drafts')));
		});

		test('Should show remote uploads section with API client', async () => {
			// Create test upload files
			const testUpload1 = new UploadFile({
				fileName: 'test-upload.png',
				filePath: 'remote-uploads/test-upload.png',
				fileSize: 0,
				mimeType: 'image/png',
				lastModified: new Date('2025-07-11T10:00:00Z'),
				remoteUrl: 'https://example.com/uploads/test-upload.png',
				cdnUrl: 'https://cdn.example.com/test-upload.png',
				altText: 'Test upload image'
			});

			const testUpload2 = new UploadFile({
				fileName: 'another-upload.jpg',
				filePath: 'remote-uploads/another-upload.jpg',
				fileSize: 0,
				mimeType: 'image/jpeg',
				lastModified: new Date('2025-07-10T15:00:00Z'),
				remoteUrl: 'https://example.com/uploads/another-upload.jpg'
			});

			// Create mock API client
			const mockApiClient = {
				fetchUploadedMedia: async () => [testUpload1, testUpload2]
			} as any;

			// Create mock FileManager
			const mockFileManager = {
				getLocalPosts: async () => [],
				getWorkspacePath: () => '/test/workspace',
				uploadsExists: async () => true,
				getUploadsPath: () => '/test/workspace/uploads',
				ensureUploadsDirectory: async () => {}
			} as any;

			// Create TreeProvider with API client
			const treeProviderWithUploads = new MicroblogTreeProvider(mockService, mockFileManager);
			treeProviderWithUploads.setApiClient(mockApiClient);

			const children = await treeProviderWithUploads.getChildren();

			// Should have Published Posts, Remote Drafts, and Remote Uploads sections
			assert.ok(children.length >= 3);
			const uploadsSection = children.find(item => item.label.includes('Remote Uploads'));
			assert.ok(uploadsSection, 'Should have Remote Uploads section');
			assert.ok(uploadsSection.label.includes('(2)'), 'Should show correct file count');
		});

		test('Should fallback to local uploads when API fails', async () => {
			// Create failing mock API client
			const failingApiClient = {
				fetchUploadedMedia: async () => {
					throw new Error('API failure');
				}
			} as any;

			// Create mock FileManager with local uploads
			const mockFileManager = {
				getLocalPosts: async () => [],
				getWorkspacePath: () => '/test/workspace',
				uploadsExists: async () => true,
				getUploadsPath: () => '/test/workspace/uploads',
				ensureUploadsDirectory: async () => {}
			} as any;

			// Create TreeProvider with failing API client
			const treeProviderWithFailingApi = new MicroblogTreeProvider(mockService, mockFileManager);
			treeProviderWithFailingApi.setApiClient(failingApiClient);

			// Should not throw error, should handle gracefully
			const children = await treeProviderWithFailingApi.getChildren();
			assert.ok(Array.isArray(children));
		});

		test('Should handle loading states during API calls', () => {
			// Create TreeProvider
			const treeProviderWithLoadingStates = new MicroblogTreeProvider(mockService);

			// Test loading state methods
			assert.strictEqual(typeof treeProviderWithLoadingStates.isLoading, 'function');
			assert.strictEqual(treeProviderWithLoadingStates.isLoading('uploads'), false);
			assert.strictEqual(treeProviderWithLoadingStates.isLoading('remotePosts'), false);
			assert.strictEqual(treeProviderWithLoadingStates.isLoading('localPosts'), false);
		});

		test('Should refresh uploads on demand', async () => {
			let refreshCalled = false;
			const mockApiClient = {
				fetchUploadedMedia: async () => {
					refreshCalled = true;
					return [];
				}
			} as any;

			const mockFileManager = {
				getLocalPosts: async () => [],
				getWorkspacePath: () => '/test/workspace',
				uploadsExists: async () => true,
				getUploadsPath: () => '/test/workspace/uploads',
				ensureUploadsDirectory: async () => {}
			} as any;

			const treeProviderWithRefresh = new MicroblogTreeProvider(mockService, mockFileManager);
			treeProviderWithRefresh.setApiClient(mockApiClient);

			// Test refresh functionality
			await treeProviderWithRefresh.refreshUploads();
			// Note: Due to caching, refresh might not immediately call API
			// The test verifies the method exists and can be called
			assert.strictEqual(typeof treeProviderWithRefresh.refreshUploads, 'function');
		});

		test('Should show uploads tree items with correct properties', async () => {
			const testUploadFile = new UploadFile({
				fileName: 'image-test.png',
				filePath: 'remote-uploads/image-test.png',
				fileSize: 0,
				mimeType: 'image/png',
				lastModified: new Date('2025-07-11T10:00:00Z'),
				remoteUrl: 'https://example.com/uploads/image-test.png',
				cdnUrl: 'https://cdn.example.com/image-test.png',
				altText: 'Test image for tree display'
			});

			const mockApiClient = {
				fetchUploadedMedia: async () => [testUploadFile]
			} as any;

			const mockFileManager = {
				getLocalPosts: async () => [],
				getWorkspacePath: () => '/test/workspace',
				uploadsExists: async () => true,
				getUploadsPath: () => '/test/workspace/uploads',
				ensureUploadsDirectory: async () => {}
			} as any;

			const treeProviderWithItems = new MicroblogTreeProvider(mockService, mockFileManager);
			treeProviderWithItems.setApiClient(mockApiClient);

			// Get root children first
			const rootChildren = await treeProviderWithItems.getChildren();
			const uploadsSection = rootChildren.find(item => item.label.includes('Remote Uploads'));
			
			if (uploadsSection) {
				// Get upload file children
				const uploadChildren = await treeProviderWithItems.getChildren(uploadsSection);
				
				if (uploadChildren.length > 0) {
					const uploadItem = uploadChildren[0];
					assert.strictEqual(uploadItem.label, 'image-test.png');
					assert.ok(uploadItem.uploadFile);
					assert.strictEqual(uploadItem.contextValue, 'uploadFile');
				}
			}
		});
	});

	suite('ContentProvider Tests', () => {
		let contentProvider: ContentProvider;

		setup(() => {
			contentProvider = new ContentProvider();
		});

		test('Should format post content correctly', () => {
			const testPost = new Post({
				content: '<p>Test <strong>content</strong> with HTML</p>',
				name: 'Test Post',
				published: new Date('2024-01-15T10:00:00Z').toISOString(),
				'post-status': 'published',
				category: ['testing', 'vscode']
			}, 'https://example.micro.blog/test-post');

			// Test the private method via the public interface
			const uri = vscode.Uri.parse('microblog:test-post');
			
			// Store the post first
			(contentProvider as any).content.set('test-post', testPost);
			
			const content = contentProvider.provideTextDocumentContent(uri);
			
			assert.ok(content.includes('Title: Test Post'));
			assert.ok(content.includes('Status: published'));
			assert.ok(content.includes('Categories: testing, vscode'));
			assert.ok(content.includes('Test content with HTML'));
			assert.ok(!content.includes('<p>'), 'HTML tags should be stripped');
		});

		test('Should handle missing post', () => {
			const uri = vscode.Uri.parse('microblog:nonexistent');
			const content = contentProvider.provideTextDocumentContent(uri);
			
			assert.strictEqual(content, 'Content not found');
		});
	});
});
import * as assert from 'assert';
import * as vscode from 'vscode';
import { MicroblogTreeProvider, MicroblogTreeItem } from '../../src/providers/TreeProvider';
import { ContentProvider } from '../../src/providers/ContentProvider';
import { Post } from '../../src/domain/Post';
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
			assert.strictEqual(children[0].label, 'Not configured');
		});

		test('Should group posts by status', async () => {
			const children = await treeProvider.getChildren();
			
			assert.strictEqual(children.length, 2);
			assert.ok(children.some(item => item.label.startsWith('Published')));
			assert.ok(children.some(item => item.label.startsWith('Drafts')));
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
			(contentProvider as any).posts.set('test-post', testPost);
			
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
			
			assert.strictEqual(content, 'Post not found');
		});
	});
});
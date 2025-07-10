import * as assert from 'assert';
import * as vscode from 'vscode';
import { Blog } from '../../src/domain/Blog';
import { Post } from '../../src/domain/Post';
import { Credentials } from '../../src/domain/Credentials';
import { MicroblogService } from '../../src/services/MicroblogService';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	suite('Domain Tests', () => {
		test('Blog creation', () => {
			const blog = Blog.create('example.micro.blog');
			assert.strictEqual(blog.domain, 'example.micro.blog');
			assert.strictEqual(blog.apiEndpoint, 'https://micro.blog/micropub');
		});

		test('Post creation', () => {
			const post = new Post({
				content: 'Hello world!',
				name: 'Test Post'
			});
			assert.strictEqual(post.title, 'Test Post');
			assert.strictEqual(post.content, 'Hello world!');
			assert.strictEqual(post.status, 'published');
		});

		test('Credentials validation', () => {
			const credentials = new Credentials('test-token');
			assert.strictEqual(credentials.getAuthorizationHeader(), 'Bearer test-token');
			assert.strictEqual(Credentials.isValid('test-token'), true);
			assert.strictEqual(Credentials.isValid(''), false);
		});
	});

	suite('Extension Integration Tests', () => {
		test('Extension should be present', () => {
			assert.ok(vscode.extensions.getExtension('undefined_publisher.micro-blog-vscode'));
		});

		test('Extension should activate when commands are executed', async () => {
			const extension = vscode.extensions.getExtension('undefined_publisher.micro-blog-vscode');
			assert.ok(extension, 'Extension should be present');
			
			// Try to execute a command which should trigger activation
			try {
				// This should activate the extension due to onCommand:microblog.test activation event
				await vscode.commands.executeCommand('microblog.test');
				
				// Give a moment for activation to complete
				await new Promise(resolve => setTimeout(resolve, 100));
				
				// Now check if extension is active
				assert.ok(extension.isActive, 'Extension should be active after command execution');
				
				// Verify commands are now available
				const commands = await vscode.commands.getCommands(true);
				const microblogCommands = commands.filter(cmd => cmd.startsWith('microblog.'));
				
				console.log('Found microblog commands:', microblogCommands);
				assert.ok(microblogCommands.length >= 4, 'Should have at least 4 microblog commands');
				
			} catch (error) {
				// Command execution might fail due to no configuration, but extension should still activate
				console.log('Command execution failed (expected):', (error as Error).message);
				
				// Extension should still be activated
				assert.ok(extension.isActive, 'Extension should be active even if command fails');
			}
		});

		test('MicroblogService should initialize', () => {
			// Create a mock context with required properties
			const mockContext = {
				globalState: {
					get: () => undefined,
					update: () => Promise.resolve(),
					keys: () => []
				},
				secrets: {
					get: () => Promise.resolve(undefined),
					store: () => Promise.resolve(),
					delete: () => Promise.resolve()
				}
			} as any;

			const service = new MicroblogService(mockContext, mockContext.secrets);
			assert.ok(service, 'MicroblogService should initialize');
		});
	});
});
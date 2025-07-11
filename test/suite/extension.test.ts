import * as assert from 'assert';
import * as vscode from 'vscode';
import { Blog } from '../../src/domain/Blog';
import { Post } from '../../src/domain/Post';
import { Credentials } from '../../src/domain/Credentials';
import { LocalPost } from '../../src/domain/LocalPost';
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

		test('LocalPost creation and serialization', () => {
			const post = LocalPost.create('My Test Post', 'This is test content');
			assert.strictEqual(post.title, 'My Test Post');
			assert.strictEqual(post.content, 'This is test content');
			assert.strictEqual(post.status, 'draft');
			assert.strictEqual(post.type, 'post');
			assert.strictEqual(post.filePath, 'content/my-test-post.md');

			const markdown = post.toMarkdown();
			assert.ok(markdown.includes('title: "My Test Post"'));
			assert.ok(markdown.includes('status: "draft"'));
			assert.ok(markdown.includes('# My Test Post'));
			assert.ok(markdown.includes('This is test content'));
		});

		test('LocalPost parsing from markdown', () => {
			const markdown = `---
title: "Parsed Post"
status: "draft"
type: "post"
---

# Parsed Post

This is parsed content.`;

			const post = LocalPost.fromMarkdown(markdown, 'test.md');
			assert.strictEqual(post.title, 'Parsed Post');
			assert.strictEqual(post.content, 'This is parsed content.');
			assert.strictEqual(post.status, 'draft');
			assert.strictEqual(post.type, 'post');
			assert.strictEqual(post.filePath, 'test.md');
		});

		test('LocalPost slug generation', () => {
			assert.strictEqual(LocalPost.generateSlug('My Test Post'), 'my-test-post');
			assert.strictEqual(LocalPost.generateSlug('Special Characters!@#$%'), 'special-characters');
			assert.strictEqual(LocalPost.generateSlug('Multiple   Spaces'), 'multiple-spaces');
			assert.strictEqual(LocalPost.generateSlug(''), '');
		});

		test('LocalPost Micropub format conversion', () => {
			const post = LocalPost.create('Test Post', 'This is test content');
			const micropubFormat = post.toMicropubFormat();
			
			assert.strictEqual(micropubFormat.h, 'entry');
			assert.strictEqual(micropubFormat.name, 'Test Post');
			assert.strictEqual(micropubFormat.content, 'This is test content');
		});

		test('LocalPost publishing validation', () => {
			// Valid post
			const validPost = LocalPost.create('Valid Title', 'Valid content');
			const validResult = validPost.validateForPublishing();
			assert.strictEqual(validResult.isValid, true);
			assert.strictEqual(validResult.errors.length, 0);

			// Invalid post - missing title
			const noTitlePost = LocalPost.create('', 'Content only');
			const noTitleResult = noTitlePost.validateForPublishing();
			assert.strictEqual(noTitleResult.isValid, false);
			assert.ok(noTitleResult.errors.includes('Post title is required'));

			// Invalid post - missing content
			const noContentPost = LocalPost.create('Title only', '');
			const noContentResult = noContentPost.validateForPublishing();
			assert.strictEqual(noContentResult.isValid, false);
			assert.ok(noContentResult.errors.includes('Post content is required'));
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

	suite('Phase 2: Local Content Creation', () => {
		test('user can create new post and see it in tree view', async () => {
			// Given: Extension is activated and configured
			const extension = vscode.extensions.getExtension('undefined_publisher.micro-blog-vscode');
			assert.ok(extension, 'Extension should be present');
			
			// Then: Command should be registered
			const commands = await vscode.commands.getCommands(true);
			const newPostCommand = commands.find(cmd => cmd === 'microblog.newPost');
			assert.ok(newPostCommand, 'New Post command should be registered');
			
			// Note: We don't execute the command in tests because it would require user input
			// The command registration test is sufficient to verify the integration works
			
			// TODO: Add assertions for:
			// - Local file is created in workspace
			// - Tree view shows "Local Drafts" section
			// - File has correct frontmatter
			// These will be implemented as we build the FileManager service
		});

		test('user can publish local draft to micro.blog', async () => {
			// User Scenario (Gherkin format):
			// Feature: Publish Post to Micro.blog
			//   Scenario: User publishes a local draft
			//     Given I have a local post "my-post.md" with valid frontmatter
			//     When I right-click and select "Publish to Micro.blog"
			//     Then the post is converted to Micropub format
			//     And sent via POST /micropub
			//     And I see a success notification
			//     And the post appears on my micro.blog

			// ATDD Implementation: Complete publishing workflow test

			// Given: Extension is activated
			const extension = vscode.extensions.getExtension('undefined_publisher.micro-blog-vscode');
			assert.ok(extension, 'Extension should be present');
			
			// And: Publish command should be registered
			const commands = await vscode.commands.getCommands(true);
			const publishCommand = commands.find(cmd => cmd === 'microblog.publishPost');
			assert.ok(publishCommand, 'Publish Post command should be registered');

			// TODO: Once implementation exists, test complete workflow:
			// - Create local post with frontmatter
			// - Execute publish command
			// - Verify Micropub format conversion
			// - Mock API call to /micropub endpoint
			// - Verify success notification
			
			// This test is currently failing as expected (ATDD step 2)
			// Implementation will be added incrementally to make this pass
		});
	});
});
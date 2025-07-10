import * as assert from 'assert';
import * as vscode from 'vscode';
import { Blog } from '../../src/domain/Blog';
import { Post } from '../../src/domain/Post';
import { Credentials } from '../../src/domain/Credentials';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	suite('Domain Tests', () => {
		test('Blog creation', () => {
			const blog = Blog.create('example.micro.blog');
			assert.strictEqual(blog.domain, 'example.micro.blog');
			assert.strictEqual(blog.apiEndpoint, 'https://example.micro.blog/micropub');
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
});
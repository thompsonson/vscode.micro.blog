import * as assert from 'assert';
import * as vscode from 'vscode';
import { UploadFile } from '../../src/domain/UploadFile';

suite('Upload Content Viewing', () => {
	let mockWebviewPanel: vscode.WebviewPanel;
	let mockWebview: vscode.Webview;
	let originalCreateWebviewPanel: typeof vscode.window.createWebviewPanel;
	
	// Persistent state for panel across tests
	let panelTitle = '';
	let htmlContent = '';

	suiteSetup(async () => {
		// Activate the extension before running tests
		const extension = vscode.extensions.getExtension('undefined_publisher.micro-blog-vscode');
		if (extension && !extension.isActive) {
			try {
				await vscode.commands.executeCommand('microblog.test');
			} catch (error) {
				// Expected to fail due to no configuration
			}
			// Give time for activation
			await new Promise(resolve => setTimeout(resolve, 200));
		}
	});

	setup(() => {
		// Reset state for each test
		panelTitle = '';
		htmlContent = '';

		// Mock webview and panel
		mockWebview = {
			get html() { return htmlContent; },
			set html(value: string) { htmlContent = value; },
			cspSource: 'vscode-webview:',
			asWebviewUri: (uri: vscode.Uri) => uri,
			postMessage: async () => true,
			onDidReceiveMessage: () => ({ dispose: () => {} }),
			options: {},
			onDidDispose: () => ({ dispose: () => {} })
		} as any;

		mockWebviewPanel = {
			webview: mockWebview,
			get title() { return panelTitle; },
			set title(value: string) { panelTitle = value; },
			reveal: () => {},
			dispose: () => {},
			onDidDispose: () => ({ dispose: () => {} }),
			onDidChangeViewState: () => ({ dispose: () => {} }),
			visible: true,
			active: true,
			viewType: 'uploadViewer',
			viewColumn: vscode.ViewColumn.One
		} as any;

		// Mock vscode.window.createWebviewPanel
		originalCreateWebviewPanel = vscode.window.createWebviewPanel;
		(vscode.window as any).createWebviewPanel = (viewType: string, title: string, showOptions: any, options?: any) => {
			// Set the title from the parameter
			panelTitle = title;
			return mockWebviewPanel;
		};
	});

	teardown(() => {
		// Restore original function
		(vscode.window as any).createWebviewPanel = originalCreateWebviewPanel;
	});

	test('user clicks image upload and views content', async () => {
		// Given: An image upload file from micro.blog
		const imageUpload = new UploadFile({
			filePath: 'remote-uploads/test-image.png',
			fileName: 'test-image.png',
			fileSize: 1024,
			mimeType: 'image/png',
			lastModified: new Date('2025-07-11T11:53:26+00:00'),
			remoteUrl: 'https://user.domain.com/uploads/2025/test-image.png',
			cdnUrl: 'https://cdn.domain.com/uploads/2025/test-image-large.png',
			altText: 'Test image description',
			publishedDate: '2025-07-11T11:53:26+00:00'
		});

		// When: User executes the viewUpload command (simulating tree item click)
		await vscode.commands.executeCommand('microblog.viewUpload', imageUpload);

		// Then: A webview panel should be created
		assert.ok(mockWebviewPanel, 'Webview panel should be created');
		
		// And: The panel title should show the filename
		assert.strictEqual(mockWebviewPanel.title, 'test-image.png', 'Panel title should show filename');
		
		// And: The webview should contain the image
		assert.ok(mockWebview.html.includes('https://user.domain.com/uploads/2025/test-image.png'), 
			'Webview should contain the image URL');
		
		// And: The webview should contain metadata
		assert.ok(mockWebview.html.includes('Test image description'), 
			'Webview should contain alt text');
		assert.ok(mockWebview.html.includes('1.0 KB'), 
			'Webview should contain formatted file size');
		
		// And: The webview should have action buttons
		assert.ok(mockWebview.html.includes('Copy URL'), 
			'Webview should have Copy URL action');
		assert.ok(mockWebview.html.includes('Copy Markdown'), 
			'Webview should have Copy Markdown action for images');
	});

	test('user clicks document and sees metadata panel', async () => {
		// Given: A non-image upload file
		const documentUpload = new UploadFile({
			filePath: 'remote-uploads/document.pdf',
			fileName: 'document.pdf',
			fileSize: 2048,
			mimeType: 'application/pdf',
			lastModified: new Date('2025-07-10T10:30:00+00:00'),
			remoteUrl: 'https://user.domain.com/uploads/2025/document.pdf',
			publishedDate: '2025-07-10T10:30:00+00:00'
		});

		// When: User executes the viewUpload command
		await vscode.commands.executeCommand('microblog.viewUpload', documentUpload);

		// Then: A webview panel should be created
		assert.ok(mockWebviewPanel, 'Webview panel should be created');
		
		// And: The panel title should show the filename
		assert.strictEqual(mockWebviewPanel.title, 'document.pdf', 'Panel title should show filename');
		
		// And: The webview should NOT contain an image tag (since it's not an image)
		assert.ok(!mockWebview.html.includes('<img'), 
			'Webview should not contain image tag for non-image files');
		
		// And: The webview should contain file metadata
		assert.ok(mockWebview.html.includes('document.pdf'), 
			'Webview should contain filename');
		assert.ok(mockWebview.html.includes('2.0 KB'), 
			'Webview should contain formatted file size');
		assert.ok(mockWebview.html.includes('PDF'), 
			'Webview should indicate file type');
		
		// And: The webview should have appropriate actions (no markdown for non-images)
		assert.ok(mockWebview.html.includes('Copy URL'), 
			'Webview should have Copy URL action');
		assert.ok(mockWebview.html.includes('Open in Browser'), 
			'Webview should have Open in Browser action');
		assert.ok(!mockWebview.html.includes('Copy Markdown'), 
			'Webview should NOT have Copy Markdown for non-image files');
	});

	test('error handling for failed image loads', async () => {
		// Given: An image upload with a potentially broken URL
		const brokenImageUpload = new UploadFile({
			filePath: 'remote-uploads/broken.png',
			fileName: 'broken.png',
			fileSize: 500,
			mimeType: 'image/png',
			lastModified: new Date(),
			remoteUrl: 'https://invalid-domain.com/broken.png'
		});

		// When: User executes the viewUpload command
		await vscode.commands.executeCommand('microblog.viewUpload', brokenImageUpload);

		// Then: A webview panel should still be created
		assert.ok(mockWebviewPanel, 'Webview panel should be created even for broken images');
		
		// And: The webview should include error handling JavaScript
		assert.ok(mockWebview.html.includes('onerror'), 
			'Webview should include error handling for image load failures');
		
		// And: There should be a loading state
		assert.ok(mockWebview.html.includes('Loading') || mockWebview.html.includes('loading'), 
			'Webview should show loading state');
	});

	test('user clicks text file and sees content preview', async () => {
		// Given: A text file upload
		const textUpload = new UploadFile({
			filePath: 'remote-uploads/config.json',
			fileName: 'config.json',
			fileSize: 256,
			mimeType: 'application/json',
			lastModified: new Date('2025-07-15T10:00:00+00:00'),
			remoteUrl: 'https://user.domain.com/uploads/2025/config.json',
			publishedDate: '2025-07-15T10:00:00+00:00'
		});

		// When: User executes the viewUpload command
		await vscode.commands.executeCommand('microblog.viewUpload', textUpload);

		// Then: A webview panel should be created
		assert.ok(mockWebviewPanel, 'Webview panel should be created');
		
		// And: The panel title should show the filename
		assert.strictEqual(mockWebviewPanel.title, 'config.json', 'Panel title should show filename');
		
		// And: The webview should contain text preview content
		assert.ok(mockWebview.html.includes('text-preview') || mockWebview.html.includes('Text Preview'), 
			'Webview should contain text preview content');
		
		// And: The webview should show it's a text file
		assert.ok(mockWebview.html.includes('JSON') || mockWebview.html.includes('json'), 
			'Webview should indicate JSON file type');
		
		// And: The webview should have appropriate actions including text-specific ones
		assert.ok(mockWebview.html.includes('Copy URL'), 
			'Webview should have Copy URL action');
		assert.ok(mockWebview.html.includes('Copy Content'), 
			'Webview should have Copy Content action for text files');
		assert.ok(mockWebview.html.includes('Open in Browser'), 
			'Webview should have Open in Browser action');
	});

	test('panel reuse - clicking different uploads updates same panel', async () => {
		// Given: Two different upload files
		const firstUpload = new UploadFile({
			filePath: 'remote-uploads/first.png',
			fileName: 'first.png',
			fileSize: 1024,
			mimeType: 'image/png',
			lastModified: new Date(),
			remoteUrl: 'https://domain.com/first.png'
		});

		const secondUpload = new UploadFile({
			filePath: 'remote-uploads/second.pdf',
			fileName: 'second.pdf',
			fileSize: 2048,
			mimeType: 'application/pdf',
			lastModified: new Date(),
			remoteUrl: 'https://domain.com/second.pdf'
		});

		// When: User views first upload
		await vscode.commands.executeCommand('microblog.viewUpload', firstUpload);
		const firstTitle = mockWebviewPanel.title;
		const firstHtml = mockWebview.html;

		// And: User views second upload
		await vscode.commands.executeCommand('microblog.viewUpload', secondUpload);

		// Then: The panel title should update to second file
		assert.strictEqual(mockWebviewPanel.title, 'second.pdf', 
			'Panel title should update to show new filename');
		
		// And: The HTML content should change
		assert.notStrictEqual(mockWebview.html, firstHtml, 
			'Webview content should update when viewing different file');
		
		// And: The content should reflect the new file
		assert.ok(mockWebview.html.includes('second.pdf'), 
			'Updated content should show second filename');
		assert.ok(!mockWebview.html.includes('first.png'), 
			'Updated content should not show first filename');
	});
});
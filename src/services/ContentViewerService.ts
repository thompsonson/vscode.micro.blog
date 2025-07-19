import * as vscode from 'vscode';
import { UploadFile } from '../domain/UploadFile';

/**
 * ContentViewerService - handles displaying upload content in webview panels
 * Following DDD principles: Application service layer orchestrating UI operations
 */
export class ContentViewerService {
	private panel: vscode.WebviewPanel | undefined;
	private context: vscode.ExtensionContext;

	constructor(context: vscode.ExtensionContext) {
		this.context = context;
	}

	/**
	 * Display an upload file in a webview panel
	 * Creates new panel or reuses existing one
	 */
	async displayUpload(uploadFile: UploadFile): Promise<void> {
		// Create or reuse existing panel
		if (!this.panel) {
			this.panel = vscode.window.createWebviewPanel(
				'uploadViewer',
				uploadFile.fileName,
				vscode.ViewColumn.One,
				{
					enableScripts: true,
					retainContextWhenHidden: true,
					localResourceRoots: [] // No local resources needed for remote uploads
				}
			);

			// Handle panel disposal
			this.panel.onDidDispose(() => {
				this.panel = undefined;
			});

			// Handle messages from webview
			this.panel.webview.onDidReceiveMessage(
				message => this.handleWebviewMessage(message, uploadFile),
				undefined,
				this.context.subscriptions
			);
		} else {
			// Update existing panel title
			this.panel.title = uploadFile.fileName;
			this.panel.reveal();
		}

		// Update panel content
		this.panel.webview.html = this.getWebviewContent(uploadFile);
	}

	/**
	 * Generate HTML content for the webview based on file type
	 */
	private getWebviewContent(uploadFile: UploadFile): string {
		const cspSource = 'vscode-webview:';
		
		if (uploadFile.isImageFile()) {
			return this.getImageViewerHtml(uploadFile, cspSource);
		} else if (uploadFile.isTextFile()) {
			return this.getTextPreviewHtml(uploadFile, cspSource);
		} else {
			return this.getMetadataPanelHtml(uploadFile, cspSource);
		}
	}

	/**
	 * Generate HTML for image files with image display and metadata
	 */
	private getImageViewerHtml(uploadFile: UploadFile, cspSource: string): string {
		const imageUrl = uploadFile.getOptimalUrl();
		const altText = uploadFile.altText || uploadFile.fileName;
		const fileSize = uploadFile.formattedSize;
		
		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="Content-Security-Policy" content="
		default-src 'none';
		img-src https: data:;
		style-src ${cspSource} 'unsafe-inline';
		script-src ${cspSource};
	">
	<title>Image Viewer - ${uploadFile.fileName}</title>
	<style>
		body {
			font-family: var(--vscode-font-family);
			padding: 20px;
			margin: 0;
			background: var(--vscode-editor-background);
			color: var(--vscode-editor-foreground);
		}
		.container {
			max-width: 800px;
			margin: 0 auto;
		}
		.image-container {
			text-align: center;
			margin-bottom: 20px;
			position: relative;
		}
		.image-container img {
			max-width: 100%;
			height: auto;
			border: 1px solid var(--vscode-panel-border);
			border-radius: 4px;
		}
		.loading {
			display: none;
			color: var(--vscode-descriptionForeground);
			font-style: italic;
		}
		.error {
			display: none;
			color: var(--vscode-errorForeground);
			background: var(--vscode-inputValidation-errorBackground);
			border: 1px solid var(--vscode-inputValidation-errorBorder);
			padding: 10px;
			border-radius: 4px;
			margin: 10px 0;
		}
		.metadata {
			background: var(--vscode-editor-background);
			border: 1px solid var(--vscode-panel-border);
			border-radius: 4px;
			padding: 15px;
			margin-bottom: 20px;
		}
		.metadata h3 {
			margin-top: 0;
			color: var(--vscode-foreground);
		}
		.metadata-item {
			margin: 8px 0;
		}
		.metadata-label {
			font-weight: bold;
			color: var(--vscode-foreground);
		}
		.actions {
			display: flex;
			gap: 10px;
			flex-wrap: wrap;
		}
		.action-button {
			background: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			border: none;
			padding: 8px 16px;
			border-radius: 4px;
			cursor: pointer;
			font-size: 13px;
		}
		.action-button:hover {
			background: var(--vscode-button-hoverBackground);
		}
		.action-button:active {
			background: var(--vscode-button-background);
		}
	</style>
</head>
<body>
	<div class="container">
		<div class="image-container">
			<div class="loading" id="loading">Loading image...</div>
			<div class="error" id="error">
				Failed to load image. 
				<button class="action-button" onclick="retryLoad()">Retry</button>
			</div>
			<img src="${imageUrl}" 
				 alt="${altText}" 
				 onload="imageLoaded()" 
				 onerror="imageError()"
				 id="mainImage">
		</div>

		<div class="metadata">
			<h3>File Information</h3>
			<div class="metadata-item">
				<span class="metadata-label">Filename:</span> ${uploadFile.fileName}
			</div>
			<div class="metadata-item">
				<span class="metadata-label">Size:</span> ${fileSize}
			</div>
			${uploadFile.altText ? `
			<div class="metadata-item">
				<span class="metadata-label">Description:</span> ${uploadFile.altText}
			</div>
			` : ''}
			${uploadFile.publishedDate ? `
			<div class="metadata-item">
				<span class="metadata-label">Uploaded:</span> ${new Date(uploadFile.publishedDate).toLocaleDateString()}
			</div>
			` : ''}
		</div>

		<div class="actions">
			<button class="action-button" onclick="copyUrl()">Copy URL</button>
			<button class="action-button" onclick="copyMarkdown()">Copy Markdown</button>
			<button class="action-button" onclick="copyHtml()">Copy HTML</button>
			<button class="action-button" onclick="openInBrowser()">Open in Browser</button>
		</div>
	</div>

	<script>
		const vscode = acquireVsCodeApi();

		function imageLoaded() {
			document.getElementById('loading').style.display = 'none';
			document.getElementById('error').style.display = 'none';
		}

		function imageError() {
			document.getElementById('loading').style.display = 'none';
			document.getElementById('error').style.display = 'block';
		}

		function retryLoad() {
			const img = document.getElementById('mainImage');
			document.getElementById('error').style.display = 'none';
			document.getElementById('loading').style.display = 'block';
			img.src = img.src; // Trigger reload
		}

		function copyUrl() {
			vscode.postMessage({ command: 'copyUrl', url: '${imageUrl}' });
		}

		function copyMarkdown() {
			vscode.postMessage({ command: 'copyMarkdown' });
		}

		function copyHtml() {
			vscode.postMessage({ command: 'copyHtml' });
		}

		function openInBrowser() {
			vscode.postMessage({ command: 'openInBrowser', url: '${imageUrl}' });
		}

		// Show loading initially
		document.getElementById('loading').style.display = 'block';
	</script>
</body>
</html>`;
	}

	/**
	 * Generate HTML for non-image files with metadata display
	 */
	private getMetadataPanelHtml(uploadFile: UploadFile, cspSource: string): string {
		const fileSize = uploadFile.formattedSize;
		const fileType = uploadFile.mimeType.split('/')[1].toUpperCase();
		const fileUrl = uploadFile.getOptimalUrl();
		
		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="Content-Security-Policy" content="
		default-src 'none';
		style-src ${cspSource} 'unsafe-inline';
		script-src ${cspSource};
	">
	<title>File Info - ${uploadFile.fileName}</title>
	<style>
		body {
			font-family: var(--vscode-font-family);
			padding: 20px;
			margin: 0;
			background: var(--vscode-editor-background);
			color: var(--vscode-editor-foreground);
		}
		.container {
			max-width: 600px;
			margin: 0 auto;
		}
		.file-icon {
			text-align: center;
			margin-bottom: 20px;
		}
		.file-icon .icon {
			font-size: 48px;
			color: var(--vscode-symbolIcon-fileForeground);
		}
		.metadata {
			background: var(--vscode-editor-background);
			border: 1px solid var(--vscode-panel-border);
			border-radius: 4px;
			padding: 20px;
			margin-bottom: 20px;
		}
		.metadata h2 {
			margin-top: 0;
			color: var(--vscode-foreground);
			text-align: center;
		}
		.metadata-item {
			margin: 12px 0;
			display: flex;
			justify-content: space-between;
		}
		.metadata-label {
			font-weight: bold;
			color: var(--vscode-foreground);
		}
		.metadata-value {
			color: var(--vscode-descriptionForeground);
		}
		.actions {
			display: flex;
			gap: 10px;
			flex-wrap: wrap;
			justify-content: center;
		}
		.action-button {
			background: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			border: none;
			padding: 10px 20px;
			border-radius: 4px;
			cursor: pointer;
			font-size: 13px;
		}
		.action-button:hover {
			background: var(--vscode-button-hoverBackground);
		}
	</style>
</head>
<body>
	<div class="container">
		<div class="file-icon">
			<div class="icon">📄</div>
		</div>

		<div class="metadata">
			<h2>${uploadFile.fileName}</h2>
			<div class="metadata-item">
				<span class="metadata-label">Type:</span>
				<span class="metadata-value">${fileType}</span>
			</div>
			<div class="metadata-item">
				<span class="metadata-label">Size:</span>
				<span class="metadata-value">${fileSize}</span>
			</div>
			${uploadFile.publishedDate ? `
			<div class="metadata-item">
				<span class="metadata-label">Uploaded:</span>
				<span class="metadata-value">${new Date(uploadFile.publishedDate).toLocaleDateString()}</span>
			</div>
			` : ''}
			<div class="metadata-item">
				<span class="metadata-label">MIME Type:</span>
				<span class="metadata-value">${uploadFile.mimeType}</span>
			</div>
		</div>

		<div class="actions">
			<button class="action-button" onclick="copyUrl()">Copy URL</button>
			<button class="action-button" onclick="openInBrowser()">Open in Browser</button>
		</div>
	</div>

	<script>
		const vscode = acquireVsCodeApi();

		function copyUrl() {
			vscode.postMessage({ command: 'copyUrl', url: '${fileUrl}' });
		}

		function openInBrowser() {
			vscode.postMessage({ command: 'openInBrowser', url: '${fileUrl}' });
		}
	</script>
</body>
</html>`;
	}

	/**
	 * Generate HTML for text files with content preview and metadata
	 */
	private getTextPreviewHtml(uploadFile: UploadFile, cspSource: string): string {
		const fileSize = uploadFile.formattedSize;
		const fileType = uploadFile.mimeType.split('/')[1].toUpperCase();
		const fileUrl = uploadFile.getOptimalViewingUrl();
		
		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="Content-Security-Policy" content="
		default-src 'none';
		style-src ${cspSource} 'unsafe-inline';
		script-src ${cspSource};
		connect-src https:;
	">
	<title>Text Preview - ${uploadFile.fileName}</title>
	<style>
		body {
			font-family: var(--vscode-font-family);
			padding: 20px;
			margin: 0;
			background: var(--vscode-editor-background);
			color: var(--vscode-editor-foreground);
		}
		.container {
			max-width: 800px;
			margin: 0 auto;
		}
		.file-icon {
			text-align: center;
			margin-bottom: 20px;
		}
		.file-icon .icon {
			font-size: 48px;
			color: var(--vscode-symbolIcon-textForeground);
		}
		.metadata {
			background: var(--vscode-editor-background);
			border: 1px solid var(--vscode-panel-border);
			border-radius: 4px;
			padding: 15px;
			margin-bottom: 20px;
		}
		.metadata h2 {
			margin-top: 0;
			color: var(--vscode-foreground);
			text-align: center;
		}
		.metadata-item {
			margin: 8px 0;
			display: flex;
			justify-content: space-between;
		}
		.metadata-label {
			font-weight: bold;
			color: var(--vscode-foreground);
		}
		.metadata-value {
			color: var(--vscode-descriptionForeground);
		}
		.text-preview {
			background: var(--vscode-editor-background);
			border: 1px solid var(--vscode-panel-border);
			border-radius: 4px;
			padding: 15px;
			margin-bottom: 20px;
			max-height: 400px;
			overflow-y: auto;
		}
		.text-preview h3 {
			margin-top: 0;
			color: var(--vscode-foreground);
		}
		.text-content {
			font-family: var(--vscode-editor-font-family);
			font-size: var(--vscode-editor-font-size);
			white-space: pre-wrap;
			word-wrap: break-word;
			background: var(--vscode-textCodeBlock-background);
			border: 1px solid var(--vscode-textBlockQuote-border);
			border-radius: 3px;
			padding: 10px;
			margin: 10px 0;
		}
		.loading {
			color: var(--vscode-descriptionForeground);
			font-style: italic;
			text-align: center;
		}
		.error {
			color: var(--vscode-errorForeground);
			background: var(--vscode-inputValidation-errorBackground);
			border: 1px solid var(--vscode-inputValidation-errorBorder);
			padding: 10px;
			border-radius: 4px;
			margin: 10px 0;
		}
		.size-warning {
			color: var(--vscode-notificationsWarningIcon-foreground);
			background: var(--vscode-inputValidation-warningBackground);
			border: 1px solid var(--vscode-inputValidation-warningBorder);
			padding: 10px;
			border-radius: 4px;
			margin: 10px 0;
		}
		.actions {
			display: flex;
			gap: 10px;
			flex-wrap: wrap;
			justify-content: center;
		}
		.action-button {
			background: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			border: none;
			padding: 10px 20px;
			border-radius: 4px;
			cursor: pointer;
			font-size: 13px;
		}
		.action-button:hover {
			background: var(--vscode-button-hoverBackground);
		}
	</style>
</head>
<body>
	<div class="container">
		<div class="file-icon">
			<div class="icon">📝</div>
		</div>

		<div class="metadata">
			<h2>${uploadFile.fileName}</h2>
			<div class="metadata-item">
				<span class="metadata-label">Type:</span>
				<span class="metadata-value">${fileType}</span>
			</div>
			<div class="metadata-item">
				<span class="metadata-label">Size:</span>
				<span class="metadata-value">${fileSize}</span>
			</div>
			${uploadFile.publishedDate ? `
			<div class="metadata-item">
				<span class="metadata-label">Uploaded:</span>
				<span class="metadata-value">${new Date(uploadFile.publishedDate).toLocaleDateString()}</span>
			</div>
			` : ''}
			<div class="metadata-item">
				<span class="metadata-label">MIME Type:</span>
				<span class="metadata-value">${uploadFile.mimeType}</span>
			</div>
		</div>

		<div class="text-preview">
			<h3>Text Preview</h3>
			<div class="loading" id="loading">Loading text content...</div>
			<div class="error" id="error" style="display: none;">
				Failed to load text content. The file may be too large or inaccessible.
			</div>
			<div class="size-warning" id="size-warning" style="display: none;">
				File is large (>1MB). Showing first 50KB only.
			</div>
			<div class="text-content" id="text-content" style="display: none;"></div>
		</div>

		<div class="actions">
			<button class="action-button" onclick="copyUrl()">Copy URL</button>
			<button class="action-button" onclick="copyContent()">Copy Content</button>
			<button class="action-button" onclick="openInBrowser()">Open in Browser</button>
		</div>
	</div>

	<script>
		const vscode = acquireVsCodeApi();

		// Load text content immediately
		loadTextContent();

		async function loadTextContent() {
			try {
				const response = await fetch('${fileUrl}');
				if (!response.ok) {
					throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
				}

				const contentLength = response.headers.get('content-length');
				const maxSize = 1024 * 1024; // 1MB
				const truncateSize = 50 * 1024; // 50KB

				let text;
				if (contentLength && parseInt(contentLength) > maxSize) {
					// Show warning for large files
					document.getElementById('size-warning').style.display = 'block';
					
					// Read only first 50KB
					const reader = response.body.getReader();
					const chunks = [];
					let receivedLength = 0;
					
					while (receivedLength < truncateSize) {
						const { done, value } = await reader.read();
						if (done) break;
						chunks.push(value);
						receivedLength += value.length;
					}
					
					const concatenated = new Uint8Array(receivedLength);
					let position = 0;
					for (let chunk of chunks) {
						concatenated.set(chunk, position);
						position += chunk.length;
					}
					
					text = new TextDecoder().decode(concatenated);
					text += '\\n\\n[Content truncated - file is larger than 1MB]';
				} else {
					text = await response.text();
				}

				document.getElementById('loading').style.display = 'none';
				document.getElementById('text-content').textContent = text;
				document.getElementById('text-content').style.display = 'block';

			} catch (error) {
				console.error('Failed to load text content:', error);
				document.getElementById('loading').style.display = 'none';
				document.getElementById('error').style.display = 'block';
			}
		}

		function copyUrl() {
			vscode.postMessage({ command: 'copyUrl', url: '${fileUrl}' });
		}

		function copyContent() {
			const textContent = document.getElementById('text-content').textContent;
			if (textContent) {
				vscode.postMessage({ command: 'copyTextContent', content: textContent });
			}
		}

		function openInBrowser() {
			vscode.postMessage({ command: 'openInBrowser', url: '${fileUrl}' });
		}
	</script>
</body>
</html>`;
	}

	/**
	 * Handle messages from the webview (action button clicks)
	 */
	private async handleWebviewMessage(message: any, uploadFile: UploadFile): Promise<void> {
		switch (message.command) {
			case 'copyUrl':
				await vscode.env.clipboard.writeText(message.url);
				vscode.window.showInformationMessage(`URL copied to clipboard: ${message.url}`);
				break;

			case 'copyMarkdown':
				if (uploadFile.isImageFile()) {
					const markdown = uploadFile.toMarkdown();
					await vscode.env.clipboard.writeText(markdown);
					vscode.window.showInformationMessage(`Markdown copied to clipboard: ${markdown}`);
				}
				break;

			case 'copyHtml':
				if (uploadFile.isImageFile()) {
					const html = uploadFile.toHtml();
					await vscode.env.clipboard.writeText(html);
					vscode.window.showInformationMessage(`HTML copied to clipboard: ${html}`);
				}
				break;

			case 'openInBrowser':
				await vscode.env.openExternal(vscode.Uri.parse(message.url));
				break;

			case 'copyTextContent':
				await vscode.env.clipboard.writeText(message.content);
				vscode.window.showInformationMessage('Text content copied to clipboard');
				break;

			default:
				console.log('[Micro.blog] Unknown webview message:', message);
		}
	}
}
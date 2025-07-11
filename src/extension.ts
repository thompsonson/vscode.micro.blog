import * as vscode from 'vscode';
import * as path from 'path';

import { MicroblogService } from './services/MicroblogService';
import { FileManager } from './services/FileManager';
import { PublishingService } from './services/PublishingService';
import { MediaService } from './services/MediaService';
import { MicroblogTreeProvider, MicroblogTreeItem } from './providers/TreeProvider';
import { ContentProvider } from './providers/ContentProvider';
import { LocalPost } from './domain/LocalPost';
import { MediaAsset } from './domain/MediaAsset';

export function activate(context: vscode.ExtensionContext) {
	console.log('[Micro.blog] Extension activated');

	try {
		// Initialize services
		const microblogService = new MicroblogService(context, context.secrets);
		let fileManager: FileManager | undefined;
		
		// Try to initialize FileManager (requires workspace)
		try {
			fileManager = new FileManager();
		} catch (error) {
			console.log('[Micro.blog] FileManager not available - no workspace open');
		}
		
		// Initialize providers
		const treeProvider = new MicroblogTreeProvider(microblogService, fileManager);
		const contentProvider = new ContentProvider();
		
		// Set up API client for uploads if already configured
		(async () => {
			try {
				const isConfigured = await microblogService.isConfigured();
				if (isConfigured) {
					console.log('[Micro.blog] Extension already configured, setting up API client for uploads');
					const apiClient = await microblogService.getApiClient();
					if (apiClient) {
						console.log('[Micro.blog] API client obtained during activation, setting on TreeProvider');
						treeProvider.setApiClient(apiClient);
					} else {
						console.log('[Micro.blog] Warning: No API client available despite being configured');
					}
				} else {
					console.log('[Micro.blog] Extension not configured yet, uploads will be available after configuration');
				}
			} catch (error) {
				console.error('[Micro.blog] Failed to set up API client during activation:', error);
			}
		})();
		
		// Register tree view
		const treeView = vscode.window.createTreeView('microblogPosts', {
			treeDataProvider: treeProvider,
			showCollapseAll: true
		});

		// Set up file watcher for local content changes
		let fileWatcher: vscode.FileSystemWatcher | undefined;
		if (fileManager) {
			try {
				fileWatcher = fileManager.watchLocalChanges();
				
				// Refresh tree view when files change
				fileWatcher.onDidCreate(() => {
					console.log('[Micro.blog] Local content created - refreshing tree view');
					treeProvider.refresh();
				});
				
				fileWatcher.onDidChange(() => {
					console.log('[Micro.blog] Local content changed - refreshing tree view');
					treeProvider.refresh();
				});
				
				fileWatcher.onDidDelete(() => {
					console.log('[Micro.blog] Local content deleted - refreshing tree view');
					treeProvider.refresh();
				});
			} catch (error) {
				console.error('[Micro.blog] Failed to set up file watcher:', error);
			}
		}
		
		// Register content provider
		const contentProviderDisposable = vscode.workspace.registerTextDocumentContentProvider('microblog', contentProvider);
		
		// Test connection command
		const testCommand = vscode.commands.registerCommand('microblog.test', async () => {
			try {
				await vscode.window.withProgress({
					location: vscode.ProgressLocation.Notification,
					title: 'Testing micro.blog connection...',
					cancellable: false
				}, async (progress) => {
					const result = await microblogService.testConnection();
					
					if (result.isValid && result.userInfo) {
						const message = `✅ Connected as ${result.userInfo.name} (@${result.userInfo.username})\n📊 ${result.postCount} posts available`;
						vscode.window.showInformationMessage(message);
					} else {
						vscode.window.showErrorMessage(`❌ Connection failed: ${result.error}`);
					}
				});
			} catch (error) {
				console.error('[Micro.blog] Test connection failed:', error);
				vscode.window.showErrorMessage(`❌ Test failed: ${error}`);
			}
		});

		// Configure command
		const configureBlog = vscode.commands.registerCommand('microblog.configure', async () => {
			try {
				const appToken = await vscode.window.showInputBox({
					prompt: 'Enter your micro.blog app token',
					placeHolder: 'App token from Account → Edit Apps → New Token',
					password: true,
					validateInput: (value) => {
						if (!value || !value.trim()) {
							return 'App token is required';
						}
						return null;
					}
				});

				if (!appToken) {
					return;
				}
				await vscode.window.withProgress({
					location: vscode.ProgressLocation.Notification,
					title: 'Configuring micro.blog...',
					cancellable: false
				}, async (progress) => {
					await microblogService.configureBlog(appToken);
					
					// Set up API client for uploads functionality
					console.log('[Micro.blog] Setting up API client for TreeProvider uploads');
					try {
						const apiClient = await microblogService.getApiClient();
						if (apiClient) {
							console.log('[Micro.blog] API client obtained, setting on TreeProvider');
							treeProvider.setApiClient(apiClient);
						} else {
							console.log('[Micro.blog] Warning: API client not available after configuration');
						}
					} catch (error) {
						console.error('[Micro.blog] Failed to get API client for TreeProvider:', error);
					}
				});

				vscode.window.showInformationMessage('Micro.blog configured successfully!');
				
				// Refresh tree view to show posts and uploads
				console.log('[Micro.blog] Refreshing tree view after configuration');
				treeProvider.refresh();
				
			} catch (error) {
				console.error('[Micro.blog] Configuration failed:', error);
				vscode.window.showErrorMessage(`Configuration failed: ${error}`);
			}
		});
		
		// View post command (triggered by tree item clicks)
		const viewPostCommand = vscode.commands.registerCommand('microblog.viewPost', (post) => {
			contentProvider.showPost(post);
		});

		// Open local post command
		const openLocalPostCommand = vscode.commands.registerCommand('microblog.openLocalPost', async (localPost) => {
			if (!fileManager) {
				vscode.window.showErrorMessage('No workspace available to open local posts.');
				return;
			}

			try {
				const workspacePath = fileManager.getWorkspacePath();
				const fullPath = path.join(workspacePath, localPost.filePath);
				const fileUri = vscode.Uri.file(fullPath);
				
				const document = await vscode.workspace.openTextDocument(fileUri);
				await vscode.window.showTextDocument(document);
			} catch (error) {
				console.error('[Micro.blog] Failed to open local post:', error);
				vscode.window.showErrorMessage(`Failed to open local post: ${error}`);
			}
		});
		
		// Refresh command
		const refreshCommand = vscode.commands.registerCommand('microblog.refresh', async () => {
			try {
				await vscode.window.withProgress({
					location: vscode.ProgressLocation.Notification,
					title: 'Refreshing micro.blog posts...',
					cancellable: false
				}, async (progress) => {
					treeProvider.refresh();
				});
				vscode.window.showInformationMessage('Posts refreshed successfully!');
			} catch (error) {
				console.error('[Micro.blog] Refresh failed:', error);
				vscode.window.showErrorMessage(`Refresh failed: ${error}`);
			}
		});

		// New Post command
		const newPostCommand = vscode.commands.registerCommand('microblog.newPost', async () => {
			try {
				if (!fileManager) {
					vscode.window.showErrorMessage('Please open a workspace folder to create new posts.');
					return;
				}

				const title = await vscode.window.showInputBox({
					prompt: 'Enter title for your new post',
					placeHolder: 'My New Post',
					validateInput: (value) => {
						if (!value || !value.trim()) {
							return 'Post title is required';
						}
						return null;
					}
				});

				if (!title) {
					return;
				}

				await vscode.window.withProgress({
					location: vscode.ProgressLocation.Notification,
					title: 'Creating new post...',
					cancellable: false
				}, async () => {
					await fileManager!.createNewPost(title.trim());
				});

				vscode.window.showInformationMessage(`New post "${title}" created successfully!`);
				
				// Refresh tree view to show the new post
				treeProvider.refresh();
				
			} catch (error) {
				console.error('[Micro.blog] New post creation failed:', error);
				vscode.window.showErrorMessage(`Failed to create new post: ${error}`);
			}
		});

		// Upload Image command
		const uploadImageCommand = vscode.commands.registerCommand('microblog.uploadImage', async (fileUri?: vscode.Uri) => {
			try {
				// Check if user is configured
				const credentials = await microblogService.getCredentials();
				if (!credentials) {
					vscode.window.showErrorMessage('Please configure micro.blog first.');
					return;
				}

				// Get API client
				const apiClient = await microblogService.getApiClient();
				if (!apiClient) {
					vscode.window.showErrorMessage('API client not available. Please reconfigure micro.blog.');
					return;
				}

				let selectedFileUri: vscode.Uri;

				// If no file URI provided, show file dialog
				if (!fileUri) {
					const fileUris = await vscode.window.showOpenDialog({
						canSelectFiles: true,
						canSelectFolders: false,
						canSelectMany: false,
						filters: {
							'Images': ['jpg', 'jpeg', 'png', 'gif']
						},
						openLabel: 'Select Image to Upload'
					});

					if (!fileUris || fileUris.length === 0) {
						return;
					}

					selectedFileUri = fileUris[0];
				} else {
					selectedFileUri = fileUri;
				}

				// Get file stats
				const fileStat = await vscode.workspace.fs.stat(selectedFileUri);
				const fileName = path.basename(selectedFileUri.fsPath);

				// Create MediaAsset for validation
				const mediaAsset = MediaAsset.fromFile(selectedFileUri.fsPath, fileName, fileStat.size);

				// Validate the file
				const validation = mediaAsset.validate();
				if (!validation.isValid) {
					vscode.window.showErrorMessage(`Invalid file: ${validation.errors.join(', ')}`);
					return;
				}

				// Create MediaService and upload with progress
				const mediaService = new MediaService(apiClient);
				
				await vscode.window.withProgress({
					location: vscode.ProgressLocation.Notification,
					title: `Uploading ${fileName}...`,
					cancellable: false
				}, async (progress) => {
					progress.report({ message: 'Validating file...' });
					
					// Get current blog configuration for micropub endpoint
					const config = await microblogService.getBlogConfiguration();
					if (!config || !config.domain) {
						throw new Error('Blog not configured properly');
					}
					
					const micropubEndpoint = `https://micro.blog/micropub`;
					
					progress.report({ message: 'Uploading to micro.blog...' });
					
					const result = await mediaService.uploadImage(mediaAsset, micropubEndpoint);
					
					if (result.success && result.url) {
						// Show success with copy options
						const action = await vscode.window.showInformationMessage(
							`✅ Image uploaded successfully!`,
							'Copy URL',
							'Copy Markdown'
						);
						
						if (action === 'Copy URL') {
							await vscode.env.clipboard.writeText(result.url);
							vscode.window.showInformationMessage('URL copied to clipboard!');
						} else if (action === 'Copy Markdown') {
							const markdown = mediaService.formatAsMarkdown(result.url, fileName.split('.')[0]);
							await vscode.env.clipboard.writeText(markdown);
							vscode.window.showInformationMessage('Markdown copied to clipboard!');
						}
					} else {
						vscode.window.showErrorMessage(`❌ Upload failed: ${result.error}`);
					}
				});

			} catch (error) {
				console.error('[Micro.blog] Upload image failed:', error);
				vscode.window.showErrorMessage(`Failed to upload image: ${error}`);
			}
		});

		// Publish Post command
		const publishPostCommand = vscode.commands.registerCommand('microblog.publishPost', async (treeItem: MicroblogTreeItem) => {
			try {
				if (!treeItem || !treeItem.localPost) {
					vscode.window.showErrorMessage('No post selected for publishing.');
					return;
				}

				// Extract LocalPost data from TreeItem and create proper instance
				const localPostData = treeItem.localPost;
				const localPost = new LocalPost({
					title: localPostData.title,
					content: localPostData.content,
					status: localPostData.status,
					type: localPostData.type,
					postId: localPostData.postId,
					lastSync: localPostData.lastSync ? new Date(localPostData.lastSync) : undefined,
					filePath: localPostData.filePath
				});

				// Get current credentials from the service
				const credentials = await microblogService.getCredentials();
				if (!credentials) {
					vscode.window.showErrorMessage('Please configure micro.blog first.');
					return;
				}

				// Create API client and publishing service
				const apiClient = await microblogService.getApiClient();
				if (!apiClient) {
					vscode.window.showErrorMessage('API client not available. Please reconfigure micro.blog.');
					return;
				}

				const publishingService = new PublishingService(apiClient);

				await vscode.window.withProgress({
					location: vscode.ProgressLocation.Notification,
					title: `Publishing "${localPost.title}"...`,
					cancellable: false
				}, async () => {
					const result = await publishingService.publishPost(localPost);
					
					if (result.success) {
						const message = result.url 
							? `✅ Post published successfully: ${result.url}`
							: `✅ Post published successfully!`;
						vscode.window.showInformationMessage(message);
					} else {
						vscode.window.showErrorMessage(`❌ Publishing failed: ${result.error}`);
					}
				});

			} catch (error) {
				console.error('[Micro.blog] Publish post failed:', error);
				vscode.window.showErrorMessage(`Failed to publish post: ${error}`);
			}
		});

		// Copy as Markdown command
		const copyAsMarkdownCommand = vscode.commands.registerCommand('microblog.copyAsMarkdown', async (treeItem: MicroblogTreeItem) => {
			try {
				if (!treeItem || !treeItem.uploadFile) {
					vscode.window.showErrorMessage('No upload file selected.');
					return;
				}

				const uploadFile = treeItem.uploadFile;
				if (!uploadFile.isImageFile()) {
					vscode.window.showErrorMessage('Markdown format is only available for image files.');
					return;
				}

				const markdown = uploadFile.toMarkdown();
				await vscode.env.clipboard.writeText(markdown);
				vscode.window.showInformationMessage(`Markdown format copied to clipboard: ${markdown}`);

			} catch (error) {
				console.error('[Micro.blog] Copy as markdown failed:', error);
				vscode.window.showErrorMessage(`Failed to copy markdown format: ${error}`);
			}
		});

		// Copy as HTML command
		const copyAsHtmlCommand = vscode.commands.registerCommand('microblog.copyAsHtml', async (treeItem: MicroblogTreeItem) => {
			try {
				if (!treeItem || !treeItem.uploadFile) {
					vscode.window.showErrorMessage('No upload file selected.');
					return;
				}

				const uploadFile = treeItem.uploadFile;
				if (!uploadFile.isImageFile()) {
					vscode.window.showErrorMessage('HTML format is only available for image files.');
					return;
				}

				const html = uploadFile.toHtml();
				await vscode.env.clipboard.writeText(html);
				vscode.window.showInformationMessage(`HTML format copied to clipboard: ${html}`);

			} catch (error) {
				console.error('[Micro.blog] Copy as HTML failed:', error);
				vscode.window.showErrorMessage(`Failed to copy HTML format: ${error}`);
			}
		});
		
		// Register commands and providers
		context.subscriptions.push(
			testCommand, 
			configureBlog, 
			viewPostCommand, 
			openLocalPostCommand,
			refreshCommand,
			newPostCommand,
			uploadImageCommand,
			publishPostCommand,
			copyAsMarkdownCommand,
			copyAsHtmlCommand,
			treeView,
			contentProviderDisposable
		);

		// Add file watcher to disposables if it exists
		if (fileWatcher) {
			context.subscriptions.push(fileWatcher);
		}
	
	} catch (error) {
		console.error('[Micro.blog] Extension activation failed:', error);
		vscode.window.showErrorMessage(`Micro.blog extension failed to activate: ${error}`);
	}
}

export function deactivate() {}
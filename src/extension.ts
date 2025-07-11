import * as vscode from 'vscode';
import * as path from 'path';

import { MicroblogService } from './services/MicroblogService';
import { FileManager } from './services/FileManager';
import { PublishingService } from './services/PublishingService';
import { MicroblogTreeProvider, MicroblogTreeItem } from './providers/TreeProvider';
import { ContentProvider } from './providers/ContentProvider';
import { LocalPost } from './domain/LocalPost';

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
				});

				vscode.window.showInformationMessage('Micro.blog configured successfully!');
				
				// Refresh tree view to show posts
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
		
		// Register commands and providers
		context.subscriptions.push(
			testCommand, 
			configureBlog, 
			viewPostCommand, 
			openLocalPostCommand,
			refreshCommand,
			newPostCommand,
			publishPostCommand,
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
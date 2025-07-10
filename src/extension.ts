import * as vscode from 'vscode';

import { MicroblogService } from './services/MicroblogService';
import { MicroblogTreeProvider } from './providers/TreeProvider';
import { ContentProvider } from './providers/ContentProvider';

export function activate(context: vscode.ExtensionContext) {
	console.log('[Micro.blog] Extension activated');

	try {
		// Initialize MicroblogService
		const microblogService = new MicroblogService(context, context.secrets);
		
		// Initialize providers
		const treeProvider = new MicroblogTreeProvider(microblogService);
		const contentProvider = new ContentProvider();
		
		// Register tree view
		const treeView = vscode.window.createTreeView('microblogPosts', {
			treeDataProvider: treeProvider,
			showCollapseAll: true
		});
		
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
		
		// Register commands and providers
		context.subscriptions.push(
			testCommand, 
			configureBlog, 
			viewPostCommand, 
			refreshCommand,
			treeView,
			contentProviderDisposable
		);
	
	} catch (error) {
		console.error('[Micro.blog] Extension activation failed:', error);
		vscode.window.showErrorMessage(`Micro.blog extension failed to activate: ${error}`);
	}
}

export function deactivate() {}
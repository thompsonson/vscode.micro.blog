import * as vscode from 'vscode';

import { MicroblogService } from './services/MicroblogService';

export function activate(context: vscode.ExtensionContext) {
	console.log('[Micro.blog] Extension activated');

	try {
		// Initialize MicroblogService
		const microblogService = new MicroblogService(context, context.secrets);
		
		// Test command for development
		const testCommand = vscode.commands.registerCommand('microblog.test', () => {
			console.log('[Micro.blog] Test command executed successfully');
			vscode.window.showInformationMessage('Micro.blog extension is working correctly!');
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
				
			} catch (error) {
				console.error('[Micro.blog] Configuration failed:', error);
				vscode.window.showErrorMessage(`Configuration failed: ${error}`);
			}
		});
		
		// Register commands
		context.subscriptions.push(testCommand, configureBlog);
	
	} catch (error) {
		console.error('[Micro.blog] Extension activation failed:', error);
		vscode.window.showErrorMessage(`Micro.blog extension failed to activate: ${error}`);
	}
}

export function deactivate() {}
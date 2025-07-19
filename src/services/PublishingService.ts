import { LocalPost } from '../domain/LocalPost';
import { ApiClient } from './ApiClient';
import { FileManager } from './FileManager';
import * as vscode from 'vscode';

export interface MicropubPost {
	h: string;
	name: string;
	content: string;
}

export interface PublishResult {
	success: boolean;
	error?: string;
	url?: string;
}

export class PublishingService {
	constructor(
		private apiClient: ApiClient,
		private fileManager?: FileManager
	) {}

	/**
	 * Publish a local post to micro.blog
	 */
	async publishPost(localPost: LocalPost): Promise<PublishResult> {
		try {
			// Validate post before publishing
			const validation = localPost.validateForPublishing();
			if (!validation.isValid) {
				return {
					success: false,
					error: `Validation failed: ${validation.errors.join(', ')}`
				};
			}

			// Convert to Micropub format
			const micropubPost = this.convertToMicropub(localPost);

			// Publish via API
			const response = await this.apiClient.publishPost(micropubPost);
			
			// If publishing succeeded and we have a FileManager, try to move the file
			if (this.fileManager && localPost.location === 'drafts') {
				try {
					await vscode.window.withProgress({
						location: vscode.ProgressLocation.Notification,
						title: 'Moving post to published folder...',
						cancellable: false
					}, async () => {
						await this.fileManager!.moveToPublished(localPost);
					});
				} catch (moveError) {
					// File move failed, but publishing succeeded
					// Show warning but don't fail the publish operation
					const errorMessage = moveError instanceof Error ? moveError.message : 'Unknown error';
					vscode.window.showWarningMessage(
						`Post published successfully, but failed to move file to published folder: ${errorMessage}`
					);
					console.error('[Micro.blog] File move failed after successful publish:', moveError);
				}
			}
			
			return {
				success: true,
				url: response.url
			};

		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}

	/**
	 * Convert LocalPost to Micropub format
	 */
	private convertToMicropub(localPost: LocalPost): MicropubPost {
		const format = localPost.toMicropubFormat();
		return {
			h: format.h,
			name: format.name,
			content: format.content
		};
	}
}
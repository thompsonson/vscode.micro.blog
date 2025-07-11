import { LocalPost } from '../domain/LocalPost';
import { ApiClient } from './ApiClient';

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
	constructor(private apiClient: ApiClient) {}

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
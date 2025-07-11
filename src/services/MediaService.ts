import * as vscode from 'vscode';
import { ApiClient, MicropubConfig } from './ApiClient';
import { MediaAsset } from '../domain/MediaAsset';
import { UploadResult } from '../domain/UploadResult';

export interface ValidationResult {
	isValid: boolean;
	errors: string[];
}

export interface FileReader {
	readFile(filePath: string): Promise<Buffer>;
}

export class VsCodeFileReader implements FileReader {
	async readFile(filePath: string): Promise<Buffer> {
		try {
			const uri = vscode.Uri.file(filePath);
			const fileData = await vscode.workspace.fs.readFile(uri);
			return Buffer.from(fileData);
		} catch (error) {
			throw new Error(`Failed to read file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}
}

export class MockFileReader implements FileReader {
	async readFile(filePath: string): Promise<Buffer> {
		return Buffer.from(`fake file data for ${filePath}`);
	}
}

export class MediaService {
	private cachedMediaEndpoint?: string;
	private fileReader: FileReader;

	constructor(private apiClient: ApiClient, fileReader?: FileReader) {
		this.fileReader = fileReader || new VsCodeFileReader();
	}

	/**
	 * Validates an image file before upload
	 */
	validateImageFile(filePath: string, fileName: string, fileSize: number): ValidationResult {
		try {
			const asset = MediaAsset.fromFile(filePath, fileName, fileSize);
			return asset.validate();
		} catch (error) {
			return {
				isValid: false,
				errors: [error instanceof Error ? error.message : 'Unknown validation error']
			};
		}
	}

	/**
	 * Discovers the media endpoint from the Micropub config
	 */
	async discoverMediaEndpoint(micropubEndpoint: string): Promise<string> {
		if (this.cachedMediaEndpoint) {
			return this.cachedMediaEndpoint;
		}

		try {
			console.log('[Micro.blog] Discovering media endpoint...');
			const config = await this.apiClient.getConfig(micropubEndpoint);
			
			if (!config['media-endpoint']) {
				throw new Error('No media endpoint found in Micropub config');
			}

			this.cachedMediaEndpoint = config['media-endpoint'];
			console.log(`[Micro.blog] Media endpoint discovered: ${this.cachedMediaEndpoint}`);
			return this.cachedMediaEndpoint;
		} catch (error) {
			console.error('[Micro.blog] Failed to discover media endpoint:', error);
			throw new Error(`Failed to discover media endpoint: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Uploads an image file with retry logic
	 */
	async uploadImage(asset: MediaAsset, micropubEndpoint: string, maxRetries: number = 3, delayMs: number = 1000): Promise<UploadResult> {
		// Validate the asset first
		const validation = asset.validate();
		if (!validation.isValid) {
			return UploadResult.failure(`Validation failed: ${validation.errors.join(', ')}`);
		}

		// Discover media endpoint
		let mediaEndpoint: string;
		try {
			mediaEndpoint = await this.discoverMediaEndpoint(micropubEndpoint);
		} catch (error) {
			return UploadResult.failure(`Failed to discover media endpoint: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}

		// Attempt upload with retry logic
		let currentResult = UploadResult.failure('Initial attempt not started');
		let attempt = 0;
		
		while (true) {
			try {
				console.log(`[Micro.blog] Upload attempt ${attempt + 1}/${maxRetries + 1} for ${asset.fileName}`);
				
				// Read file data (in a real implementation, this would read from filesystem)
				// For now, we'll assume the file path contains the data or we have another way to get it
				const fileData = await this.readFileData(asset.filePath);
				
				const response = await this.apiClient.uploadMedia(
					mediaEndpoint,
					fileData,
					asset.fileName,
					asset.mimeType
				);

				if (response.url) {
					console.log(`[Micro.blog] Upload successful on attempt ${attempt + 1}: ${response.url}`);
					return UploadResult.success(response.url, currentResult.retryCount);
				} else {
					throw new Error('Upload response did not contain URL');
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Unknown upload error';
				console.error(`[Micro.blog] Upload attempt ${attempt + 1} failed:`, errorMessage);
				
				currentResult = UploadResult.retry(currentResult, errorMessage);
				
				// If we've reached the max retry count, return failure
				if (currentResult.retryCount > maxRetries) {
					return UploadResult.failure(errorMessage, maxRetries);
				}
				
				// Wait before retrying (exponential backoff)
				const delay = Math.pow(2, attempt) * delayMs; // configurable base delay
				await this.delay(delay);
				
				attempt++;
			}
		}

		return currentResult;
	}

	/**
	 * Formats a URL as markdown for easy insertion into posts
	 */
	formatAsMarkdown(url: string, altText?: string): string {
		const alt = altText || this.extractFileNameFromUrl(url);
		return `![${alt}](${url})`;
	}

	/**
	 * Formats a URL as HTML for web display
	 */
	formatAsHtml(url: string, altText?: string): string {
		const alt = altText || this.extractFileNameFromUrl(url);
		return `<img src="${url}" alt="${alt}">`;
	}

	/**
	 * Clears the cached media endpoint (useful for testing or config changes)
	 */
	clearCache(): void {
		this.cachedMediaEndpoint = undefined;
	}

	/**
	 * Reads file data from the file system
	 */
	private async readFileData(filePath: string): Promise<Buffer> {
		return await this.fileReader.readFile(filePath);
	}

	/**
	 * Delay utility for retry logic
	 */
	private delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Extracts filename from URL for alt text
	 */
	private extractFileNameFromUrl(url: string): string {
		try {
			const urlObj = new URL(url);
			const pathname = urlObj.pathname;
			const filename = pathname.split('/').pop() || 'image';
			return filename.split('.')[0]; // Remove extension
		} catch {
			return 'image';
		}
	}
}
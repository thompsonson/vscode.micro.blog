import * as vscode from 'vscode';
import * as path from 'path';
import { UploadFile } from '../domain/UploadFile';
import { FileManager } from './FileManager';
import { ApiClient } from './ApiClient';

/**
 * UploadManager service - handles fetching remote uploaded media and local file operations
 * Transformed from local scanning to remote API integration
 */
export class UploadManager {
	private uploadCache: UploadFile[] = [];
	private lastFetch: Date | null = null;
	private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

	constructor(
		private fileManager: FileManager,
		private apiClient: ApiClient | null = null
	) {}

	/**
	 * Fetch remote uploaded media files from micro.blog API
	 * Uses cache for performance (5 minute expiry)
	 */
	async fetchRemoteUploads(): Promise<UploadFile[]> {
		console.log('[Micro.blog] UploadManager: fetchRemoteUploads called');
		console.log('[Micro.blog] UploadManager: API client available:', !!this.apiClient);
		console.log('[Micro.blog] UploadManager: Cache valid:', this.isCacheValid());
		console.log('[Micro.blog] UploadManager: Cache size:', this.uploadCache.length);
		
		// Return cached data if still fresh
		if (this.isCacheValid()) {
			console.log('[Micro.blog] UploadManager: Returning cached uploads data');
			return this.uploadCache;
		}

		// Cannot fetch without API client
		if (!this.apiClient) {
			console.log('[Micro.blog] UploadManager: No API client available for remote uploads');
			return [];
		}

		try {
			console.log('[Micro.blog] UploadManager: Fetching remote uploads from API');
			const uploads = await this.apiClient.fetchUploadedMedia();
			console.log('[Micro.blog] UploadManager: API returned', uploads.length, 'uploads');
			
			// Update cache
			this.uploadCache = uploads;
			this.lastFetch = new Date();
			console.log('[Micro.blog] UploadManager: Cache updated with', uploads.length, 'uploads');
			
			return uploads;
		} catch (error) {
			console.error('[Micro.blog] UploadManager: Failed to fetch remote uploads:', error);
			console.log('[Micro.blog] UploadManager: Returning cached fallback, cache size:', this.uploadCache.length);
			// Return cached data if available, otherwise empty array
			return this.uploadCache.length > 0 ? this.uploadCache : [];
		}
	}

	/**
	 * Legacy method: Scan local uploads folder (kept for backward compatibility)
	 * Note: Currently flat scan only - nested folders are excluded as per requirements
	 */
	async scanUploadsFolder(): Promise<UploadFile[]> {
		// Check if uploads folder exists
		if (!(await this.fileManager.uploadsExists())) {
			return [];
		}

		const uploadsPath = this.fileManager.getUploadsPath();
		const uploadsDir = vscode.Uri.file(uploadsPath);

		try {
			const files = await vscode.workspace.fs.readDirectory(uploadsDir);
			const uploadFiles: UploadFile[] = [];

			for (const [fileName, fileType] of files) {
				// Only include regular files (exclude directories as per scope limitations)
				if (fileType === vscode.FileType.File) {
					try {
						const uploadFile = await this.getFileInfo(fileName);
						uploadFiles.push(uploadFile);
					} catch (error) {
						console.error(`[Micro.blog] Failed to read upload file ${fileName}:`, error);
					}
				}
			}

			// Sort files by last modified date (newest first)
			uploadFiles.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

			return uploadFiles;
		} catch (error) {
			console.error('[Micro.blog] Failed to scan uploads folder:', error);
			return [];
		}
	}

	/**
	 * Get file information for a specific file in the uploads folder
	 */
	async getFileInfo(fileName: string): Promise<UploadFile> {
		const uploadsPath = this.fileManager.getUploadsPath();
		const filePath = path.join(uploadsPath, fileName);
		const fileUri = vscode.Uri.file(filePath);

		try {
			const stats = await vscode.workspace.fs.stat(fileUri);
			
			return UploadFile.fromFileInfo(
				filePath,
				fileName,
				stats.size,
				new Date(stats.mtime)
			);
		} catch (error) {
			throw new Error(`Failed to get file info for ${fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Check if a specific file exists in uploads folder
	 */
	async fileExists(fileName: string): Promise<boolean> {
		const uploadsPath = this.fileManager.getUploadsPath();
		const filePath = path.join(uploadsPath, fileName);
		const fileUri = vscode.Uri.file(filePath);

		try {
			await vscode.workspace.fs.stat(fileUri);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Get count of remote uploaded files
	 */
	async getRemoteFileCount(): Promise<number> {
		const files = await this.fetchRemoteUploads();
		return files.length;
	}

	/**
	 * Get remote image files only
	 */
	async getRemoteImageFiles(): Promise<UploadFile[]> {
		const allFiles = await this.fetchRemoteUploads();
		return allFiles.filter(file => file.isImageFile());
	}

	/**
	 * Force refresh cache by fetching latest data from API
	 */
	async refreshCache(): Promise<void> {
		this.invalidateCache();
		await this.fetchRemoteUploads();
	}

	/**
	 * Legacy methods (kept for backward compatibility)
	 */

	/**
	 * Get count of files in uploads folder
	 */
	async getFileCount(): Promise<number> {
		const files = await this.scanUploadsFolder();
		return files.length;
	}

	/**
	 * Get files filtered by type (e.g., only images)
	 */
	async getImageFiles(): Promise<UploadFile[]> {
		const allFiles = await this.scanUploadsFolder();
		return allFiles.filter(file => file.isImageFile());
	}

	/**
	 * Create uploads directory if it doesn't exist
	 */
	async ensureUploadsDirectory(): Promise<void> {
		return this.fileManager.ensureUploadsDirectory();
	}

	/**
	 * Private helper methods
	 */
	
	private isCacheValid(): boolean {
		if (!this.lastFetch || this.uploadCache.length === 0) {
			return false;
		}
		
		const now = new Date();
		const elapsed = now.getTime() - this.lastFetch.getTime();
		return elapsed < this.CACHE_DURATION_MS;
	}

	private invalidateCache(): void {
		this.uploadCache = [];
		this.lastFetch = null;
	}
}
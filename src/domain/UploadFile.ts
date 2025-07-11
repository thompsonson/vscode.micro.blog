import * as path from 'path';

/**
 * UploadFile domain entity - represents a file in the uploads folder
 * Following DDD principles: pure business logic with no external dependencies
 */
export class UploadFile {
	public readonly filePath: string;
	public readonly fileName: string;
	public readonly fileSize: number;
	public readonly mimeType: string;
	public readonly lastModified: Date;
	
	// Remote-specific fields for API integration
	public readonly remoteUrl?: string;
	public readonly cdnUrl?: string;
	public readonly altText?: string;
	public readonly imageSizes?: {
		large: string;
		medium?: string;
		small?: string;
	};
	public readonly publishedDate?: string;

	constructor(options: {
		filePath: string;
		fileName: string;
		fileSize: number;
		mimeType: string;
		lastModified: Date;
		// Remote-specific optional fields
		remoteUrl?: string;
		cdnUrl?: string;
		altText?: string;
		imageSizes?: {
			large: string;
			medium?: string;
			small?: string;
		};
		publishedDate?: string;
	}) {
		// Validate required fields
		if (!options.filePath) {
			throw new Error('File path is required');
		}
		if (!options.fileName) {
			throw new Error('File name is required');
		}
		if (options.fileSize < 0) {
			throw new Error('File size cannot be negative');
		}
		if (!options.mimeType) {
			throw new Error('MIME type is required');
		}
		if (!options.lastModified) {
			throw new Error('Last modified date is required');
		}

		this.filePath = options.filePath;
		this.fileName = options.fileName;
		this.fileSize = options.fileSize;
		this.mimeType = options.mimeType;
		this.lastModified = options.lastModified;
		
		// Remote-specific fields
		this.remoteUrl = options.remoteUrl;
		this.cdnUrl = options.cdnUrl;
		this.altText = options.altText;
		this.imageSizes = options.imageSizes;
		this.publishedDate = options.publishedDate;
	}

	/**
	 * Static factory method to create UploadFile from file system info
	 */
	static fromFileInfo(filePath: string, fileName: string, fileSize: number, lastModified: Date): UploadFile {
		const mimeType = UploadFile.getMimeTypeFromExtension(fileName);
		
		return new UploadFile({
			filePath,
			fileName,
			fileSize,
			mimeType,
			lastModified
		});
	}

	/**
	 * Static factory method to create UploadFile from micro.blog API response
	 */
	static fromApiResponse(item: any): UploadFile {
		const fileName = UploadFile.extractFilenameFromUrl(item.url);
		const mimeType = UploadFile.getMimeTypeFromExtension(fileName);
		
		return new UploadFile({
			filePath: `remote-uploads/${fileName}`,
			fileName,
			fileSize: 0, // Not provided by API
			mimeType,
			lastModified: new Date(item.published),
			// Remote-specific fields from API
			remoteUrl: item.url,
			cdnUrl: item.cdn?.large,
			altText: item.alt,
			imageSizes: item.sizes,
			publishedDate: item.published
		});
	}

	/**
	 * Extract filename from URL (handles various URL patterns)
	 */
	private static extractFilenameFromUrl(url: string): string {
		try {
			const parsedUrl = new URL(url);
			const pathname = parsedUrl.pathname;
			const filename = pathname.split('/').pop();
			return filename || 'unknown-file';
		} catch {
			// Fall back to simple extraction if URL parsing fails
			const parts = url.split('/');
			return parts[parts.length - 1] || 'unknown-file';
		}
	}

	/**
	 * Get display name for tree view
	 */
	get displayName(): string {
		return this.fileName;
	}

	/**
	 * Format file size for human readability
	 */
	get formattedSize(): string {
		if (this.fileSize < 1024) {
			return `${this.fileSize} B`;
		}
		if (this.fileSize < 1024 * 1024) {
			return `${(this.fileSize / 1024).toFixed(1)} KB`;
		}
		return `${(this.fileSize / (1024 * 1024)).toFixed(1)} MB`;
	}

	/**
	 * Check if this is an image file (for icon selection)
	 */
	isImageFile(): boolean {
		return /^image\/(jpeg|jpg|png|gif|webp|svg)$/i.test(this.mimeType);
	}

	/**
	 * Get appropriate icon name for this file type
	 */
	get iconName(): string {
		if (this.isImageFile()) {
			return 'file-media';
		}
		if (this.mimeType.startsWith('video/')) {
			return 'file-media';
		}
		if (this.mimeType.startsWith('audio/')) {
			return 'file-media';
		}
		return 'file';
	}

	/**
	 * Generate markdown format for this file
	 */
	toMarkdown(sizeOrAltText?: 'large' | 'medium' | 'small' | string, altText?: string): string {
		// Handle backward compatibility: toMarkdown(altText) or toMarkdown(size, altText)
		let size: 'large' | 'medium' | 'small' | undefined;
		let alt: string;
		
		if (typeof sizeOrAltText === 'string' && !['large', 'medium', 'small'].includes(sizeOrAltText)) {
			// Called as toMarkdown(altText)
			alt = sizeOrAltText;
			size = undefined;
		} else {
			// Called as toMarkdown(size, altText)
			size = sizeOrAltText as 'large' | 'medium' | 'small' | undefined;
			alt = altText || this.altText || this.getAltTextFromFileName();
		}
		
		const url = this.getOptimalUrl(size);
		return `![${alt}](${url})`;
	}

	/**
	 * Generate HTML format for this file
	 */
	toHtml(sizeOrAltText?: 'large' | 'medium' | 'small' | string, altText?: string): string {
		// Handle backward compatibility: toHtml(altText) or toHtml(size, altText)
		let size: 'large' | 'medium' | 'small' | undefined;
		let alt: string;
		
		if (typeof sizeOrAltText === 'string' && !['large', 'medium', 'small'].includes(sizeOrAltText)) {
			// Called as toHtml(altText)
			alt = sizeOrAltText;
			size = undefined;
		} else {
			// Called as toHtml(size, altText)
			size = sizeOrAltText as 'large' | 'medium' | 'small' | undefined;
			alt = altText || this.altText || this.getAltTextFromFileName();
		}
		
		const url = this.getOptimalUrl(size);
		return `<img src="${url}" alt="${alt}">`;
	}

	/**
	 * Get optimal URL for this file (remote URL if available, otherwise local path)
	 */
	getOptimalUrl(size?: 'large' | 'medium' | 'small', preferCdn: boolean = false): string {
		// For remote files, use API URLs
		if (this.remoteUrl) {
			// Try to get specific size if available
			if (size && this.imageSizes) {
				const sizeUrl = this.imageSizes[size];
				if (sizeUrl) {
					// Use CDN version if available and preferred
					if (preferCdn && this.cdnUrl && size === 'large') {
						return this.cdnUrl;
					}
					return sizeUrl;
				}
			}
			
			// Fall back to main remote URL (prefer CDN if available and requested)
			if (preferCdn && this.cdnUrl) {
				return this.cdnUrl;
			}
			return this.remoteUrl;
		}
		
		// For local files, use relative path
		return this.getRelativeFilePath();
	}

	/**
	 * Get relative file path from workspace root
	 */
	private getRelativeFilePath(): string {
		// Return path relative to workspace root (uploads/filename)
		return `uploads/${this.fileName}`;
	}

	/**
	 * Extract alt text from file name (remove extension)
	 */
	private getAltTextFromFileName(): string {
		const nameWithoutExtension = path.basename(this.fileName, path.extname(this.fileName));
		return nameWithoutExtension;
	}

	/**
	 * Determine MIME type from file extension
	 */
	private static getMimeTypeFromExtension(fileName: string): string {
		const extension = path.extname(fileName).toLowerCase();
		
		const mimeTypes: Record<string, string> = {
			'.jpg': 'image/jpeg',
			'.jpeg': 'image/jpeg',
			'.png': 'image/png',
			'.gif': 'image/gif',
			'.webp': 'image/webp',
			'.svg': 'image/svg+xml',
			'.bmp': 'image/bmp',
			'.tiff': 'image/tiff',
			'.pdf': 'application/pdf',
			'.txt': 'text/plain',
			'.md': 'text/markdown',
			'.json': 'application/json',
			'.xml': 'application/xml',
			'.mp4': 'video/mp4',
			'.mov': 'video/quicktime',
			'.avi': 'video/x-msvideo',
			'.mp3': 'audio/mpeg',
			'.wav': 'audio/wav',
			'.ogg': 'audio/ogg'
		};

		return mimeTypes[extension] || 'application/octet-stream';
	}
}
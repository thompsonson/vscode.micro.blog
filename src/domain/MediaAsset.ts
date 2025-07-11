export interface MediaAssetProperties {
	filePath: string;
	fileName: string;
	mimeType: string;
	fileSize: number;
}

export class MediaAsset {
	private static readonly SUPPORTED_MIME_TYPES = [
		'image/jpeg',
		'image/png',
		'image/gif'
	];

	private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

	constructor(public readonly properties: MediaAssetProperties) {
		if (!properties.filePath || !properties.filePath.trim()) {
			throw new Error('File path is required');
		}
		if (!properties.fileName || !properties.fileName.trim()) {
			throw new Error('File name is required');
		}
		if (!properties.mimeType || !properties.mimeType.trim()) {
			throw new Error('MIME type is required');
		}
		if (typeof properties.fileSize !== 'number' || properties.fileSize <= 0) {
			throw new Error('File size must be a positive number');
		}
	}

	get filePath(): string {
		return this.properties.filePath;
	}

	get fileName(): string {
		return this.properties.fileName;
	}

	get mimeType(): string {
		return this.properties.mimeType;
	}

	get fileSize(): number {
		return this.properties.fileSize;
	}

	get fileExtension(): string {
		const lastDotIndex = this.fileName.lastIndexOf('.');
		return lastDotIndex !== -1 ? this.fileName.substring(lastDotIndex + 1).toLowerCase() : '';
	}

	isValidImageType(): boolean {
		return MediaAsset.SUPPORTED_MIME_TYPES.includes(this.mimeType.toLowerCase());
	}

	isWithinSizeLimit(): boolean {
		return this.fileSize <= MediaAsset.MAX_FILE_SIZE;
	}

	validate(): { isValid: boolean; errors: string[] } {
		const errors: string[] = [];

		if (!this.isValidImageType()) {
			errors.push(`Unsupported file type: ${this.mimeType}. Supported types: JPEG, PNG, GIF`);
		}

		if (!this.isWithinSizeLimit()) {
			const sizeMB = (this.fileSize / (1024 * 1024)).toFixed(2);
			errors.push(`File size ${sizeMB}MB exceeds maximum limit of 10MB`);
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}

	getSizeInMB(): number {
		return Number((this.fileSize / (1024 * 1024)).toFixed(2));
	}

	static fromFile(filePath: string, fileName: string, fileSize: number): MediaAsset {
		const mimeType = MediaAsset.getMimeTypeFromExtension(fileName);
		return new MediaAsset({
			filePath,
			fileName,
			mimeType,
			fileSize
		});
	}

	private static getMimeTypeFromExtension(fileName: string): string {
		const extension = fileName.split('.').pop()?.toLowerCase();
		switch (extension) {
			case 'jpg':
			case 'jpeg':
				return 'image/jpeg';
			case 'png':
				return 'image/png';
			case 'gif':
				return 'image/gif';
			default:
				return 'application/octet-stream';
		}
	}
}
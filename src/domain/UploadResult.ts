export interface UploadResultProperties {
	success: boolean;
	url?: string;
	error?: string;
	retryCount?: number;
}

export class UploadResult {
	constructor(public readonly properties: UploadResultProperties) {
		if (properties.success && !properties.url) {
			throw new Error('Successful upload must include a URL');
		}
		if (!properties.success && !properties.error) {
			throw new Error('Failed upload must include an error message');
		}
		if (properties.retryCount !== undefined && properties.retryCount < 0) {
			throw new Error('Retry count cannot be negative');
		}
	}

	get success(): boolean {
		return this.properties.success;
	}

	get url(): string | undefined {
		return this.properties.url;
	}

	get error(): string | undefined {
		return this.properties.error;
	}

	get retryCount(): number {
		return this.properties.retryCount || 0;
	}

	get markdownFormat(): string | undefined {
		if (!this.success || !this.url) {
			return undefined;
		}
		// Extract filename from URL for alt text
		const fileName = this.url.split('/').pop()?.split('.')[0] || 'image';
		return `![${fileName}](${this.url})`;
	}

	get htmlFormat(): string | undefined {
		if (!this.success || !this.url) {
			return undefined;
		}
		const fileName = this.url.split('/').pop()?.split('.')[0] || 'image';
		return `<img src="${this.url}" alt="${fileName}">`;
	}

	static success(url: string, retryCount: number = 0): UploadResult {
		return new UploadResult({
			success: true,
			url,
			retryCount
		});
	}

	static failure(error: string, retryCount: number = 0): UploadResult {
		return new UploadResult({
			success: false,
			error,
			retryCount
		});
	}

	static retry(previousResult: UploadResult, newError?: string): UploadResult {
		return new UploadResult({
			success: false,
			error: newError || previousResult.error,
			retryCount: previousResult.retryCount + 1
		});
	}

	canRetry(maxRetries: number = 3): boolean {
		return !this.success && this.retryCount < maxRetries;
	}

	getDisplayMessage(): string {
		if (this.success) {
			return `Upload successful: ${this.url}`;
		}
		const retryText = this.retryCount > 0 ? ` (attempt ${this.retryCount + 1})` : '';
		return `Upload failed${retryText}: ${this.error}`;
	}
}
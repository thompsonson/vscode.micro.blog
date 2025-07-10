export interface PostProperties {
	name?: string;
	content: string;
	published?: string;
	url?: string;
	'post-status'?: 'published' | 'draft';
	category?: string[];
}

export class Post {
	constructor(
		public readonly properties: PostProperties,
		public readonly url?: string
	) {
		if (!properties.content || !properties.content.trim()) {
			throw new Error('Post content is required');
		}
	}

	get title(): string {
		return this.properties.name || this.extractTitleFromContent();
	}

	get content(): string {
		return this.properties.content;
	}

	get publishedDate(): Date | undefined {
		return this.properties.published ? new Date(this.properties.published) : undefined;
	}

	get status(): 'published' | 'draft' {
		return this.properties['post-status'] || 'published';
	}

	get categories(): string[] {
		return this.properties.category || [];
	}

	get isPublished(): boolean {
		return this.status === 'published';
	}

	private extractTitleFromContent(): string {
		const firstLine = this.content.split('\n')[0];
		if (firstLine.length > 50) {
			return firstLine.substring(0, 47) + '...';
		}
		return firstLine;
	}
}
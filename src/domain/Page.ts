export interface PageProperties {
	name: string;
	content: string;
	published?: string;
	url?: string;
	'post-status'?: 'published' | 'draft';
	category?: string[];
}

export class Page {
	constructor(
		public readonly properties: PageProperties,
		public readonly url?: string
	) {
		if (!properties.name || !properties.name.trim()) {
			throw new Error('Page title is required');
		}
		if (!properties.content || !properties.content.trim()) {
			throw new Error('Page content is required');
		}
	}

	get title(): string {
		return this.properties.name;
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

	get displayTitle(): string {
		return this.title;
	}

	get icon(): string {
		return '📄';
	}

	toMarkdownLink(): string {
		return `[${this.title}](${this.url})`;
	}

	getRelativeUrl(): string {
		if (!this.url) {
			return '';
		}
		try {
			const parsedUrl = new URL(this.url);
			return parsedUrl.pathname;
		} catch {
			return this.url;
		}
	}
}
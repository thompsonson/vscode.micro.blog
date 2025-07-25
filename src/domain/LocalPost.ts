export class LocalPost {
	public readonly title: string;
	public readonly content: string;
	public readonly status: 'draft' | 'published';
	public readonly type: 'post' | 'page';
	public readonly location: 'drafts' | 'published';
	public readonly postId?: string;
	public readonly lastSync?: Date;
	public readonly filePath: string;

	constructor(options: {
		title: string;
		content: string;
		status?: 'draft' | 'published';
		type?: 'post' | 'page';
		location?: 'drafts' | 'published';
		postId?: string;
		lastSync?: Date;
		filePath: string;
	}) {
		this.title = options.title;
		this.content = options.content;
		this.status = options.status || 'draft';
		this.type = options.type || 'post';
		this.location = options.location || 'drafts';
		this.postId = options.postId;
		this.lastSync = options.lastSync;
		this.filePath = options.filePath;
	}

	/**
	 * Generate frontmatter for the post
	 */
	public getFrontmatter(): string {
		const frontmatter = [
			'---',
			`title: "${this.title}"`,
			`status: "${this.status}"`,
			`type: "${this.type}"`,
			`location: "${this.location}"`
		];

		if (this.postId) {
			frontmatter.push(`postId: "${this.postId}"`);
		}

		if (this.lastSync) {
			frontmatter.push(`lastSync: "${this.lastSync.toISOString()}"`);
		}

		frontmatter.push('---');
		return frontmatter.join('\n');
	}

	/**
	 * Generate complete markdown content with frontmatter
	 */
	public toMarkdown(): string {
		return `${this.getFrontmatter()}\n\n# ${this.title}\n\n${this.content}`;
	}

	/**
	 * Parse frontmatter and content from markdown string
	 */
	public static fromMarkdown(markdown: string, filePath: string): LocalPost {
		const parts = markdown.split('---');
		
		if (parts.length < 3) {
			throw new Error('Invalid markdown format: missing frontmatter');
		}

		const frontmatterContent = parts[1].trim();
		const contentPart = parts.slice(2).join('---').trim();

		// Parse frontmatter
		const frontmatter: Record<string, any> = {};
		const lines = frontmatterContent.split('\n');
		
		for (const line of lines) {
			const colonIndex = line.indexOf(':');
			if (colonIndex === -1) {
				continue;
			}
			
			const key = line.slice(0, colonIndex).trim();
			const value = line.slice(colonIndex + 1).trim().replace(/^"(.*)"$/, '$1');
			frontmatter[key] = value;
		}

		// Extract content (remove first heading if it matches title)
		let content = contentPart;
		const firstLineMatch = content.match(/^#\s+(.+)\n*/);
		if (firstLineMatch && firstLineMatch[1] === frontmatter.title) {
			content = content.replace(/^#\s+.+\n*/, '').trim();
		}

		return new LocalPost({
			title: frontmatter.title || 'Untitled',
			content: content,
			status: frontmatter.status === 'published' ? 'published' : 'draft',
			type: frontmatter.type === 'page' ? 'page' : 'post',
			location: frontmatter.location === 'published' ? 'published' : 'drafts',
			postId: frontmatter.postId || undefined,
			lastSync: frontmatter.lastSync ? new Date(frontmatter.lastSync) : undefined,
			filePath: filePath
		});
	}

	/**
	 * Generate a slug from the title for use as filename
	 */
	public static generateSlug(title: string): string {
		return title
			.toLowerCase()
			.replace(/[^a-z0-9\s-]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
			.replace(/^-|-$/g, '');
	}

	/**
	 * Convert local post to Micropub format for publishing
	 */
	public toMicropubFormat(): { [key: string]: string } {
		return {
			'h': 'entry',
			'name': this.title,
			'content': this.content
		};
	}

	/**
	 * Validate if post is ready for publishing
	 */
	public validateForPublishing(): { isValid: boolean; errors: string[] } {
		const errors: string[] = [];

		if (!this.title || this.title.trim().length === 0) {
			errors.push('Post title is required');
		}

		if (!this.content || this.content.trim().length === 0) {
			errors.push('Post content is required');
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}

	/**
	 * Create a new local post with defaults
	 */
	public static create(title: string, content: string = '', location: 'drafts' | 'published' = 'drafts'): LocalPost {
		const slug = LocalPost.generateSlug(title);
		const filePath = `content/${location}/${slug}.md`;
		
		return new LocalPost({
			title,
			content,
			filePath,
			status: 'draft',
			type: 'post',
			location
		});
	}

	/**
	 * Create a new post with a path to be moved to published folder
	 */
	public createPublishedVersion(): LocalPost {
		const slug = LocalPost.generateSlug(this.title);
		const publishedFilePath = `content/published/${slug}.md`;
		
		return new LocalPost({
			title: this.title,
			content: this.content,
			status: 'published',
			type: this.type,
			location: 'published',
			postId: this.postId,
			lastSync: new Date(),
			filePath: publishedFilePath
		});
	}
}
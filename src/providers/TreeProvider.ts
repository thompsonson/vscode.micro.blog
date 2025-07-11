import * as vscode from 'vscode';
import { Post } from '../domain/Post';
import { LocalPost } from '../domain/LocalPost';
import { MicroblogService } from '../services/MicroblogService';
import { FileManager } from '../services/FileManager';

export class MicroblogTreeItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly post?: Post,
		public readonly localPost?: LocalPost
	) {
		super(label, collapsibleState);
		
		if (post) {
			this.tooltip = this.createTooltip(post);
			this.description = this.createDescription(post);
			this.iconPath = new vscode.ThemeIcon(post.isPublished ? 'globe' : 'edit');
			this.command = {
				command: 'microblog.viewPost',
				title: 'View Post',
				arguments: [post]
			};
		} else if (localPost) {
			this.tooltip = this.createLocalTooltip(localPost);
			this.description = this.createLocalDescription(localPost);
			this.iconPath = new vscode.ThemeIcon('file-text');
			this.command = {
				command: 'microblog.openLocalPost',
				title: 'Open Local Post',
				arguments: [localPost]
			};
		} else {
			this.iconPath = new vscode.ThemeIcon('folder');
		}
	}

	private createTooltip(post: Post): string {
		const lines = [
			`Title: ${post.title}`,
			`Status: ${post.status}`,
		];
		
		if (post.publishedDate) {
			lines.push(`Published: ${post.publishedDate.toLocaleDateString()}`);
		}
		
		if (post.categories.length > 0) {
			lines.push(`Categories: ${post.categories.join(', ')}`);
		}
		
		return lines.join('\n');
	}

	private createDescription(post: Post): string {
		if (post.publishedDate) {
			return post.publishedDate.toLocaleDateString();
		}
		return post.status;
	}

	private createLocalTooltip(localPost: LocalPost): string {
		const lines = [
			`Title: ${localPost.title}`,
			`Status: ${localPost.status}`,
			`Type: ${localPost.type}`,
			`File: ${localPost.filePath}`
		];
		
		if (localPost.lastSync) {
			lines.push(`Last Sync: ${localPost.lastSync.toLocaleDateString()}`);
		}
		
		return lines.join('\n');
	}

	private createLocalDescription(localPost: LocalPost): string {
		return localPost.status;
	}
}

export class MicroblogTreeProvider implements vscode.TreeDataProvider<MicroblogTreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<MicroblogTreeItem | undefined | null | void> = new vscode.EventEmitter<MicroblogTreeItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<MicroblogTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

	private posts: Post[] = [];
	private localPosts: LocalPost[] = [];

	constructor(
		private microblogService: MicroblogService,
		private fileManager?: FileManager
	) {}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: MicroblogTreeItem): vscode.TreeItem {
		return element;
	}

	async getChildren(element?: MicroblogTreeItem): Promise<MicroblogTreeItem[]> {
		if (!element) {
			// Root level - show categories
			const categories: MicroblogTreeItem[] = [];

			// Load local posts if FileManager is available
			if (this.fileManager) {
				try {
					this.localPosts = await this.fileManager.getLocalPosts();
					if (this.localPosts.length > 0) {
						categories.push(new MicroblogTreeItem(
							`📝 Local Drafts (${this.localPosts.length})`,
							vscode.TreeItemCollapsibleState.Expanded
						));
					}
				} catch (error) {
					console.error('[Micro.blog] Failed to load local posts:', error);
				}
			}

			// Load remote posts if configured
			const isConfigured = await this.microblogService.isConfigured();
			if (isConfigured) {
				try {
					this.posts = await this.microblogService.fetchPosts();
					
					// Group remote posts by status
					const publishedPosts = this.posts.filter(p => p.isPublished);
					const draftPosts = this.posts.filter(p => !p.isPublished);

					if (publishedPosts.length > 0) {
						categories.push(new MicroblogTreeItem(
							`📄 Published Posts (${publishedPosts.length})`,
							vscode.TreeItemCollapsibleState.Expanded
						));
					}
					
					if (draftPosts.length > 0) {
						categories.push(new MicroblogTreeItem(
							`📋 Remote Drafts (${draftPosts.length})`,
							vscode.TreeItemCollapsibleState.Expanded
						));
					}
				} catch (error) {
					console.error('[Micro.blog] Failed to fetch remote posts:', error);
					categories.push(new MicroblogTreeItem('Error loading remote posts', vscode.TreeItemCollapsibleState.None));
				}
			} else {
				categories.push(new MicroblogTreeItem('📲 Configure micro.blog account', vscode.TreeItemCollapsibleState.None));
			}

			if (categories.length === 0) {
				return [new MicroblogTreeItem('No posts found', vscode.TreeItemCollapsibleState.None)];
			}

			return categories;
		} else {
			// Show posts under categories
			if (element.label.includes('Local Drafts')) {
				return this.localPosts.map(localPost => new MicroblogTreeItem(
					localPost.title,
					vscode.TreeItemCollapsibleState.None,
					undefined,
					localPost
				));
			} else if (element.label.includes('Published Posts')) {
				return this.posts
					.filter(p => p.isPublished)
					.sort((a, b) => (b.publishedDate?.getTime() || 0) - (a.publishedDate?.getTime() || 0))
					.map(post => new MicroblogTreeItem(
						post.title,
						vscode.TreeItemCollapsibleState.None,
						post
					));
			} else if (element.label.includes('Remote Drafts')) {
				return this.posts
					.filter(p => !p.isPublished)
					.map(post => new MicroblogTreeItem(
						post.title,
						vscode.TreeItemCollapsibleState.None,
						post
					));
			}
		}

		return [];
	}
}
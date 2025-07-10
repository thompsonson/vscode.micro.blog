import * as vscode from 'vscode';
import { Post } from '../domain/Post';
import { MicroblogService } from '../services/MicroblogService';

export class MicroblogTreeItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly post?: Post
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
}

export class MicroblogTreeProvider implements vscode.TreeDataProvider<MicroblogTreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<MicroblogTreeItem | undefined | null | void> = new vscode.EventEmitter<MicroblogTreeItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<MicroblogTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

	private posts: Post[] = [];

	constructor(private microblogService: MicroblogService) {}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: MicroblogTreeItem): vscode.TreeItem {
		return element;
	}

	async getChildren(element?: MicroblogTreeItem): Promise<MicroblogTreeItem[]> {
		if (!element) {
			// Root level - show categories
			const isConfigured = await this.microblogService.isConfigured();
			if (!isConfigured) {
				return [new MicroblogTreeItem('Not configured', vscode.TreeItemCollapsibleState.None)];
			}

			try {
				this.posts = await this.microblogService.fetchPosts();
				
				if (this.posts.length === 0) {
					return [new MicroblogTreeItem('No posts found', vscode.TreeItemCollapsibleState.None)];
				}

				// Group posts by status
				const publishedPosts = this.posts.filter(p => p.isPublished);
				const draftPosts = this.posts.filter(p => !p.isPublished);

				const categories: MicroblogTreeItem[] = [];
				
				if (publishedPosts.length > 0) {
					categories.push(new MicroblogTreeItem(
						`Published (${publishedPosts.length})`,
						vscode.TreeItemCollapsibleState.Expanded
					));
				}
				
				if (draftPosts.length > 0) {
					categories.push(new MicroblogTreeItem(
						`Drafts (${draftPosts.length})`,
						vscode.TreeItemCollapsibleState.Expanded
					));
				}

				return categories;
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to fetch posts: ${error}`);
				return [new MicroblogTreeItem('Error loading posts', vscode.TreeItemCollapsibleState.None)];
			}
		} else {
			// Show posts under categories
			if (element.label.startsWith('Published')) {
				return this.posts
					.filter(p => p.isPublished)
					.sort((a, b) => (b.publishedDate?.getTime() || 0) - (a.publishedDate?.getTime() || 0))
					.map(post => new MicroblogTreeItem(
						post.title,
						vscode.TreeItemCollapsibleState.None,
						post
					));
			} else if (element.label.startsWith('Drafts')) {
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
import * as vscode from 'vscode';
import { Post } from '../domain/Post';
import { Page } from '../domain/Page';
import { LocalPost } from '../domain/LocalPost';
import { UploadFile } from '../domain/UploadFile';
import { MicroblogService } from '../services/MicroblogService';
import { FileManager } from '../services/FileManager';
import { UploadManager } from '../services/UploadManager';
import { ApiClient } from '../services/ApiClient';

export class MicroblogTreeItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly post?: Post,
		public readonly page?: Page,
		public readonly localPost?: LocalPost,
		public readonly uploadFile?: UploadFile
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
		} else if (page) {
			this.tooltip = this.createPageTooltip(page);
			this.description = this.createPageDescription(page);
			this.iconPath = new vscode.ThemeIcon('browser');
			this.command = {
				command: 'microblog.viewPost',
				title: 'View Page',
				arguments: [page]
			};
		} else if (localPost) {
			this.tooltip = this.createLocalTooltip(localPost);
			this.description = this.createLocalDescription(localPost);
			this.iconPath = new vscode.ThemeIcon('file-text');
			this.contextValue = 'localPost'; // Enable context menu for local posts
			this.command = {
				command: 'microblog.openLocalPost',
				title: 'Open Local Post',
				arguments: [localPost]
			};
		} else if (uploadFile) {
			this.tooltip = this.createUploadTooltip(uploadFile);
			this.description = uploadFile.formattedSize;
			this.iconPath = new vscode.ThemeIcon(uploadFile.iconName);
			this.contextValue = 'uploadFile'; // Enable context menu for upload files
			this.command = {
				command: 'microblog.viewUpload',
				title: 'View Upload',
				arguments: [uploadFile]
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

	private createPageTooltip(page: Page): string {
		const lines = [
			`Title: ${page.title}`,
			`Status: ${page.status}`,
		];
		
		if (page.publishedDate) {
			lines.push(`Published: ${page.publishedDate.toLocaleDateString()}`);
		}
		
		if (page.categories.length > 0) {
			lines.push(`Categories: ${page.categories.join(', ')}`);
		}
		
		return lines.join('\n');
	}

	private createPageDescription(page: Page): string {
		if (page.publishedDate) {
			return page.publishedDate.toLocaleDateString();
		}
		return page.status;
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

	private createUploadTooltip(uploadFile: UploadFile): string {
		const lines = [
			`File: ${uploadFile.fileName}`,
			`Size: ${uploadFile.formattedSize}`,
			`Type: ${uploadFile.mimeType}`,
			`Modified: ${uploadFile.lastModified.toLocaleDateString()}`
		];
		
		if (uploadFile.isImageFile()) {
			lines.push('Right-click for markdown/HTML format');
		}
		
		return lines.join('\n');
	}
}

export class MicroblogTreeProvider implements vscode.TreeDataProvider<MicroblogTreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<MicroblogTreeItem | undefined | null | void> = new vscode.EventEmitter<MicroblogTreeItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<MicroblogTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

	private posts: Post[] = [];
	private pages: Page[] = [];
	private localPosts: LocalPost[] = [];
	private uploadFiles: UploadFile[] = [];
	private uploadManager?: UploadManager;
	private apiClient?: ApiClient;

	// Loading states for different sections
	private loadingStates = {
		localPosts: false,
		remotePosts: false,
		uploads: false
	};

	constructor(
		private microblogService: MicroblogService,
		private fileManager?: FileManager
	) {
		// Create UploadManager if FileManager is available
		if (this.fileManager) {
			this.uploadManager = new UploadManager(this.fileManager);
		}
	}

	/**
	 * Set API client for remote uploads functionality
	 */
	setApiClient(apiClient: ApiClient): void {
		console.log('[Micro.blog] TreeProvider: setApiClient called');
		this.apiClient = apiClient;
		// Update UploadManager with API client if available
		if (this.uploadManager && this.fileManager) {
			console.log('[Micro.blog] TreeProvider: Updating UploadManager with API client');
			this.uploadManager = new UploadManager(this.fileManager, apiClient);
		} else {
			console.log('[Micro.blog] TreeProvider: Cannot update UploadManager - missing dependencies:', {
				uploadManager: !!this.uploadManager,
				fileManager: !!this.fileManager
			});
		}
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	/**
	 * Refresh specific sections
	 */
	async refreshUploads(): Promise<void> {
		if (this.uploadManager) {
			await this.uploadManager.refreshCache();
			this.refresh();
		}
	}

	/**
	 * Check if a section is currently loading
	 */
	isLoading(section: 'localPosts' | 'remotePosts' | 'uploads'): boolean {
		return this.loadingStates[section];
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

			// Load uploads (prioritize remote uploads if API client available)
			if (this.uploadManager) {
				console.log('[Micro.blog] TreeProvider: Starting uploads loading, uploadManager available');
				console.log('[Micro.blog] TreeProvider: API client available:', !!this.apiClient);
				try {
					this.loadingStates.uploads = true;
					
					// Try remote uploads first if API client is available
					if (this.apiClient) {
						console.log('[Micro.blog] TreeProvider: Attempting to fetch remote uploads');
						try {
							this.uploadFiles = await this.uploadManager.fetchRemoteUploads();
							console.log('[Micro.blog] TreeProvider: Remote uploads fetched:', this.uploadFiles.length, 'files');
							// Always show Remote Uploads section when API client available, regardless of count
							console.log('[Micro.blog] TreeProvider: Adding Remote Uploads section to tree');
							categories.push(new MicroblogTreeItem(
								`📁 Remote Uploads (${this.uploadFiles.length})`,
								vscode.TreeItemCollapsibleState.Expanded
							));
						} catch (error) {
							console.error('[Micro.blog] TreeProvider: Failed to load remote uploads:', error);
							// Fallback to local uploads when remote API fails
							console.log('[Micro.blog] TreeProvider: Falling back to local uploads');
							this.uploadFiles = await this.uploadManager.scanUploadsFolder();
							console.log('[Micro.blog] TreeProvider: Local uploads found:', this.uploadFiles.length, 'files');
							// Always show Local Uploads section in fallback scenario, regardless of count
							categories.push(new MicroblogTreeItem(
								`📁 Local Uploads (${this.uploadFiles.length})`,
								vscode.TreeItemCollapsibleState.Expanded
							));
						}
					} else {
						console.log('[Micro.blog] TreeProvider: No API client, using local uploads only');
						// No API client - use local uploads only
						this.uploadFiles = await this.uploadManager.scanUploadsFolder();
						console.log('[Micro.blog] TreeProvider: Local uploads found:', this.uploadFiles.length, 'files');
						// Always show Local Uploads section when no API client, regardless of count
						categories.push(new MicroblogTreeItem(
							`📁 Local Uploads (${this.uploadFiles.length})`,
							vscode.TreeItemCollapsibleState.Expanded
						));
					}
				} catch (error) {
					console.error('[Micro.blog] TreeProvider: Failed to load uploads:', error);
					categories.push(new MicroblogTreeItem(
						'❌ Error loading uploads',
						vscode.TreeItemCollapsibleState.None
					));
				} finally {
					this.loadingStates.uploads = false;
					console.log('[Micro.blog] TreeProvider: Uploads loading completed');
				}
			} else {
				console.log('[Micro.blog] TreeProvider: No uploadManager available - skipping uploads');
			}

			// Load remote content (posts and pages) if configured
			const isConfigured = await this.microblogService.isConfigured();
			if (isConfigured) {
				try {
					this.loadingStates.remotePosts = true;
					
					// Fetch posts and pages separately since they use different API endpoints
					const content = await this.microblogService.fetchContent();
					this.posts = content.posts;
					
					// Fetch pages separately using dedicated pages API
					try {
						console.log('[Micro.blog] TreeProvider: Fetching pages from dedicated API');
						this.pages = await this.microblogService.fetchPages();
						console.log('[Micro.blog] TreeProvider: Pages fetched:', this.pages.length, 'pages');
						
						// Always show Pages section regardless of count
						categories.push(new MicroblogTreeItem(
							`📄 Pages (${this.pages.length})`,
							vscode.TreeItemCollapsibleState.Expanded
						));
					} catch (pagesError) {
						console.error('[Micro.blog] TreeProvider: Failed to fetch pages:', pagesError);
						// Show Pages section with error indicator
						this.pages = [];
						categories.push(new MicroblogTreeItem(
							'❌ Pages (error loading)',
							vscode.TreeItemCollapsibleState.None
						));
					}
					
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
					console.error('[Micro.blog] Failed to fetch remote content:', error);
					categories.push(new MicroblogTreeItem(
						'❌ Error loading remote content (click to retry)',
						vscode.TreeItemCollapsibleState.None
					));
				} finally {
					this.loadingStates.remotePosts = false;
				}
			} else {
				categories.push(new MicroblogTreeItem(
					'📲 Configure micro.blog account',
					vscode.TreeItemCollapsibleState.None
				));
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
					undefined,
					localPost
				));
			} else if (element.label.includes('Pages')) {
				return this.pages
					.sort((a, b) => (b.publishedDate?.getTime() || 0) - (a.publishedDate?.getTime() || 0))
					.map(page => new MicroblogTreeItem(
						page.title,
						vscode.TreeItemCollapsibleState.None,
						undefined,
						page
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
			} else if (element.label.includes('Uploads')) {
				return this.uploadFiles.map(uploadFile => new MicroblogTreeItem(
					uploadFile.displayName,
					vscode.TreeItemCollapsibleState.None,
					undefined,
					undefined,
					undefined,
					uploadFile
				));
			}
		}

		return [];
	}
}
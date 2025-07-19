import * as vscode from 'vscode';
import * as path from 'path';
import { LocalPost } from '../domain/LocalPost';

export class FileManager {
	private readonly workspacePath: string;

	constructor() {
		if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
			throw new Error('No workspace folder is open. Please open a folder to use micro.blog extension.');
		}
		this.workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
	}

	/**
	 * Create the workspace structure for micro.blog
	 */
	public async createWorkspaceStructure(): Promise<void> {
		const microblogDir = vscode.Uri.file(path.join(this.workspacePath, '.microblog'));
		const contentDir = vscode.Uri.file(path.join(this.workspacePath, 'content'));

		try {
			// Create .microblog directory
			await vscode.workspace.fs.createDirectory(microblogDir);
			
			// Create content directory
			await vscode.workspace.fs.createDirectory(contentDir);

			// Create drafts and published folders
			await this.createDraftsAndPublishedFolders();

			// Create config file if it doesn't exist
			const configFile = vscode.Uri.file(path.join(this.workspacePath, '.microblog', 'config.json'));
			try {
				await vscode.workspace.fs.stat(configFile);
			} catch {
				// File doesn't exist, create it
				const defaultConfig = {
					version: '1.0',
					created: new Date().toISOString()
				};
				await vscode.workspace.fs.writeFile(
					configFile,
					Buffer.from(JSON.stringify(defaultConfig, null, 2))
				);
			}

			// Migrate existing flat content structure if needed
			await this.migrateFlatContentToDrafts();
		} catch (error) {
			// Directories might already exist - that's okay
			console.log('[Micro.blog] Workspace structure already exists or creation failed:', error);
		}
	}

	/**
	 * Create a new post file
	 */
	public async createNewPost(title: string, content: string = ''): Promise<LocalPost> {
		await this.createWorkspaceStructure();

		const localPost = LocalPost.create(title, content);
		const filePath = path.join(this.workspacePath, localPost.filePath);
		const fileUri = vscode.Uri.file(filePath);

		// Write the markdown file
		const markdownContent = localPost.toMarkdown();
		await vscode.workspace.fs.writeFile(fileUri, Buffer.from(markdownContent));

		// Open the file in the editor
		const document = await vscode.workspace.openTextDocument(fileUri);
		await vscode.window.showTextDocument(document);

		return localPost;
	}

	/**
	 * Save post content to a file
	 */
	public async savePostContent(fileName: string, content: string): Promise<void> {
		const filePath = path.join(this.workspacePath, 'content', fileName);
		const fileUri = vscode.Uri.file(filePath);
		await vscode.workspace.fs.writeFile(fileUri, Buffer.from(content));
	}

	/**
	 * Read a local post file
	 */
	public async readLocalPost(fileName: string): Promise<LocalPost> {
		const filePath = path.join(this.workspacePath, 'content', fileName);
		const fileUri = vscode.Uri.file(filePath);
		
		const fileContent = await vscode.workspace.fs.readFile(fileUri);
		const markdown = Buffer.from(fileContent).toString('utf8');
		
		return LocalPost.fromMarkdown(markdown, path.join('content', fileName));
	}

	/**
	 * Read a local post file from a specific path
	 */
	public async readLocalPostFromPath(relativePath: string): Promise<LocalPost> {
		const filePath = path.join(this.workspacePath, relativePath);
		const fileUri = vscode.Uri.file(filePath);
		
		const fileContent = await vscode.workspace.fs.readFile(fileUri);
		const markdown = Buffer.from(fileContent).toString('utf8');
		
		return LocalPost.fromMarkdown(markdown, relativePath);
	}

	/**
	 * Get all local post files from both drafts and published folders
	 */
	public async getLocalPosts(): Promise<LocalPost[]> {
		const posts: LocalPost[] = [];
		
		// Get posts from drafts folder
		const drafts = await this.getLocalPostsFromFolder('drafts');
		posts.push(...drafts);
		
		// Get posts from published folder
		const published = await this.getLocalPostsFromFolder('published');
		posts.push(...published);
		
		// Also get posts from flat content structure (for migration)
		const flatPosts = await this.getFlatContentPosts();
		posts.push(...flatPosts);
		
		return posts;
	}

	/**
	 * Get local posts from a specific folder (drafts or published)
	 */
	public async getLocalPostsFromFolder(location: 'drafts' | 'published'): Promise<LocalPost[]> {
		const folderDir = vscode.Uri.file(path.join(this.workspacePath, 'content', location));
		
		try {
			const files = await vscode.workspace.fs.readDirectory(folderDir);
			const posts: LocalPost[] = [];

			for (const [fileName, fileType] of files) {
				if (fileType === vscode.FileType.File && fileName.endsWith('.md')) {
					try {
						const filePath = path.join('content', location, fileName);
						const post = await this.readLocalPostFromPath(filePath);
						posts.push(post);
					} catch (error) {
						console.error(`[Micro.blog] Failed to read local post ${fileName} from ${location}:`, error);
					}
				}
			}

			return posts;
		} catch (error) {
			// Folder doesn't exist yet
			return [];
		}
	}

	/**
	 * Get posts from flat content structure (for backwards compatibility)
	 */
	private async getFlatContentPosts(): Promise<LocalPost[]> {
		const contentDir = vscode.Uri.file(path.join(this.workspacePath, 'content'));
		
		try {
			const files = await vscode.workspace.fs.readDirectory(contentDir);
			const posts: LocalPost[] = [];

			for (const [fileName, fileType] of files) {
				if (fileType === vscode.FileType.File && fileName.endsWith('.md')) {
					try {
						const post = await this.readLocalPost(fileName);
						posts.push(post);
					} catch (error) {
						console.error(`[Micro.blog] Failed to read flat content post ${fileName}:`, error);
					}
				}
			}

			return posts;
		} catch (error) {
			// Content directory doesn't exist yet
			return [];
		}
	}

	/**
	 * Check if workspace has micro.blog structure
	 */
	public async hasWorkspaceStructure(): Promise<boolean> {
		try {
			const microblogDir = vscode.Uri.file(path.join(this.workspacePath, '.microblog'));
			const contentDir = vscode.Uri.file(path.join(this.workspacePath, 'content'));
			
			await vscode.workspace.fs.stat(microblogDir);
			await vscode.workspace.fs.stat(contentDir);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Watch for changes to local content (drafts and published folders)
	 */
	public watchLocalChanges(): vscode.FileSystemWatcher {
		const pattern = new vscode.RelativePattern(
			vscode.workspace.workspaceFolders![0],
			'content/**/*.md'
		);
		
		return vscode.workspace.createFileSystemWatcher(pattern);
	}

	/**
	 * Delete a local post file
	 */
	public async deleteLocalPost(fileName: string): Promise<void> {
		const filePath = path.join(this.workspacePath, 'content', fileName);
		const fileUri = vscode.Uri.file(filePath);
		await vscode.workspace.fs.delete(fileUri);
	}

	/**
	 * Check if a file exists
	 */
	public async fileExists(relativePath: string): Promise<boolean> {
		try {
			const filePath = path.join(this.workspacePath, relativePath);
			const fileUri = vscode.Uri.file(filePath);
			await vscode.workspace.fs.stat(fileUri);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Get the workspace path
	 */
	public getWorkspacePath(): string {
		return this.workspacePath;
	}

	/**
	 * Get the uploads directory path
	 */
	public getUploadsPath(): string {
		return path.join(this.workspacePath, 'uploads');
	}

	/**
	 * Check if uploads directory exists
	 */
	public async uploadsExists(): Promise<boolean> {
		try {
			const uploadsDir = vscode.Uri.file(this.getUploadsPath());
			await vscode.workspace.fs.stat(uploadsDir);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Ensure uploads directory exists
	 */
	public async ensureUploadsDirectory(): Promise<void> {
		const uploadsDir = vscode.Uri.file(this.getUploadsPath());
		try {
			await vscode.workspace.fs.createDirectory(uploadsDir);
		} catch (error) {
			// Directory might already exist - that's okay
			console.log('[Micro.blog] Uploads directory already exists or creation failed:', error);
		}
	}

	/**
	 * Create drafts and published folders
	 */
	public async createDraftsAndPublishedFolders(): Promise<void> {
		const draftsDir = vscode.Uri.file(path.join(this.workspacePath, 'content', 'drafts'));
		const publishedDir = vscode.Uri.file(path.join(this.workspacePath, 'content', 'published'));

		try {
			await vscode.workspace.fs.createDirectory(draftsDir);
		} catch (error) {
			// Directory might already exist - that's okay
			console.log('[Micro.blog] Drafts directory already exists or creation failed:', error);
		}

		try {
			await vscode.workspace.fs.createDirectory(publishedDir);
		} catch (error) {
			// Directory might already exist - that's okay
			console.log('[Micro.blog] Published directory already exists or creation failed:', error);
		}
	}

	/**
	 * Move a local post from drafts to published folder
	 */
	public async moveToPublished(localPost: LocalPost): Promise<void> {
		const publishedPost = localPost.createPublishedVersion();
		const oldFilePath = path.join(this.workspacePath, localPost.filePath);
		const newFilePath = path.join(this.workspacePath, publishedPost.filePath);
		
		// Ensure published directory exists
		await this.createDraftsAndPublishedFolders();

		try {
			// Handle name conflicts by auto-renaming
			const resolvedNewPath = await this.resolveFileConflict(newFilePath);
			
			// Read the content and update it with new location
			const fileContent = await vscode.workspace.fs.readFile(vscode.Uri.file(oldFilePath));
			const markdown = Buffer.from(fileContent).toString('utf8');
			const updatedPost = LocalPost.fromMarkdown(markdown, publishedPost.filePath);
			const updatedContent = updatedPost.toMarkdown();

			// Write to new location
			await vscode.workspace.fs.writeFile(
				vscode.Uri.file(resolvedNewPath), 
				Buffer.from(updatedContent)
			);
			
			// Delete old file
			await vscode.workspace.fs.delete(vscode.Uri.file(oldFilePath));

			console.log(`[Micro.blog] Moved post from ${localPost.filePath} to published folder`);
		} catch (error) {
			console.error('[Micro.blog] Failed to move post to published folder:', error);
			throw error;
		}
	}

	/**
	 * Migrate existing flat content structure to drafts folder
	 */
	public async migrateFlatContentToDrafts(): Promise<void> {
		const contentDir = vscode.Uri.file(path.join(this.workspacePath, 'content'));
		const draftsDir = vscode.Uri.file(path.join(this.workspacePath, 'content', 'drafts'));

		try {
			const files = await vscode.workspace.fs.readDirectory(contentDir);
			let migratedCount = 0;

			for (const [fileName, fileType] of files) {
				// Only migrate .md files that are not in subdirectories
				if (fileType === vscode.FileType.File && fileName.endsWith('.md')) {
					const oldFilePath = path.join(this.workspacePath, 'content', fileName);
					const newFilePath = path.join(this.workspacePath, 'content', 'drafts', fileName);

					try {
						// Ensure drafts directory exists
						await vscode.workspace.fs.createDirectory(draftsDir);

						// Read content and update location in frontmatter
						const fileContent = await vscode.workspace.fs.readFile(vscode.Uri.file(oldFilePath));
						const markdown = Buffer.from(fileContent).toString('utf8');
						const post = LocalPost.fromMarkdown(markdown, `content/drafts/${fileName}`);
						const updatedContent = post.toMarkdown();

						// Write to drafts folder
						await vscode.workspace.fs.writeFile(
							vscode.Uri.file(newFilePath), 
							Buffer.from(updatedContent)
						);
						
						// Delete old file
						await vscode.workspace.fs.delete(vscode.Uri.file(oldFilePath));
						migratedCount++;
					} catch (error) {
						console.error(`[Micro.blog] Failed to migrate ${fileName}:`, error);
					}
				}
			}

			if (migratedCount > 0) {
				console.log(`[Micro.blog] Migrated ${migratedCount} posts to drafts folder`);
				vscode.window.showInformationMessage(`Migrated ${migratedCount} existing posts to drafts folder`);
			}
		} catch (error) {
			console.error('[Micro.blog] Migration failed:', error);
		}
	}

	/**
	 * Resolve file name conflicts by adding timestamp
	 */
	private async resolveFileConflict(filePath: string): Promise<string> {
		let resolvedPath = filePath;
		let counter = 1;

		while (await this.fileExists(path.relative(this.workspacePath, resolvedPath))) {
			const dir = path.dirname(filePath);
			const ext = path.extname(filePath);
			const basename = path.basename(filePath, ext);
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
			resolvedPath = path.join(dir, `${basename}-${timestamp}${ext}`);
			counter++;
			
			// Prevent infinite loop
			if (counter > 10) {
				break;
			}
		}

		return resolvedPath;
	}
}
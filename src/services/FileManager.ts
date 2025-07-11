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
	 * Get all local post files
	 */
	public async getLocalPosts(): Promise<LocalPost[]> {
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
						console.error(`[Micro.blog] Failed to read local post ${fileName}:`, error);
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
	 * Watch for changes to local content
	 */
	public watchLocalChanges(): vscode.FileSystemWatcher {
		const pattern = new vscode.RelativePattern(
			vscode.workspace.workspaceFolders![0],
			'content/*.md'
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
}
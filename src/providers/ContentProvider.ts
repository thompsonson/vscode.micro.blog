import * as vscode from 'vscode';
import { Post } from '../domain/Post';

export class ContentProvider implements vscode.TextDocumentContentProvider {
	private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
	readonly onDidChange = this._onDidChange.event;

	private posts = new Map<string, Post>();

	provideTextDocumentContent(uri: vscode.Uri): string {
		const postId = uri.path;
		const post = this.posts.get(postId);

		if (!post) {
			return 'Post not found';
		}

		return this.formatPostContent(post);
	}

	showPost(post: Post): void {
		const postId = this.generatePostId(post);
		this.posts.set(postId, post);

		const uri = vscode.Uri.parse(`microblog:${postId}`);
		
		vscode.workspace.openTextDocument(uri).then(doc => {
			vscode.window.showTextDocument(doc, {
				preview: true,
				viewColumn: vscode.ViewColumn.Beside
			});
		});
	}

	private generatePostId(post: Post): string {
		// Use URL if available, otherwise generate from title and date
		if (post.url) {
			return post.url.replace(/[^a-zA-Z0-9]/g, '_');
		}
		
		const titlePart = post.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
		const datePart = post.publishedDate?.toISOString().substring(0, 10) || 'draft';
		return `${titlePart}_${datePart}`;
	}

	private formatPostContent(post: Post): string {
		const lines: string[] = [];

		// Add metadata header
		lines.push('---');
		lines.push(`Title: ${post.title}`);
		lines.push(`Status: ${post.status}`);
		
		if (post.publishedDate) {
			lines.push(`Published: ${post.publishedDate.toISOString()}`);
		}
		
		if (post.url) {
			lines.push(`URL: ${post.url}`);
		}
		
		if (post.categories.length > 0) {
			lines.push(`Categories: ${post.categories.join(', ')}`);
		}
		
		lines.push('---');
		lines.push('');

		// Add content
		lines.push(this.cleanContent(post.content));

		return lines.join('\n');
	}

	private cleanContent(content: string): string {
		// Remove HTML tags for better readability in plain text
		return content
			.replace(/<br\s*\/?>/gi, '\n')
			.replace(/<p>/gi, '\n')
			.replace(/<\/p>/gi, '\n')
			.replace(/<[^>]*>/g, '')
			.replace(/&nbsp;/g, ' ')
			.replace(/&amp;/g, '&')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&quot;/g, '"')
			.trim();
	}
}
import * as vscode from 'vscode';
import { Post } from '../domain/Post';
import { Page } from '../domain/Page';

type ContentItem = Post | Page;

export class ContentProvider implements vscode.TextDocumentContentProvider {
	private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
	readonly onDidChange = this._onDidChange.event;

	private content = new Map<string, ContentItem>();

	provideTextDocumentContent(uri: vscode.Uri): string {
		const contentId = uri.path;
		const item = this.content.get(contentId);

		if (!item) {
			return 'Content not found';
		}

		return this.formatContent(item);
	}

	showPost(post: Post): void {
		const contentId = this.generateContentId(post);
		this.content.set(contentId, post);

		const uri = vscode.Uri.parse(`microblog:${contentId}`);
		
		vscode.workspace.openTextDocument(uri).then(doc => {
			vscode.window.showTextDocument(doc, {
				preview: true,
				viewColumn: vscode.ViewColumn.Beside
			});
		});
	}

	showPage(page: Page): void {
		const contentId = this.generateContentId(page);
		this.content.set(contentId, page);

		const uri = vscode.Uri.parse(`microblog:${contentId}`);
		
		vscode.workspace.openTextDocument(uri).then(doc => {
			vscode.window.showTextDocument(doc, {
				preview: true,
				viewColumn: vscode.ViewColumn.Beside
			});
		});
	}

	private generateContentId(item: ContentItem): string {
		// Use URL if available, otherwise generate from title and date
		if (item.url) {
			return item.url.replace(/[^a-zA-Z0-9]/g, '_');
		}
		
		const titlePart = item.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
		const datePart = item.publishedDate?.toISOString().substring(0, 10) || 'draft';
		return `${titlePart}_${datePart}`;
	}

	private formatContent(item: ContentItem): string {
		const lines: string[] = [];

		// Add metadata header
		lines.push('---');
		lines.push(`Title: ${item.title}`);
		lines.push(`Type: ${item instanceof Page ? 'Page' : 'Post'}`);
		lines.push(`Status: ${item.status}`);
		
		if (item.publishedDate) {
			lines.push(`Published: ${item.publishedDate.toISOString()}`);
		}
		
		if (item.url) {
			lines.push(`URL: ${item.url}`);
		}
		
		if (item.categories.length > 0) {
			lines.push(`Categories: ${item.categories.join(', ')}`);
		}
		
		lines.push('---');
		lines.push('');

		// Add content
		lines.push(this.cleanContent(item.content));

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
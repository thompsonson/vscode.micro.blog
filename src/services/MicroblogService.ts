import * as vscode from 'vscode';
import { Blog } from '../domain/Blog';
import { Post } from '../domain/Post';
import { Page } from '../domain/Page';
import { Credentials } from '../domain/Credentials';
import { ApiClient, ContentResponse } from './ApiClient';
import { API_ENDPOINTS, STORAGE_KEYS } from '../config/constants';
import { VerifyTokenResponse } from './ApiClient';

export class MicroblogService {
	private static readonly BLOG_CONFIG_KEY = STORAGE_KEYS.BLOG_CONFIG;
	private static readonly CREDENTIALS_KEY = STORAGE_KEYS.CREDENTIALS;

	constructor(
		private context: vscode.ExtensionContext,
		private secretStorage: vscode.SecretStorage
	) {}

	async configureBlog(appToken: string): Promise<void> {
		console.log(`[Micro.blog] Starting configuration with app token`);
		
		// Validate inputs
		if (!Credentials.isValid(appToken)) {
			throw new Error('Valid app token is required');
		}

		const credentials = new Credentials(appToken);
		console.log(`[Micro.blog] App token validated`);
		
		// Validate credentials using proper verification endpoint
		const apiClient = new ApiClient(credentials);
		
		try {
			console.log(`[Micro.blog] Verifying credentials...`);
			const verifyResponse = await apiClient.verifyToken(API_ENDPOINTS.TOKEN_VERIFY);
			console.log(`[Micro.blog] Credentials verified for: ${verifyResponse.name} (@${verifyResponse.username})`);
			
			// Fetch posts to discover domain
			console.log(`[Micro.blog] Fetching posts to discover domain...`);
			const posts = await apiClient.fetchPosts(API_ENDPOINTS.MICROPUB_SOURCE);
			console.log(`[Micro.blog] Successfully fetched ${posts.length} posts`);
			
			if (posts.length === 0) {
				throw new Error('No posts found. Please ensure you have published at least one post to your micro.blog.');
			}

			// Extract domain from first post URL
			const firstPostUrl = posts[0].url;
			if (!firstPostUrl) {
				throw new Error('Unable to determine blog domain from posts');
			}

			const domain = new URL(firstPostUrl).hostname;
			console.log(`[Micro.blog] Discovered blog domain: ${domain}`);

			// Create blog configuration with discovered domain
			const blog = Blog.create(domain);
			
			// Store configuration
			await this.saveBlogConfiguration(blog);
			await this.saveCredentials(credentials);
			
			// Set context for UI
			await vscode.commands.executeCommand('setContext', 'microblog:configured', true);
			console.log(`[Micro.blog] Configuration completed successfully`);
			
		} catch (error) {
			console.log(`[Micro.blog] Configuration failed:`, error);
			throw new Error(`Configuration failed: ${error instanceof Error ? error.message : error}`);
		}
	}

	async getBlogConfiguration(): Promise<Blog | undefined> {
		const blogData = this.context.globalState.get<any>(MicroblogService.BLOG_CONFIG_KEY);
		if (!blogData) {
			return undefined;
		}

		return new Blog(blogData.domain, blogData.name, blogData.apiEndpoint);
	}

	async getCredentials(): Promise<Credentials | undefined> {
		const token = await this.secretStorage.get(MicroblogService.CREDENTIALS_KEY);
		if (!token) {
			return undefined;
		}

		return new Credentials(token);
	}

	async fetchPosts(): Promise<Post[]> {
		const content = await this.fetchContent();
		return content.posts;
	}

	async fetchPages(): Promise<Page[]> {
		const blog = await this.getBlogConfiguration();
		const credentials = await this.getCredentials();

		if (!blog || !credentials) {
			throw new Error('Blog not configured. Please run "Configure Micro.blog" command first.');
		}

		const apiClient = new ApiClient(credentials);
		return await apiClient.fetchPages(blog.apiEndpoint);
	}

	async fetchContent(): Promise<ContentResponse> {
		const blog = await this.getBlogConfiguration();
		const credentials = await this.getCredentials();

		if (!blog || !credentials) {
			throw new Error('Blog not configured. Please run "Configure Micro.blog" command first.');
		}

		const apiClient = new ApiClient(credentials);
		return await apiClient.fetchContent(blog.apiEndpoint);
	}

	async isConfigured(): Promise<boolean> {
		const blog = await this.getBlogConfiguration();
		const credentials = await this.getCredentials();
		return !!(blog && credentials);
	}

	async testConnection(): Promise<{ isValid: boolean; userInfo?: VerifyTokenResponse; postCount?: number; error?: string }> {
		try {
			const credentials = await this.getCredentials();
			if (!credentials) {
				return { isValid: false, error: 'No credentials configured. Please run "Configure Micro.blog" first.' };
			}

			const apiClient = new ApiClient(credentials);
			
			// Verify token
			const userInfo = await apiClient.verifyToken(API_ENDPOINTS.TOKEN_VERIFY);
			
			// Get post count
			const posts = await apiClient.fetchPosts(API_ENDPOINTS.MICROPUB_SOURCE);
			
			return {
				isValid: true,
				userInfo,
				postCount: posts.length
			};
		} catch (error) {
			return {
				isValid: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}

	private async saveBlogConfiguration(blog: Blog): Promise<void> {
		await this.context.globalState.update(MicroblogService.BLOG_CONFIG_KEY, {
			domain: blog.domain,
			name: blog.name,
			apiEndpoint: blog.apiEndpoint
		});
	}

	private async saveCredentials(credentials: Credentials): Promise<void> {
		await this.secretStorage.store(MicroblogService.CREDENTIALS_KEY, credentials.appToken);
	}

	async verifyAndSetContext(): Promise<boolean> {
		try {
			const isConfigured = await this.isConfigured();
			if (!isConfigured) {
				console.log('[Micro.blog] Extension not configured, skipping context setting');
				return false;
			}

			// Verify credentials are still valid with a lightweight API call
			const credentials = await this.getCredentials();
			if (!credentials) {
				console.log('[Micro.blog] No credentials found during context verification');
				return false;
			}

			const apiClient = new ApiClient(credentials);
			
			// Use token verification endpoint to check if credentials are still valid
			console.log('[Micro.blog] Verifying stored credentials...');
			await apiClient.verifyToken(API_ENDPOINTS.TOKEN_VERIFY);
			
			// If verification succeeds, set the configured context
			await vscode.commands.executeCommand('setContext', 'microblog:configured', true);
			console.log('[Micro.blog] Credentials verified and context set to configured');
			return true;
			
		} catch (error) {
			console.log('[Micro.blog] Credential verification failed:', error);
			// Don't set context if verification fails
			await vscode.commands.executeCommand('setContext', 'microblog:configured', false);
			return false;
		}
	}

	async getApiClient(): Promise<ApiClient | undefined> {
		const credentials = await this.getCredentials();
		return credentials ? new ApiClient(credentials) : undefined;
	}
}
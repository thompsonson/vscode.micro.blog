import * as vscode from 'vscode';
import * as path from 'path';
import { LocalPost } from '../../../src/domain/LocalPost';

export interface TestPost {
    title: string;
    content: string;
    status: 'draft' | 'published';
    type?: 'post' | 'page';
}

export async function createTestPost(postData: TestPost): Promise<LocalPost> {
    const post = LocalPost.create(postData.title, postData.content);
    
    // Create the actual file in the test workspace
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
        const contentDir = vscode.Uri.joinPath(workspaceFolder.uri, 'content');
        await vscode.workspace.fs.createDirectory(contentDir);
        
        const filePath = vscode.Uri.joinPath(contentDir, path.basename(post.filePath));
        const content = post.toMarkdown();
        await vscode.workspace.fs.writeFile(filePath, Buffer.from(content));
    }
    
    return post;
}

export async function createTestFiles(filePaths: string[]): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        throw new Error('No workspace folder available');
    }
    
    for (const filePath of filePaths) {
        const fullPath = vscode.Uri.joinPath(workspaceFolder.uri, filePath);
        const dirPath = vscode.Uri.joinPath(fullPath, '..');
        
        // Create directory if it doesn't exist
        try {
            await vscode.workspace.fs.createDirectory(dirPath);
        } catch (error) {
            // Directory might already exist
        }
        
        // Create file with test content
        const content = getTestFileContent(filePath);
        await vscode.workspace.fs.writeFile(fullPath, Buffer.from(content));
    }
}

export async function addFileToUploads(filename: string): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        throw new Error('No workspace folder available');
    }
    
    const uploadsDir = vscode.Uri.joinPath(workspaceFolder.uri, 'uploads');
    await vscode.workspace.fs.createDirectory(uploadsDir);
    
    const filePath = vscode.Uri.joinPath(uploadsDir, filename);
    const content = getTestImageContent(filename);
    await vscode.workspace.fs.writeFile(filePath, content);
}

export async function setupTestWorkspace(): Promise<void> {
    // Use real VS Code workspace APIs
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        // If no workspace is open, we're in test environment - this is expected
        console.log('No workspace folder available in test environment');
        return;
    }
    
    // Create standard micro.blog directory structure using real VS Code APIs
    const directories = [
        'content',
        'uploads',
        '.microblog'
    ];
    
    for (const dir of directories) {
        const dirPath = vscode.Uri.joinPath(workspaceFolder.uri, dir);
        try {
            await vscode.workspace.fs.createDirectory(dirPath);
        } catch (error) {
            // Directory might already exist - this is fine
            console.log(`Directory ${dir} already exists or creation failed:`, error);
        }
    }
}

export async function cleanupTestWorkspace(): Promise<void> {
    // Use real VS Code workspace APIs for cleanup
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        console.log('No workspace folder available for cleanup');
        return;
    }
    
    // Clean up test files using real VS Code APIs
    const testDirectories = ['content', 'uploads', '.microblog'];
    
    for (const dir of testDirectories) {
        const dirPath = vscode.Uri.joinPath(workspaceFolder.uri, dir);
        try {
            await vscode.workspace.fs.delete(dirPath, { recursive: true });
        } catch (error) {
            // Directory might not exist - this is fine
            console.log(`Directory ${dir} cleanup failed or doesn't exist:`, error);
        }
    }
}

export function getTestFileContent(filePath: string): string {
    const ext = path.extname(filePath);
    const basename = path.basename(filePath, ext);
    
    switch (ext) {
        case '.md':
            return `---
title: "${basename}"
status: "draft"
type: "post"
---

# ${basename}

This is test content for ${basename}.
`;
        case '.txt':
            return `Test content for ${basename}`;
        case '.jpg':
        case '.jpeg':
        case '.png':
        case '.gif':
            return 'Binary image content placeholder';
        default:
            return `Test file: ${basename}`;
    }
}

export function getTestImageContent(filename: string): Uint8Array {
    // Create a minimal valid image file for testing
    // This is a 1x1 pixel PNG image
    const pngHeader = new Uint8Array([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
        0x49, 0x48, 0x44, 0x52, // IHDR
        0x00, 0x00, 0x00, 0x01, // width: 1
        0x00, 0x00, 0x00, 0x01, // height: 1
        0x08, 0x06, 0x00, 0x00, 0x00, // bit depth, color type, compression, filter, interlace
        0x1F, 0x15, 0xC4, 0x89, // CRC
        0x00, 0x00, 0x00, 0x0D, // IDAT chunk length
        0x49, 0x44, 0x41, 0x54, // IDAT
        0x78, 0x9C, 0x62, 0x00, 0x02, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, // compressed data
        0x00, 0x00, 0x00, 0x00, // IEND chunk length
        0x49, 0x45, 0x4E, 0x44, // IEND
        0xAE, 0x42, 0x60, 0x82  // CRC
    ]);
    
    return pngHeader;
}

export async function getUploadItems(): Promise<string[]> {
    // Mock implementation for getting upload items from tree view
    return ['🖼️ test-image.jpg', '📄 document.pdf'];
}

export async function getPageItems(): Promise<string[]> {
    // Mock implementation for getting page items from tree view
    return ['📄 About Me', '📄 Contact'];
}

export async function rightClickUploadItem(filename: string): Promise<string[]> {
    // Mock implementation for right-click context menu
    return ['Copy as Markdown', 'Copy as HTML', 'Copy URL'];
}

export async function rightClickPageItem(pageName: string): Promise<string[]> {
    // Mock implementation for page right-click context menu
    return ['Copy Link', 'Copy as Markdown Link', 'Open in Browser'];
}

export async function selectContextMenuItem(menuItem: string): Promise<void> {
    // Mock implementation for selecting context menu item
}

export async function getClipboardText(): Promise<string> {
    // Use real VS Code clipboard API
    return await vscode.env.clipboard.readText();
}

export async function getUploadsSectionState(): Promise<string> {
    // Mock implementation for getting uploads section state
    return 'loaded';
}

export async function hasRetryOption(): Promise<boolean> {
    // Mock implementation for checking retry option
    return false;
}

export async function clickRetryUploads(): Promise<void> {
    // Mock implementation for clicking retry button
}
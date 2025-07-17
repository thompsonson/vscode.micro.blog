/**
 * Micro.blog VS Code Extension - Comprehensive Regression Test Suite
 * 
 * This file contains all acceptance tests for the extension's core features.
 * Run this suite to validate functionality across all implemented features.
 */

import { expect } from '@jest/globals';
import { 
  setupConfiguredExtension, 
  executeCommand, 
  getTreeSections, 
  getTreeViewItems,
  mockApiResponse,
  mockApiError,
  createTestPost,
  createTestFiles,
  addFileToUploads
} from './test-helpers';

describe('Micro.blog Extension - Full Regression Suite', () => {

  // ============================================================================
  // PHASE 1: READ-ONLY BROWSING (MVP)
  // ============================================================================
  
  describe('Phase 1: Content Browsing', () => {
    test('extension loads and shows configured tree view', async () => {
      // Given: Extension is configured with valid credentials
      await setupConfiguredExtension();
      
      // When: Tree view loads
      const sections = await getTreeSections();
      
      // Then: All main sections are visible
      expect(sections).toContain('📄 Published Posts');
      expect(sections).toContain('📋 Remote Drafts');
    });

    test('user can view remote post content', async () => {
      // Given: Extension is configured and has remote posts
      await setupConfiguredExtension();
      mockApiResponse('/micropub?q=source', {
        items: [
          {
            type: ['h-entry'],
            properties: {
              name: ['Test Post'],
              content: ['Test content'],
              url: ['https://user.micro.blog/123']
            }
          }
        ]
      });
      
      // When: User clicks on a post
      await executeCommand('microblog.viewPost', 'test-post-id');
      
      // Then: Post content opens in editor
      const activeEditor = await getActiveEditor();
      expect(activeEditor.document.getText()).toContain('Test Post');
      expect(activeEditor.document.getText()).toContain('Test content');
    });
  });

  // ============================================================================
  // PHASE 2: LOCAL CONTENT CREATION
  // ============================================================================

  describe('Phase 2: Local Content Creation', () => {
    test('user can create new local post', async () => {
      // Given: Extension is configured with workspace
      await setupConfiguredExtension();
      
      // When: User creates new post
      await executeCommand('microblog.newPost');
      await inputPostTitle('My Test Post');
      
      // Then: Local file is created and appears in tree
      expect(await fileExists('./content/my-test-post.md')).toBe(true);
      expect(await getTreeViewItems()).toContain('📝 Local Drafts (1)');
      
      // And: File has correct frontmatter
      const content = await readFile('./content/my-test-post.md');
      expect(content).toContain('title: "My Test Post"');
      expect(content).toContain('status: "draft"');
      expect(content).toContain('type: "post"');
    });

    test('tree view updates when local files change', async () => {
      // Given: Existing local drafts
      await setupConfiguredExtension();
      await createTestFiles(['post1.md']);
      
      // When: New file added to content folder
      await addFileToContent('post2.md');
      
      // Then: Tree view reflects the change
      expect(await getTreeViewItems()).toContain('📝 Local Drafts (2)');
    });
  });

  // ============================================================================
  // PHASE 3: PUBLISHING WORKFLOW
  // ============================================================================

  describe('Phase 3: Publishing', () => {
    test('user can publish local post successfully', async () => {
      // Given: Local post with valid content
      const localPost = await createTestPost({
        title: 'Test Post',
        content: 'Test content',
        status: 'draft'
      });
      
      // When: User publishes the post
      await executeCommand('microblog.publishPost', localPost);
      
      // Then: API called correctly
      expect(mockApiClient.publishPost).toHaveBeenCalledWith({
        h: 'entry',
        name: 'Test Post',
        content: 'Test content'
      });
      
      // And: Success notification shown
      expect(showSuccessMessage).toHaveBeenCalledWith(
        expect.stringContaining('published successfully')
      );
    });

    test('publishing handles validation errors gracefully', async () => {
      // Given: Local post with invalid content (missing title)
      const localPost = await createTestPost({
        title: '',
        content: 'Content without title',
        status: 'draft'
      });
      
      // When: User attempts to publish
      await executeCommand('microblog.publishPost', localPost);
      
      // Then: Validation error shown
      expect(showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Title is required')
      );
      
      // And: API not called
      expect(mockApiClient.publishPost).not.toHaveBeenCalled();
    });

    test('publishing handles network errors gracefully', async () => {
      // Given: Local post with valid content
      const localPost = await createTestPost({
        title: 'Test Post',
        content: 'Test content',
        status: 'draft'
      });
      
      // And: API returns network error
      mockApiError('/micropub', 500);
      
      // When: User publishes
      await executeCommand('microblog.publishPost', localPost);
      
      // Then: Error handled gracefully
      expect(showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('network error')
      );
    });
  });

  // ============================================================================
  // PHASE 4: IMAGE UPLOAD
  // ============================================================================

  describe('Phase 4: Image Upload', () => {
    test('user can upload image and receive URL', async () => {
      // Given: Valid image file in uploads folder
      const imagePath = './uploads/test-image.jpg';
      await createTestFiles([imagePath]);
      
      // And: Media endpoint configured
      mockApiResponse('/micropub?q=config', {
        'media-endpoint': 'https://micro.blog/micropub/media'
      });
      
      // And: Upload succeeds
      mockApiResponse('https://micro.blog/micropub/media', {
        status: 202,
        headers: { 'Location': 'https://user.micro.blog/uploads/test-image.jpg' }
      });
      
      // When: User uploads image
      const result = await executeCommand('microblog.uploadImage', imagePath);
      
      // Then: Media endpoint discovered
      expect(mockApiClient.getConfig).toHaveBeenCalled();
      
      // And: Image uploaded
      expect(mockApiClient.uploadMedia).toHaveBeenCalledWith(
        'https://micro.blog/micropub/media',
        expect.any(FormData)
      );
      
      // And: URL returned with markdown option
      expect(result.url).toBe('https://user.micro.blog/uploads/test-image.jpg');
      expect(result.markdownFormat).toBe('![test-image](https://user.micro.blog/uploads/test-image.jpg)');
    });

    test('upload handles file validation errors', async () => {
      // Given: Invalid file type
      const invalidFile = './uploads/document.txt';
      
      // When: User attempts upload
      const result = await executeCommand('microblog.uploadImage', invalidFile);
      
      // Then: Validation error returned
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid file type');
      
      // And: API not called
      expect(mockApiClient.uploadMedia).not.toHaveBeenCalled();
    });

    test('upload retries on network failures', async () => {
      // Given: Valid image file
      const imagePath = './uploads/test-image.jpg';
      
      // And: First attempt fails, second succeeds
      mockApiError('https://micro.blog/micropub/media', 500)
        .mockResolvedValueOnce({
          status: 202,
          headers: { 'Location': 'https://user.micro.blog/uploads/test-image.jpg' }
        });
      
      // When: User uploads
      const result = await executeCommand('microblog.uploadImage', imagePath);
      
      // Then: Retry succeeded
      expect(mockApiClient.uploadMedia).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
      expect(result.retryCount).toBe(1);
    });
  });

  // ============================================================================
  // PHASE 5: TREE VIEW ENHANCEMENTS
  // ============================================================================

  describe('Phase 5: Tree View Features', () => {
    
    describe('Remote Uploads Display', () => {
      test('shows remote uploads section with API count', async () => {
        // Given: Mock API response with uploaded files
        mockApiResponse('/micropub/media?q=source', {
          items: [
            { 
              url: 'https://user.micro.blog/uploads/image1.png', 
              published: '2025-07-11T10:00:00Z',
              alt: 'First image'
            },
            { 
              url: 'https://user.micro.blog/uploads/image2.jpg', 
              published: '2025-07-10T15:30:00Z',
              alt: 'Second image'
            }
          ]
        });
        
        // When: Tree provider refreshes
        await treeProvider.refresh();
        
        // Then: Uploads section appears with API count
        const sections = await getTreeSections();
        expect(sections).toContain('📁 Uploads (2)');
        
        // And: Individual files shown
        const uploadItems = await getUploadItems();
        expect(uploadItems).toContain('🖼️ image1.png (2025-07-11)');
        expect(uploadItems).toContain('🖼️ image2.jpg (2025-07-10)');
      });

      test('uploads context menu provides markdown copying', async () => {
        // Given: Uploads section with files
        await setupUploadsSection();
        
        // When: User right-clicks on uploaded image
        const contextMenu = await rightClickUploadItem('image1.png');
        
        // Then: Markdown options available
        expect(contextMenu).toContain('Copy as Markdown');
        expect(contextMenu).toContain('Copy as HTML');
        
        // When: User selects markdown option
        await selectContextMenuItem('Copy as Markdown');
        
        // Then: Markdown copied to clipboard
        expect(await getClipboardText()).toBe(
          '![image1](https://user.micro.blog/uploads/image1.png)'
        );
      });

      test('handles uploads API failures gracefully', async () => {
        // Given: API returns error
        mockApiError('/micropub/media?q=source', 500);
        
        // When: Tree provider refreshes
        await treeProvider.refresh();
        
        // Then: Error state shown with retry option
        expect(getUploadsSectionState()).toBe('error');
        expect(hasRetryOption()).toBe(true);
        
        // When: User clicks retry
        await clickRetryUploads();
        
        // Then: API called again
        expect(mockApiClient.fetchUploadedMedia).toHaveBeenCalledTimes(2);
      });
    });

    describe('Pages Display', () => {
      test('shows pages section with filtered count', async () => {
        // Given: Mock API response with posts including pages
        mockApiResponse('/posts/username', {
          items: [
            { 
              id: 1, 
              title: 'About Me', 
              url: 'https://user.micro.blog/about/',
              content_text: 'This is a longer about page with detailed information about the user and their background.',
              date_published: '2025-07-01T10:00:00Z'
            },
            {
              id: 2,
              title: 'Quick Update',
              url: 'https://user.micro.blog/123',
              content_text: 'Short post content.',
              date_published: '2025-07-02T10:00:00Z'
            },
            {
              id: 3,
              title: 'Contact',
              url: 'https://user.micro.blog/contact/',
              content_text: 'Contact information and details about how to reach me for business inquiries.',
              date_published: '2025-06-15T10:00:00Z'
            }
          ]
        });
        
        // When: Tree provider refreshes
        await treeProvider.refresh();
        
        // Then: Pages section appears with filtered count (2 pages, 1 post)
        const sections = await getTreeSections();
        expect(sections).toContain('📄 Pages (2)');
        
        // And: Only pages shown in section
        const pageItems = await getPageItems();
        expect(pageItems).toContain('📄 About Me (2025-07-01)');
        expect(pageItems).toContain('📄 Contact (2025-06-15)');
        expect(pageItems).not.toContain('Quick Update');
      });

      test('pages context menu provides link copying', async () => {
        // Given: Pages section with pages
        await setupPagesSection();
        
        // When: User right-clicks on page
        const contextMenu = await rightClickPageItem('About Me');
        
        // Then: Link options available
        expect(contextMenu).toContain('Copy Link');
        expect(contextMenu).toContain('Copy as Markdown Link');
        
        // When: User selects markdown link option
        await selectContextMenuItem('Copy as Markdown Link');
        
        // Then: Markdown link copied to clipboard
        expect(await getClipboardText()).toBe(
          '[About Me](https://user.micro.blog/about/)'
        );
      });
    });
  });

  // ============================================================================
  // INTEGRATION TESTS
  // ============================================================================

  describe('Full Workflow Integration', () => {
    test('complete content creation and publishing workflow', async () => {
      // Given: Configured extension
      await setupConfiguredExtension();
      
      // When: User creates new post
      await executeCommand('microblog.newPost');
      await inputPostTitle('Integration Test Post');
      
      // Then: Local draft created
      expect(await getTreeViewItems()).toContain('📝 Local Drafts (1)');
      
      // When: User edits and publishes post
      await editPostContent('This is test content for integration testing.');
      await executeCommand('microblog.publishPost', 'integration-test-post.md');
      
      // Then: Post published successfully
      expect(mockApiClient.publishPost).toHaveBeenCalled();
      expect(showSuccessMessage).toHaveBeenCalledWith(
        expect.stringContaining('published successfully')
      );
    });

    test('complete image workflow with post integration', async () => {
      // Given: Image uploaded successfully
      const uploadResult = await executeCommand('microblog.uploadImage', './uploads/test.jpg');
      expect(uploadResult.success).toBe(true);
      
      // And: Local post created
      await executeCommand('microblog.newPost');
      await inputPostTitle('Post with Image');
      
      // When: User adds image to post content
      await editPostContent(`
        # Post with Image
        
        Here's my uploaded image:
        
        ${uploadResult.markdownFormat}
      `);
      
      // And: Publishes post
      await executeCommand('microblog.publishPost', 'post-with-image.md');
      
      // Then: Post published with image reference
      expect(mockApiClient.publishPost).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('https://user.micro.blog/uploads/test.jpg')
        })
      );
    });
  });

  // ============================================================================
  // ERROR SCENARIOS & EDGE CASES
  // ============================================================================

  describe('Error Handling & Edge Cases', () => {
    test('handles authentication failures gracefully', async () => {
      // Given: Invalid credentials
      mockApiError('/account/verify', 401);
      
      // When: Extension attempts to configure
      await executeCommand('microblog.configure');
      await inputAppToken('invalid-token');
      
      // Then: Authentication error handled
      expect(showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('authentication failed')
      );
    });

    test('handles workspace not opened scenario', async () => {
      // Given: No workspace folder opened
      await setupNoWorkspace();
      
      // When: User attempts to create new post
      await executeCommand('microblog.newPost');
      
      // Then: Workspace required message shown
      expect(showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('workspace folder required')
      );
    });

    test('handles API rate limiting gracefully', async () => {
      // Given: API returns rate limit error
      mockApiError('/micropub', 429, { 'Retry-After': '60' });
      
      // When: User publishes post
      await executeCommand('microblog.publishPost', 'test-post.md');
      
      // Then: Rate limit handled with retry suggestion
      expect(showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('rate limited')
      );
      expect(showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('try again in 60 seconds')
      );
    });
  });
});

// ============================================================================
// TEST UTILITIES AND HELPERS
// ============================================================================

// Helper functions for test setup and assertions
async function getActiveEditor() {
  // Implementation depends on VS Code test environment
}

async function fileExists(path: string): Promise<boolean> {
  // Implementation for checking file existence
}

async function readFile(path: string): Promise<string> {
  // Implementation for reading file content
}

async function inputPostTitle(title: string): Promise<void> {
  // Implementation for simulating user input
}

async function editPostContent(content: string): Promise<void> {
  // Implementation for editing post content
}

async function addFileToContent(filename: string): Promise<void> {
  // Implementation for adding files to content folder
}

async function getUploadItems(): Promise<string[]> {
  // Implementation for getting upload tree items
}

async function rightClickUploadItem(filename: string): Promise<string[]> {
  // Implementation for right-click context menu
}

async function selectContextMenuItem(menuItem: string): Promise<void> {
  // Implementation for selecting context menu item
}

async function getClipboardText(): Promise<string> {
  // Implementation for getting clipboard content
}

async function getUploadsSectionState(): Promise<string> {
  // Implementation for getting uploads section state
}

async function hasRetryOption(): Promise<boolean> {
  // Implementation for checking retry option availability
}

async function clickRetryUploads(): Promise<void> {
  // Implementation for clicking retry button
}

async function getPageItems(): Promise<string[]> {
  // Implementation for getting page tree items
}

async function rightClickPageItem(pageName: string): Promise<string[]> {
  // Implementation for page right-click context menu
}

async function setupNoWorkspace(): Promise<void> {
  // Implementation for no workspace scenario
}

// Mock objects and API responses
const mockApiClient = {
  publishPost: jest.fn(),
  getConfig: jest.fn(),
  uploadMedia: jest.fn(),
  fetchUploadedMedia: jest.fn()
};

const showSuccessMessage = jest.fn();
const showErrorMessage = jest.fn();
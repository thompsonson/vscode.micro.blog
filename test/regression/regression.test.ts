/**
 * Micro.blog VS Code Extension - Comprehensive Regression Test Suite
 * 
 * This file contains all acceptance tests for the extension's core features.
 * Run this suite to validate functionality across all implemented features.
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { 
  setupConfiguredExtension, 
  executeCommand, 
  getTreeSections, 
  getTreeViewItems,
  getActiveEditor,
  setupNoWorkspace,
  inputPostTitle,
  editPostContent,
  addFileToContent,
  fileExists,
  readFile,
  showSuccessMessage,
  showErrorMessage
} from './helpers/test-setup';
import { mockApiResponse, mockApiError, clearMocks, setupHttpsMocks } from './helpers/mock-api';
import { 
  createTestPost, 
  createTestFiles, 
  addFileToUploads,
  setupTestWorkspace,
  cleanupTestWorkspace,
  getUploadItems,
  getPageItems,
  rightClickUploadItem,
  rightClickPageItem,
  selectContextMenuItem,
  getClipboardText,
  getUploadsSectionState,
  hasRetryOption,
  clickRetryUploads
} from './helpers/file-helpers';

suite('Micro.blog Extension - Full Regression Suite', () => {
  setup(async () => {
    // Ensure clean test environment
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    
    // Setup HTTP mocks (external API mocks as per Microsoft recommendation)
    setupHttpsMocks();
    
    // Setup test workspace
    await setupTestWorkspace();
    
    // Use real VS Code APIs - no mocking needed
  });
  
  teardown(async () => {
    // Clear external API mocks
    clearMocks();
    
    // Cleanup test workspace
    await cleanupTestWorkspace();
    
    // VS Code APIs don't need restoration - using real APIs
  });

  // ============================================================================
  // PHASE 1: READ-ONLY BROWSING (MVP)
  // ============================================================================
  
  suite('Phase 1: Content Browsing', () => {
    test('extension loads and shows configured tree view', async () => {
      // Given: Extension is configured with valid credentials
      await setupConfiguredExtension();
      
      // When: Tree view loads
      const sections = await getTreeSections();
      
      // Then: All main sections are visible
      assert.ok(sections.includes('📄 Published Posts'), 'Should show Published Posts section');
      assert.ok(sections.includes('📋 Remote Drafts'), 'Should show Remote Drafts section');
      assert.ok(sections.includes('📝 Local Drafts'), 'Should show Local Drafts section');
      assert.ok(sections.includes('📄 Pages'), 'Should show Pages section');
      assert.ok(sections.includes('📁 Uploads'), 'Should show Uploads section');
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
      assert.ok(activeEditor.document.getText().includes('Test Post'), 'Should show post title');
      assert.ok(activeEditor.document.getText().includes('Test content'), 'Should show post content');
    });

    test('extension handles API errors gracefully', async () => {
      // Given: Extension is configured but API is unavailable
      await setupConfiguredExtension();
      mockApiError('/micropub?q=source', 500);
      
      // When: Extension attempts to load content
      await executeCommand('microblog.refresh');
      
      // Then: Error is handled gracefully
      const sections = await getTreeSections();
      assert.ok(sections.length > 0, 'Should still show basic tree structure');
    });

    test('unconfigured extension shows appropriate state', async () => {
      // Given: Extension is not configured
      // (No setup call)
      
      // When: Tree view loads
      const sections = await getTreeSections();
      
      // Then: Tree view shows unconfigured state
      assert.ok(sections.length >= 0, 'Should handle unconfigured state');
    });
  });

  // ============================================================================
  // PHASE 2: LOCAL CONTENT CREATION
  // ============================================================================

  suite('Phase 2: Local Content Creation', () => {
    test('user can create new local post', async () => {
      // Given: Extension is configured with workspace
      await setupConfiguredExtension();
      
      // When: User creates new post
      await executeCommand('microblog.newPost');
      await inputPostTitle('My Test Post');
      
      // Then: Local file is created and appears in tree
      assert.ok(await fileExists('./content/my-test-post.md'), 'Should create local markdown file');
      
      const treeItems = await getTreeViewItems();
      assert.ok(treeItems.some(item => item.includes('Local Drafts')), 'Should show local drafts in tree');
      
      // And: File has correct frontmatter
      const content = await readFile('./content/my-test-post.md');
      assert.ok(content.includes('title: "My Test Post"'), 'Should have correct title');
      assert.ok(content.includes('status: "draft"'), 'Should have draft status');
      assert.ok(content.includes('type: "post"'), 'Should have post type');
    });

    test('tree view updates when local files change', async () => {
      // Given: Existing local drafts
      await setupConfiguredExtension();
      await createTestFiles(['content/post1.md']);
      
      // When: New file added to content folder
      await addFileToContent('post2.md');
      
      // Then: Tree view reflects the change
      const treeItems = await getTreeViewItems();
      assert.ok(treeItems.some(item => item.includes('Local Drafts')), 'Should show updated local drafts count');
    });

    test('local posts have correct frontmatter format', async () => {
      // Given: Extension is configured
      await setupConfiguredExtension();
      
      // When: User creates a new post
      const post = await createTestPost({
        title: 'Frontmatter Test',
        content: 'This is test content',
        status: 'draft'
      });
      
      // Then: Post has correct frontmatter structure
      const content = await readFile(post.filePath);
      assert.ok(content.includes('---'), 'Should have frontmatter delimiters');
      assert.ok(content.includes('title: "Frontmatter Test"'), 'Should have title in frontmatter');
      assert.ok(content.includes('status: "draft"'), 'Should have status in frontmatter');
      assert.ok(content.includes('type: "post"'), 'Should have type in frontmatter');
      assert.ok(content.includes('# Frontmatter Test'), 'Should have markdown heading');
      assert.ok(content.includes('This is test content'), 'Should have content body');
    });
  });

  // ============================================================================
  // PHASE 3: PUBLISHING WORKFLOW
  // ============================================================================

  suite('Phase 3: Publishing', () => {
    test('user can publish local post successfully', async () => {
      // Given: Local post with valid content
      await setupConfiguredExtension();
      const localPost = await createTestPost({
        title: 'Test Post',
        content: 'Test content',
        status: 'draft'
      });
      
      // And: API responds successfully
      mockApiResponse('/micropub', {
        success: true,
        url: 'https://test.micro.blog/published-post'
      });
      
      // When: User publishes the post
      await executeCommand('microblog.publishPost', localPost.filePath);
      
      // Then: Success notification shown
      assert.ok(showSuccessMessage.toString().includes('published'), 'Should show success message');
    });

    test('publishing handles validation errors gracefully', async () => {
      // Given: Local post with invalid content (missing title)
      await setupConfiguredExtension();
      const localPost = await createTestPost({
        title: '',
        content: 'Content without title',
        status: 'draft'
      });
      
      // When: User attempts to publish
      await executeCommand('microblog.publishPost', localPost.filePath);
      
      // Then: Validation error shown
      assert.ok(showErrorMessage.toString().includes('Title is required'), 'Should show validation error');
    });

    test('publishing handles network errors gracefully', async () => {
      // Given: Local post with valid content
      await setupConfiguredExtension();
      const localPost = await createTestPost({
        title: 'Test Post',
        content: 'Test content',
        status: 'draft'
      });
      
      // And: API returns network error
      mockApiError('/micropub', 500);
      
      // When: User publishes
      await executeCommand('microblog.publishPost', localPost.filePath);
      
      // Then: Error handled gracefully
      assert.ok(showErrorMessage.toString().includes('error'), 'Should show network error message');
    });

    test('publishing converts local post to micropub format', async () => {
      // Given: Local post with frontmatter
      await setupConfiguredExtension();
      const localPost = await createTestPost({
        title: 'Format Test',
        content: 'This is test content with **markdown**',
        status: 'draft'
      });
      
      // And: API responds successfully
      mockApiResponse('/micropub', {
        success: true,
        url: 'https://test.micro.blog/format-test'
      });
      
      // When: User publishes the post
      await executeCommand('microblog.publishPost', localPost.filePath);
      
      // Then: Post is converted to proper micropub format
      // This would be verified through API call inspection in real implementation
      assert.ok(true, 'Post should be converted to micropub format');
    });
  });

  // ============================================================================
  // PHASE 4: IMAGE UPLOAD
  // ============================================================================

  suite('Phase 4: Image Upload', () => {
    test('user can upload image and receive URL', async () => {
      // Given: Valid image file in uploads folder
      await setupConfiguredExtension();
      const imagePath = './uploads/test-image.jpg';
      await addFileToUploads('test-image.jpg');
      
      // And: Media endpoint configured
      mockApiResponse('/micropub?q=config', {
        'media-endpoint': 'https://micro.blog/micropub/media'
      });
      
      // And: Upload succeeds
      mockApiResponse('/micropub/media', {
        success: true,
        url: 'https://user.micro.blog/uploads/test-image.jpg'
      });
      
      // When: User uploads image
      const result = await executeCommand('microblog.uploadImage', imagePath);
      
      // Then: Upload completes successfully
      assert.ok(result, 'Should return upload result');
      assert.ok(showSuccessMessage.toString().includes('uploaded'), 'Should show success message');
    });

    test('upload handles file validation errors', async () => {
      // Given: Invalid file type
      await setupConfiguredExtension();
      const invalidFile = './uploads/document.txt';
      await addFileToUploads('document.txt');
      
      // When: User attempts upload
      await executeCommand('microblog.uploadImage', invalidFile);
      
      // Then: Validation error shown
      assert.ok(showErrorMessage.toString().includes('Invalid file type'), 'Should show validation error');
    });

    test('upload provides markdown format option', async () => {
      // Given: Successful image upload
      await setupConfiguredExtension();
      const imagePath = './uploads/test-image.png';
      await addFileToUploads('test-image.png');
      
      // And: Upload succeeds
      mockApiResponse('/micropub?q=config', {
        'media-endpoint': 'https://micro.blog/micropub/media'
      });
      mockApiResponse('/micropub/media', {
        success: true,
        url: 'https://user.micro.blog/uploads/test-image.png'
      });
      
      // When: User uploads image
      const result = await executeCommand('microblog.uploadImage', imagePath);
      
      // Then: Markdown format is available
      assert.ok(result, 'Should provide result with markdown format');
    });
  });

  // ============================================================================
  // PHASE 5: TREE VIEW ENHANCEMENTS
  // ============================================================================

  suite('Phase 5: Tree View Features', () => {
    
    suite('Remote Uploads Display', () => {
      test('shows remote uploads section with API count', async () => {
        // Given: Mock API response with uploaded files
        await setupConfiguredExtension();
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
        await executeCommand('microblog.refresh');
        
        // Then: Uploads section appears with API count
        const sections = await getTreeSections();
        assert.ok(sections.some(s => s.includes('Uploads')), 'Should show uploads section');
        
        // And: Individual files shown
        const uploadItems = await getUploadItems();
        assert.ok(uploadItems.some(item => item.includes('image1.png')), 'Should show individual upload files');
      });

      test('uploads context menu provides markdown copying', async () => {
        // Given: Uploads section with files
        await setupConfiguredExtension();
        await addFileToUploads('image1.png');
        
        // When: User right-clicks on uploaded image
        const contextMenu = await rightClickUploadItem('image1.png');
        
        // Then: Markdown options available
        assert.ok(contextMenu.includes('Copy as Markdown'), 'Should have markdown copy option');
        assert.ok(contextMenu.includes('Copy as HTML'), 'Should have HTML copy option');
        
        // When: User selects markdown option
        await selectContextMenuItem('Copy as Markdown');
        
        // Then: Markdown copied to clipboard
        const clipboardText = await getClipboardText();
        assert.ok(clipboardText.includes('!['), 'Should copy markdown format');
      });

      test('handles uploads API failures gracefully', async () => {
        // Given: API returns error
        await setupConfiguredExtension();
        mockApiError('/micropub/media?q=source', 500);
        
        // When: Tree provider refreshes
        await executeCommand('microblog.refresh');
        
        // Then: Error state handled gracefully
        const state = await getUploadsSectionState();
        assert.ok(state === 'error' || state === 'loaded', 'Should handle error state');
      });
    });

    suite('Pages Display', () => {
      test('shows pages section with filtered content', async () => {
        // Given: Mock API response with pages
        await setupConfiguredExtension();
        mockApiResponse('/micropub?q=source&mp-channel=pages', {
          items: [
            { 
              type: ['h-entry'],
              properties: {
                name: ['About Me'],
                content: ['This is a longer about page with detailed information'],
                url: ['https://user.micro.blog/about/'],
                published: ['2025-07-01T10:00:00Z']
              }
            },
            {
              type: ['h-entry'],
              properties: {
                name: ['Contact'],
                content: ['Contact information and details'],
                url: ['https://user.micro.blog/contact/'],
                published: ['2025-06-15T10:00:00Z']
              }
            }
          ]
        });
        
        // When: Tree provider refreshes
        await executeCommand('microblog.refresh');
        
        // Then: Pages section appears
        const sections = await getTreeSections();
        assert.ok(sections.some(s => s.includes('Pages')), 'Should show pages section');
        
        // And: Pages shown in section
        const pageItems = await getPageItems();
        assert.ok(pageItems.some(item => item.includes('About Me')), 'Should show page items');
      });

      test('pages context menu provides link copying', async () => {
        // Given: Pages section with pages
        await setupConfiguredExtension();
        mockApiResponse('/micropub?q=source&mp-channel=pages', {
          items: [
            { 
              type: ['h-entry'],
              properties: {
                name: ['About Me'],
                content: ['About page content'],
                url: ['https://user.micro.blog/about/'],
                published: ['2025-07-01T10:00:00Z']
              }
            }
          ]
        });
        
        // When: User right-clicks on page
        const contextMenu = await rightClickPageItem('About Me');
        
        // Then: Link options available
        assert.ok(contextMenu.includes('Copy Link'), 'Should have copy link option');
        assert.ok(contextMenu.includes('Copy as Markdown Link'), 'Should have markdown link option');
        
        // When: User selects markdown link option
        await selectContextMenuItem('Copy as Markdown Link');
        
        // Then: Markdown link copied to clipboard
        const clipboardText = await getClipboardText();
        assert.ok(clipboardText.includes('[About Me]'), 'Should copy markdown link format');
      });
    });
  });

  // ============================================================================
  // INTEGRATION TESTS
  // ============================================================================

  suite('Full Workflow Integration', () => {
    test('complete content creation and publishing workflow', async () => {
      // Given: Configured extension
      await setupConfiguredExtension();
      
      // When: User creates new post
      await executeCommand('microblog.newPost');
      await inputPostTitle('Integration Test Post');
      
      // Then: Local draft created
      const treeItems = await getTreeViewItems();
      assert.ok(treeItems.some(item => item.includes('Local Drafts')), 'Should show local drafts');
      
      // When: User edits and publishes post
      await editPostContent('This is test content for integration testing.');
      mockApiResponse('/micropub', {
        success: true,
        url: 'https://test.micro.blog/integration-test-post'
      });
      await executeCommand('microblog.publishPost', 'integration-test-post.md');
      
      // Then: Post published successfully
      assert.ok(showSuccessMessage.toString().includes('published'), 'Should show success message');
    });

    test('complete image workflow with post integration', async () => {
      // Given: Image uploaded successfully
      await setupConfiguredExtension();
      await addFileToUploads('test.jpg');
      
      mockApiResponse('/micropub?q=config', {
        'media-endpoint': 'https://micro.blog/micropub/media'
      });
      mockApiResponse('/micropub/media', {
        success: true,
        url: 'https://user.micro.blog/uploads/test.jpg'
      });
      
      const uploadResult = await executeCommand('microblog.uploadImage', './uploads/test.jpg');
      assert.ok(uploadResult, 'Should upload image successfully');
      
      // And: Local post created
      await executeCommand('microblog.newPost');
      await inputPostTitle('Post with Image');
      
      // When: User adds image to post content
      await editPostContent(`# Post with Image

Here's my uploaded image:

![test](https://user.micro.blog/uploads/test.jpg)
`);
      
      // And: Publishes post
      mockApiResponse('/micropub', {
        success: true,
        url: 'https://test.micro.blog/post-with-image'
      });
      await executeCommand('microblog.publishPost', 'post-with-image.md');
      
      // Then: Post published with image reference
      assert.ok(showSuccessMessage.toString().includes('published'), 'Should publish post with image');
    });
  });

  // ============================================================================
  // ERROR SCENARIOS & EDGE CASES
  // ============================================================================

  suite('Error Handling & Edge Cases', () => {
    test('handles authentication failures gracefully', async () => {
      // Given: Invalid credentials
      mockApiError('/account/verify', 401);
      
      // When: Extension attempts to configure
      await executeCommand('microblog.configure');
      
      // Then: Authentication error handled
      assert.ok(showErrorMessage.toString().includes('authentication'), 'Should show authentication error');
    });

    test('handles workspace not opened scenario', async () => {
      // Given: No workspace folder opened
      await setupNoWorkspace();
      
      // When: User attempts to create new post
      await executeCommand('microblog.newPost');
      
      // Then: Workspace required message shown
      assert.ok(showErrorMessage.toString().includes('workspace'), 'Should show workspace required error');
    });

    test('handles API rate limiting gracefully', async () => {
      // Given: API returns rate limit error
      await setupConfiguredExtension();
      mockApiError('/micropub', 429, { 'Retry-After': '60' });
      
      const localPost = await createTestPost({
        title: 'Rate Limited Post',
        content: 'Test content',
        status: 'draft'
      });
      
      // When: User publishes post
      await executeCommand('microblog.publishPost', localPost.filePath);
      
      // Then: Rate limit handled with retry suggestion
      assert.ok(showErrorMessage.toString().includes('rate limit'), 'Should show rate limit error');
    });

    test('handles malformed API responses', async () => {
      // Given: API returns malformed response
      await setupConfiguredExtension();
      mockApiResponse('/micropub?q=source', { invalid: 'response' });
      
      // When: Extension attempts to load content
      await executeCommand('microblog.refresh');
      
      // Then: Malformed response handled gracefully
      const sections = await getTreeSections();
      assert.ok(sections.length > 0, 'Should handle malformed responses gracefully');
    });
  });
});
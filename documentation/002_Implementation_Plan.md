# Phase 2 Implementation Plan: Content Creation & Draft Editing

> **📋 Detailed ATDD Implementation Guide**  
> Created: 2025-07-10  
> Updated: 2025-07-11  
> Status: Week 1 COMPLETED ✅ | Week 2 Ready 🚀  
> Follows: Development protocols established in CLAUDE.md

## **🎉 Progress Update (July 11, 2025)**

### **✅ Week 1 COMPLETED: Local Content Foundation**
All planned Week 1 goals have been successfully implemented and tested:
- **New Post Command**: Fully functional with progress indicators and error handling
- **LocalPost Domain Entity**: Complete with frontmatter, markdown serialization, and unit tests
- **FileManager Service**: Workspace structure creation, file operations, error handling
- **Enhanced Tree View**: Shows local drafts alongside remote content with proper icons
- **File Watching**: Real-time tree updates when local content changes
- **Quality Assurance**: All 22 tests passing, clean compilation, linting compliance
- **Development Tools**: Justfile created for streamlined workflow

### **🚀 Next: Week 2 Goals (Draft Editing Workflow)**
Ready to begin implementation of:
- Download remote drafts for local editing
- Sync status tracking and conflict detection
- Enhanced tree view with sync status indicators

## 🎯 **ATDD Implementation Strategy**

Following our established development protocols:
- **User scenarios FIRST** → **Acceptance tests** → **Minimal implementation**
- **Quality gates** before/after every change (`npm run compile && npm test && npm run lint`)
- **Incremental development** with continuous validation
- **Documentation updates** after feature completion

## 🚀 **Week 1: Local Content Foundation (Goal 1)**

### **User Scenario 1: New Post Creation**
```gherkin
Feature: Create New Blog Post
  Scenario: User creates their first local post
    Given the user has configured their micro.blog account
    When they click "New Post" in the tree view toolbar
    And they enter title "My First Local Post"
    Then a local markdown file is created in ./content/
    And the tree view shows "📝 Local Drafts (1)"
    And the file opens in VS Code editor
    And the file contains proper frontmatter with title, status, type
```

### **Acceptance Test (Write First):**
```typescript
describe('New Post Creation Workflow', () => {
  test('user can create new post and see it in tree view', async () => {
    // Given: Extension is configured
    await setupConfiguredExtension();
    
    // When: User executes New Post command
    await executeCommand('microblog.newPost');
    await inputPostTitle('My First Local Post');
    
    // Then: Local file is created
    expect(await fileExists('./content/my-first-local-post.md')).toBe(true);
    
    // And: Tree view is updated
    expect(await getTreeViewItems()).toContain('📝 Local Drafts (1)');
    
    // And: File has correct frontmatter
    const content = await readFile('./content/my-first-local-post.md');
    expect(content).toContain('title: "My First Local Post"');
    expect(content).toContain('status: "draft"');
    expect(content).toContain('type: "post"');
  });
});
```

### **Implementation Tasks (Week 1):**

#### **Day 1-2: New Post Command & File Structure**
**Files to create:**
- `src/services/FileManager.ts` - Workspace and file operations
- `src/domain/LocalPost.ts` - Local post entity with frontmatter
- Package.json updates for new command

**Implementation:**
1. Add `microblog.newPost` command registration
2. Create FileManager service for workspace operations  
3. Implement workspace detection and `.microblog/` folder creation
4. Generate markdown template with frontmatter
5. Basic error handling for file operations

#### **Day 3-4: Tree View Integration**
**Files to modify:**
- `src/providers/TreeProvider.ts` - Add local content sections

**Implementation:**
1. Extend TreeProvider to show "Local Drafts" section
2. Add file watcher for local content changes (`vscode.workspace.createFileSystemWatcher`)
3. Update tree view when local files are added/modified
4. Add appropriate icons for local vs remote content

#### **Day 5: Frontmatter & File Utilities**
**Files to create:**
- `src/utils/FrontmatterParser.ts` - YAML frontmatter handling
- `src/utils/SlugGenerator.ts` - File naming utilities

**Implementation:**
1. Frontmatter parsing and generation utilities
2. File naming conventions (title → slug conversion)
3. Template generation for new posts
4. Validation utilities for required fields

## 🔄 **Week 2: Draft Editing Workflow (Goal 2)**

### **User Scenario 2: Edit Existing Draft**
```gherkin
Feature: Edit Remote Draft Locally
  Scenario: User downloads and edits a remote draft
    Given the user has a draft on micro.blog
    And the draft is visible in tree view under "Remote Drafts"
    When they right-click the draft
    And select "Edit Draft Locally"
    Then the draft content is downloaded to ./content/
    And the file opens in VS Code editor
    And tree view shows the draft under "Local Drafts"
    And sync status shows as "Synced" initially
    When they edit the file content
    Then sync status updates to "Modified"
```

### **Acceptance Test (Write First):**
```typescript
describe('Draft Editing Workflow', () => {
  test('user can download remote draft and edit locally', async () => {
    // Given: Remote draft exists
    await setupRemoteDraft({ title: 'My Draft', content: 'Original content' });
    
    // When: User downloads for editing
    await rightClickTreeItem('My Draft');
    await selectContextMenu('Edit Draft Locally');
    
    // Then: Local file is created
    expect(await fileExists('./content/my-draft.md')).toBe(true);
    
    // And: File opens in editor
    expect(await getActiveEditor().document.fileName).toMatch('my-draft.md');
    
    // And: Tree view shows under Local Drafts
    expect(await getTreeViewItems()).toContain('📝 Local Drafts (1)');
    
    // When: User edits content
    await editFileContent('Updated content');
    
    // Then: Sync status shows modified
    expect(await getTreeItemIcon('my-draft.md')).toBe('🔵'); // Modified status
  });
});
```

### **Implementation Tasks (Week 2):**

#### **Day 1-2: Download Draft Workflow**
**Files to create:**
- `src/services/SyncManager.ts` - Sync status tracking
- `src/domain/SyncStatus.ts` - Status enumeration

**Implementation:**
1. Add "Edit Draft Locally" context menu to remote drafts
2. Implement draft download with content conversion
3. Convert remote API format to local markdown with frontmatter
4. Track post ID for future sync operations

#### **Day 3-4: Sync Status Tracking**
**Files to modify:**
- `src/providers/TreeProvider.ts` - Add sync status icons
- `src/services/SyncManager.ts` - Status calculation logic

**Implementation:**
1. Implement sync status enumeration (Local, Remote, Modified, Synced)
2. File watcher integration for detecting local changes
3. Update tree view icons based on sync status
4. Metadata tracking for last sync timestamps

#### **Day 5: Conflict Detection Foundation**
**Implementation:**
1. Compare local vs remote timestamps
2. Simple conflict warning dialog
3. Backup mechanism for local changes before overwrite
4. Basic "download fresh copy" workflow

## 📤 **Week 3: Publishing & Polish (Goal 3)**

### **User Scenario 3: Publish Local Content**
```gherkin
Feature: Publish Local Post
  Scenario: User publishes a local draft
    Given the user has a local draft with valid content
    When they right-click the draft in tree view
    And select "Publish"
    Then the content is validated for required fields
    And the content is sent to micro.blog via Micropub API
    And the post appears as "Published" in tree view
    And the local file is updated with remote post ID
    And sync status shows as "Synced"
```

### **Acceptance Test (Write First):**
```typescript
describe('Publishing Workflow', () => {
  test('user can publish local draft successfully', async () => {
    // Given: Local draft exists with valid content
    await createLocalDraft({
      title: 'My New Post',
      content: 'This is my content',
      status: 'draft'
    });
    
    // When: User publishes
    await rightClickTreeItem('my-new-post.md');
    await selectContextMenu('Publish');
    
    // Then: Content is sent to API
    expect(mockApiCalls.POST).toHaveBeenCalledWith('/micropub', 
      expect.objectContaining({
        type: ['h-entry'],
        properties: expect.objectContaining({
          name: ['My New Post'],
          content: ['This is my content']
        })
      })
    );
    
    // And: Tree view updates
    expect(await getTreeViewItems()).toContain('📄 Published Posts');
    
    // And: Sync status is updated
    expect(await getTreeItemIcon('my-new-post.md')).toBe('🟢'); // Synced
  });
});
```

### **Implementation Tasks (Week 3):**

#### **Day 1-2: Publishing Service**
**Files to create:**
- `src/services/PublishingService.ts` - Micropub publishing operations

**Files to modify:**
- `src/services/ApiClient.ts` - Add POST/PUT methods

**Implementation:**
1. Extend ApiClient with Micropub POST/PUT methods
2. Implement markdown + frontmatter → Micropub format conversion
3. Content validation before publishing (required fields, format)
4. Error handling for publish failures

#### **Day 3-4: Publish Workflow Integration**
**Files to modify:**
- `src/providers/TreeProvider.ts` - Add publish context menus
- `src/extension.ts` - Register publish commands

**Implementation:**
1. Add "Publish" context menu to local drafts
2. Progress indicators for publish operations
3. Update sync status after successful publish
4. Move published items to appropriate tree sections

#### **Day 5: Error Handling & Polish**
**Implementation:**
1. Network error recovery and retry logic
2. Validation error messages with specific guidance
3. Progress notifications for long operations
4. Comprehensive error logging for debugging

## 🏗️ **Technical Architecture Additions**

### **New Services:**
```typescript
// File operations and workspace management
src/services/FileManager.ts
interface FileManager {
  createWorkspaceStructure(): Promise<void>;
  createNewPost(title: string): Promise<string>;
  savePostContent(fileName: string, content: string): Promise<void>;
  watchLocalChanges(): vscode.FileSystemWatcher;
}

// Sync status tracking and conflict detection  
src/services/SyncManager.ts
interface SyncManager {
  getPostStatus(fileName: string): SyncStatus;
  markAsModified(fileName: string): void;
  markAsSynced(fileName: string, remoteId: string): void;
  checkForConflicts(fileName: string): Promise<ConflictInfo>;
}

// Publishing operations (extends ApiClient)
src/services/PublishingService.ts
interface PublishingService {
  publishPost(localPost: LocalPost): Promise<string>;
  updateDraft(localPost: LocalPost): Promise<void>;
  validateContent(localPost: LocalPost): ValidationResult;
}
```

### **New Domain Objects:**
```typescript
// Local file with sync metadata
src/domain/LocalPost.ts
class LocalPost {
  title: string;
  content: string;
  status: 'draft' | 'published';
  postId?: string;
  lastSync?: Date;
  filePath: string;
}

// Sync status enumeration
src/domain/SyncStatus.ts
enum SyncStatus {
  Local = 'local',     // Only exists locally
  Remote = 'remote',   // Only exists remotely  
  Modified = 'modified', // Local changes since last sync
  Synced = 'synced'    // In sync with remote
}
```

### **Enhanced Providers:**
```typescript
// Extended to show Local/Remote sections with sync status
src/providers/TreeProvider.ts
- Add "📝 Local Drafts" section
- Add sync status icons (🟡 Local, 🔵 Modified, 🟢 Synced)  
- Context menus for publish/edit operations
- File watcher integration for real-time updates

// Support for local file editing and frontmatter
src/providers/ContentProvider.ts  
- Handle local file URIs
- Preserve frontmatter during editing
- Integration with sync status updates
```

## 🧪 **Testing Strategy (ATDD Focus)**

### **Primary: Acceptance Tests**
**Complete user workflows:**
- New post creation → file generation → tree view update
- Remote draft download → local editing → sync status tracking
- Local draft publishing → API integration → status updates
- Error scenarios → recovery workflows → user feedback

### **Supporting: Unit Tests**
**Implementation details:**
- FileManager file operations and workspace management
- SyncManager status calculations and conflict detection
- PublishingService content conversion and API integration
- Frontmatter parsing and validation utilities

### **Test Data & Mocking:**
- Mock workspace with temporary directories
- Mock Micropub API responses for publish operations
- Sample markdown files with various frontmatter configurations
- File system watcher simulation for testing

## 📋 **Quality Gate Compliance**

**MANDATORY for every change:**
1. **Before changes**: `npm run compile && npm test && npm run lint`
2. **Make incremental change** (one concept at a time)  
3. **After changes**: Re-run all quality gates
4. **Fix failures immediately** before proceeding
5. **Update documentation** when features complete

**Failure Recovery Protocol:**
- STOP development when any command fails
- Identify and fix specific issue
- Re-run full test suite
- Only continue when everything passes

## 🎯 **Success Criteria & Metrics**

### **Week 1 Success**: Local Content Foundation ✅ **ACHIEVED**
- ✅ Users can create new posts with "New Post" command
- ✅ Local files appear in tree view under "Local Drafts"
- ✅ Files have proper frontmatter structure
- ✅ File operations complete in <1 second

### **Week 2 Success**: Draft Editing Workflow  
- ✅ Users can download remote drafts for local editing
- ✅ Sync status accurately reflects file states
- ✅ Basic conflict detection warns users of issues
- ✅ Edit workflow feels natural (like local files)

### **Week 3 Success**: Publishing Capability
- ✅ Users can publish local drafts to micro.blog
- ✅ Publish success rate >95% for valid content
- ✅ Error handling provides clear guidance
- ✅ Published posts appear correctly in tree view

### **Overall Success**: Complete Workflow
- ✅ Create → Edit → Publish workflow works end-to-end
- ✅ No data loss during any operation
- ✅ Clear feedback for all user actions
- ✅ Extension remains responsive and reliable

## 📊 **Risk Mitigation Strategies**

### **File System Complexity**
- **Start simple**: Basic file operations first, add robustness incrementally
- **Use VS Code APIs**: Leverage `vscode.workspace.fs` for cross-platform compatibility
- **Test thoroughly**: Comprehensive file operation testing with temp directories
- **Error handling**: Clear error messages and recovery options

### **Sync State Management**
- **Clear enumeration**: Well-defined sync status states and transitions
- **Single source of truth**: SyncManager owns all status decisions
- **Consistent updates**: File watcher ensures real-time status accuracy
- **Simple conflicts**: Avoid complex merge logic, focus on user choice

### **API Integration Complexity**
- **Build on MVP foundation**: Extend proven ApiClient rather than rewrite
- **Content validation**: Check content before API calls to prevent failures
- **Progressive enhancement**: Basic publishing first, advanced features later
- **Comprehensive testing**: Mock API responses for all scenarios

### **Testing Strategy Risks**
- **File system mocking**: Use temporary directories and proper cleanup
- **Async operations**: Careful handling of file watchers and API calls
- **Integration complexity**: Focus on user workflows, support with unit tests
- **Cross-platform testing**: Test file operations on multiple platforms

## 🚀 **Getting Started Instructions**

### **When Ready to Implement:**

1. **Quality Gate Check**: 
   ```bash
   npm run compile && npm test && npm run lint
   ```

2. **Start with Week 1, Day 1**: 
   - Write acceptance test for new post creation
   - Implement minimal FileManager service
   - Add command registration to package.json

3. **Follow ATDD Discipline**:
   - User scenario → Failing test → Minimal implementation
   - Test after every logical change
   - Fix failures immediately

4. **Update Documentation**:
   - Mark tasks as completed in this plan
   - Update 002_Edit.md with progress
   - Add any architectural discoveries to CLAUDE.md

This implementation plan provides complete guidance for Phase 2 development while maintaining the quality standards and development discipline established in Phase 1.
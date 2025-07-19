# Claude Code Instructions - Micro.blog VS Code Extension

## Project Overview

This is a VS Code extension for micro.blog integration built using **Domain Driven Design (DDD)** principles. Currently in **alpha development** with core features for content browsing, creation, and publishing.

### Current Features (v0.5.20250719 - Alpha)
- **Authentication & Configuration**: Simple token-based setup with auto-domain discovery
- **Content Browsing**: Read-only viewing of posts, drafts, and pages
- **Local Content Creation**: New Post command with workspace integration
- **Publishing**: Publish local drafts to micro.blog via Micropub API
- **Draft to Published Organization**: Automatic file movement from `drafts/` to `published/` after successful publish
- **Media Display**: View uploaded media files in tree view with click-to-view functionality
- **Upload Viewing**: Click uploads to view images, metadata, and text file previews in webview panels
- **Text Preview**: Preview content of text files (JSON, TXT, XML, etc.) with copy-to-clipboard functionality
- **Enhanced Tree View**: Shows local drafts, published posts (local), pages, posts, and remote uploads
- **File Management**: Automatic workspace structure with `content/drafts/` and `content/published/` folders
- **Migration Support**: Automatic migration of existing flat content structure to organized folders
- **Real-time Updates**: File watcher provides instant tree view updates
- **Quality Maintained**: 114 passing tests with comprehensive coverage
- **Development Tools**: Justfile for streamlined development workflow
- **API Integration**: Full Micropub protocol support for posts, pages, and media

## Architecture (DDD within VS Code Structure)

```
src/
├── extension.ts              # VS Code entry point (composition root)
├── config/
│   └── constants.ts          # API endpoints, storage keys, timeouts
├── domain/                   # Core business logic (no dependencies)
│   ├── Blog.ts              # Blog entity with domain validation
│   ├── Post.ts              # Post entity with content parsing
│   ├── LocalPost.ts         # Local post entity with frontmatter ✅
│   ├── MediaAsset.ts        # Image file validation and metadata ✅
│   ├── UploadResult.ts      # Upload response with retry logic ✅
│   ├── UploadFile.ts        # Upload file entity with remote URL support & formatting ✅
│   └── Credentials.ts       # Authentication value object
├── services/                # Application services
│   ├── MicroblogService.ts  # Main orchestration (configure, fetch)
│   ├── ApiClient.ts         # Micropub HTTP client with media upload ✅
│   ├── MediaService.ts      # Image upload orchestration ✅
│   ├── PublishingService.ts # Local post publishing ✅
│   ├── UploadManager.ts     # Remote uploads API integration with caching & fallback ✅
│   ├── ContentViewerService.ts # Upload content viewing in webview panels ✅
│   └── FileManager.ts       # Workspace and file operations ✅
├── providers/               # VS Code integration ✅
│   ├── TreeProvider.ts      # Content tree view (local + remote uploads) ✅
│   └── ContentProvider.ts   # Read-only content viewer ✅
└── test/                    # Unit and integration tests
```

## Key Design Decisions

### 1. **Simplified Configuration Flow**
- **Removed domain input** - now auto-discovered from first post URL
- **Single dialog** for app token only
- **Better UX** - 50% fewer input dialogs

### 2. **Security-First Logging**
- **No token exposure** in console logs
- **No sensitive data** in debug output
- **Error vs info separation** for cleaner debugging

### 3. **Centralized Configuration**
- **Constants file** for all API endpoints and settings
- **Easy to modify** for testing or updates
- **Type-safe** configuration management

## Development Commands

```bash
# Development
npm run compile      # Build TypeScript
npm run watch        # Watch for changes and recompile
npm run lint         # ESLint validation
npm test            # Run all tests (unit + integration)

# VS Code Extension Development
F5                  # Debug extension in Extension Development Host
Cmd+Shift+P         # Command palette to test extension commands
```

## Feature Implementation Details

### **Authentication & Configuration**
- Secure token-based authentication using VS Code SecretStorage
- Auto-discovery of blog domain from first post URL
- Simple one-dialog setup process

### **Content Browsing & Viewing**
- Tree view showing Published Posts, Remote Drafts, and Pages
- Click-to-view functionality with formatted content in editor
- Real-time refresh capabilities

### **Local Content Creation**
- **LocalPost Domain Entity**: Full frontmatter support and markdown serialization
- **FileManager Service**: Workspace structure creation and file operations
- **Enhanced TreeProvider**: Shows local drafts alongside remote content
- **New Post Command**: Complete workflow for creating local posts
- **File Watching**: Real-time tree updates when content changes

### **Publishing**
- **PublishingService**: Complete orchestration of validation → conversion → API publishing
- **Context Menu Integration**: Right-click local posts → "Publish to Micro.blog"
- **Progress Indicators**: VS Code progress notifications during publishing
- **Micropub Protocol**: Full compliance with micro.blog's publishing API

### **Media Management**
- **Remote Uploads Display**: Integration with `/micropub/media?q=source` endpoint
- **UploadManager Service**: API calls with 5-minute caching for performance
- **Tree View Integration**: Shows "📁 Remote Uploads (count)" with metadata
- **Context Menus**: Copy as Markdown/HTML for remote upload URLs
- **Error Recovery**: Graceful fallback to local uploads on API failure


## API Integration Details

### Endpoints Used
- **Authentication**: `https://micro.blog/micropub?q=source`
- **Post Fetching**: Same endpoint (auto-discovers user content)
- **Publishing**: `https://micro.blog/micropub` for posting ✅
- **Media Upload**: `https://micro.blog/micropub/media` for image uploads ✅
- **Config Discovery**: `https://micro.blog/micropub?q=config` for media endpoint ✅

### Authentication Flow
1. User provides app token (from Account → Edit Apps → New Token)
2. Extension validates token by fetching user's posts
3. Auto-discovers blog domain from first post URL
4. Stores both token (SecretStorage) and domain (globalState)

## Testing Strategy

### Current Tests ✅ (104 passing)
- **Domain entities**: Blog, Post, Credentials, LocalPost, MediaAsset, UploadResult, and UploadFile validation
- **VS Code integration**: Extension activation and command registration
- **LocalPost functionality**: Creation, serialization, parsing, and slug generation
- **Tree Provider**: Content organization, sync status handling, and remote uploads display
- **Content Provider**: Post formatting and display
- **Media Upload**: File validation, API integration, retry logic, and VS Code integration
- **API Client**: Media endpoint discovery, multipart upload, remote uploads API, and error handling
- **Upload Manager**: Remote API integration, caching, and error recovery
- **Provider Integration**: Remote uploads tree display and loading states
- **Upload Management**: Folder scanning, file type detection, and format generation
- **Uploads Tree Display**: Tree view integration and context menu functionality

### Future Test Areas 📝
- **SyncManager**: Sync status tracking and conflict detection
- **FileManager**: Enhanced file operations and error scenarios
- **Draft Editing**: Download and local editing workflows

## File-Specific Notes

### `src/extension.ts`
- **Composition root** - wires all dependencies
- **Command registration** - configure, test commands
- **Logging** for activation flow debugging

### `src/services/MicroblogService.ts`
- **Main business logic** orchestration
- **Configuration flow** with domain auto-discovery
- **VS Code integration** (SecretStorage, globalState)

### `src/services/ApiClient.ts`
- **HTTP client** for Micropub API
- **Response parsing** from JSON to domain entities
- **Error handling** with clean logging

### `src/domain/` entities
- **Blog, Post, Credentials**: Original MVP entities
- **LocalPost**: New entity for local content with frontmatter support
- **Page**: New entity for micro.blog pages with proper API integration
- **Pure business logic** with no external dependencies
- **Self-validating** entities with business rules
- **Easily testable** in isolation

### `src/services/FileManager.ts`
- **Workspace operations** - Create `.microblog/`, `content/`, and `uploads/` folders
- **File operations** - Create, read, write local markdown files
- **File watching** - Monitor changes for tree view updates
- **Upload support** - Upload folder path management and directory creation
- **Error handling** - Workspace validation and permission checks

### `src/services/UploadManager.ts`
- **Upload folder scanning** - Flat scan of uploads directory (no nested folders)
- **File metadata extraction** - Size, type, and modification date detection
- **File type filtering** - Support for image and non-image file detection
- **VS Code integration** - Uses workspace.fs API for file system operations

### `src/domain/UploadFile.ts`
- **Pure business logic** - File metadata and display formatting
- **File type detection** - Image vs non-image file classification
- **Size formatting** - Human-readable file size display (B, KB, MB)
- **Format generation** - Markdown and HTML format output for images
- **Icon mapping** - VS Code ThemeIcon selection based on file type

### `src/domain/Page.ts`
- **Page entity** - Business logic for micro.blog pages
- **Validation** - Required title and content validation
- **Formatting** - Markdown link generation and relative URL extraction
- **Status management** - Published/draft status tracking
- **Date handling** - Publish date formatting and display

## Known Issues & Considerations

1. **Requires published posts** - Domain discovery needs at least one post
2. **Local editing only** - Publishing capabilities coming in Week 3
3. **Single blog support** - Multi-blog support planned for later phases
4. **Workspace required** - Local content creation requires an open folder

## Future Development Guidelines

1. **Maintain DDD principles** - Keep domain logic pure
2. **Security first** - Never log sensitive data
3. **Test business logic** - Focus on domain and service tests
4. **Follow VS Code patterns** - Use standard extension patterns
5. **Incremental development** - Add features progressively

## Debugging Tips

1. **Check Extension Development Host console** for our `[Micro.blog]` logs
2. **Use test command** to verify basic extension functionality
3. **Configuration issues** usually show in API client logs
4. **Path issues** - Ensure package.json main points to correct compiled file

## Dependencies

- **VS Code API** - Core extension functionality
- **Built-in Node.js** - HTTPS client, URL parsing
- **TypeScript** - Development language
- **ESLint** - Code quality
- **@vscode/test-cli** - Testing framework

## Implementation History

### **Initial Features (v0.1.0)**
- Full UI Integration with tree view and content viewer
- Secure authentication with micro.blog API
- Content browsing for posts and drafts
- Error handling and recovery flows

### **Local Content Support (v0.1.20250711)**
- LocalPost domain entity with frontmatter support
- FileManager service for workspace operations
- Enhanced tree view showing local drafts
- File watching for real-time updates
- New Post command for content creation

### **Publishing Capabilities (v0.2.20250711)**
- PublishingService for post publication workflow
- ApiClient enhanced with Micropub POST support
- Context menu integration for publishing
- Progress indicators and validation
- Comprehensive test coverage expansion

### **Media & Pages Display (v0.3.20250711)**
- Remote uploads display from API
- Pages section with dedicated API endpoint
- Enhanced tree view with all content types
- Caching for performance optimization
- Context menus for format copying

### **Upload Content Viewing (v0.4.20250719)**
- ContentViewerService for upload content display in webview panels
- Click-to-view functionality for all upload types
- Image viewer with metadata, actions, and error handling
- Text file preview with content streaming and size limits
- Support for TXT, JSON, XML, CSV, YAML file preview
- Copy-to-clipboard functionality for text content
- Panel reuse pattern for better UX

### **Draft to Published Organization (v0.5.20250719)**
- Automatic file movement from `content/drafts/` to `content/published/` after successful publish
- Enhanced LocalPost domain entity with `location: 'drafts' | 'published'` property
- FileManager enhanced with folder creation, file movement, and migration logic
- PublishingService integrated with file movement workflow
- TreeProvider shows separate "📝 Local Drafts" and "📄 Published Posts (Local)" sections
- Automatic migration of existing flat content structure to organized folders
- Conflict resolution with timestamp-based auto-renaming
- Progress notifications during file operations
- Graceful error handling (publish success but move failure shows warning)

### **Recent Fixes**
- Fixed tree view to always show uploads section even when empty
- Resolved API endpoint issues (personal domains → micro.blog endpoint)
- Improved error handling for API failures

## 🚀 **Planned Features**
Future development will include:
- Image upload functionality
- Draft synchronization between local and remote
- Multi-blog support
- Enhanced media management capabilities
- Search functionality
- Post templates

---

## 🛡️ **REGRESSION TEST PROTECTION** (CRITICAL - READ FIRST)

### **NEVER MODIFY REGRESSION TESTS WITHOUT EXPLICIT PERMISSION**

The regression test suite in `/test/regression/` is **PROTECTED** and should **NEVER** be modified during feature development.

#### **Regression Test Rules (Non-Negotiable)**

1. **READ-ONLY during feature development** - Never edit, add, or remove regression tests while implementing features
2. **SEPARATE WORKFLOW** - Regression tests are added AFTER features are completed successfully
3. **EXPLICIT PERMISSION REQUIRED** - Only modify regression tests when explicitly asked to add new test cases
4. **VALIDATION NOT DEVELOPMENT** - Regression tests validate completed functionality, they don't drive development

#### **When Regression Tests Can Be Modified**

- ✅ **User explicitly requests** adding new regression tests for completed features
- ✅ **User asks to fix** failing regression tests after feature changes
- ✅ **User requests** updating existing regression test cases
- ❌ **NEVER during feature development** - focus on unit tests only
- ❌ **NEVER proactively** - only when specifically asked

#### **Regression Test Workflow**

1. **Feature Development Phase**:
   - Implement feature using ATDD with acceptance tests in `/test/suite/`
   - Run `npm test` to ensure acceptance tests pass
   - Complete feature implementation
   - Get feature working and tested

2. **Regression Test Phase (Separate Task)**:
   - User explicitly requests adding regression tests
   - Add new test cases to `/test/regression/regression.test.ts`
   - Follow existing test patterns and structure
   - Ensure new tests validate the completed feature

### **Test Strategy**

This project uses a **two-tier testing approach**:

#### **`/test/suite/` - Acceptance Tests (Development)**
- **Purpose**: Drive feature development using ATDD
- **Scope**: Complete user workflows and business scenarios
- **Example**: "User creates post, edits content, publishes successfully"
- **When to use**: During feature development to validate user requirements
- **Dependencies**: Real VS Code APIs with external API mocking

#### **`/test/regression/` - Regression Tests (Validation)**
- **Purpose**: Validate that completed features still work after changes
- **Scope**: End-to-end user scenarios across all features
- **Example**: "Complete content creation and publishing workflow"
- **When to use**: After feature completion to prevent regressions
- **Dependencies**: Real VS Code APIs with external API mocking

#### **Unit Tests (Optional)**
- **Purpose**: Test individual components in isolation
- **Scope**: Single classes, functions, or methods
- **Example**: `LocalPost.validate()` returns correct errors
- **When to use**: For complex business logic that needs isolated testing
- **Location**: Can be added to `/test/suite/` if needed

#### **Protected Files**

- `/test/regression/regression.test.ts` - Main regression test suite
- `/test/regression/helpers/` - All regression test helper files
- `/test/regression/index.ts` - Regression test entry point
- `.vscode-test-regression.js` - Regression test configuration
- `documentation/008_regression_test_suite.md` - Regression test documentation

### **Summary**

**REGRESSION TESTS = PROTECTED. ASK BEFORE TOUCHING.**

---

## 🛡️ **DEVELOPMENT PROTOCOLS** (Mandatory)

### **Quality Gates (Non-Negotiable)**

#### **Before ANY code changes:**
1. Run `npm run compile` - ensure TypeScript compiles cleanly
2. Run `npm test` - ensure all acceptance tests pass (currently 114 tests)
3. Run `npm run lint` - ensure code style compliance
4. **ALL must pass before making any changes**
5. **NEVER modify regression tests** - focus on acceptance tests only during development

#### **After EVERY code change:**
1. Re-run all three commands immediately
2. Fix any failures before making additional changes  
3. Only proceed when all checks are green
4. **No exceptions - failing tests block all development**

### **Failure Recovery Protocol**

#### **When any command fails:**
1. **STOP all development immediately**
2. Analyze and identify the root cause
3. Fix the specific issue that caused the failure
4. Re-run the full test suite (`npm run compile && npm test && npm run lint`)
5. Only continue development when everything passes

#### **Never:**
- Make additional changes while tests are failing
- Batch multiple fixes together
- Skip quality gates "just this once"
- Commit failing code
- **Modify regression tests during feature development**

### **ATDD Workflow for New Features**

#### **For each user-facing feature (ACCEPTANCE TESTS ONLY):**
1. **Write user scenario first** - describe what user wants to accomplish
2. **Convert to failing acceptance test** - test the complete user workflow in `/test/suite/`
3. **Implement minimal code** to make the test pass
4. **Add supporting unit tests** as needed for implementation details (optional)
5. **Refactor with test protection** - improve code while tests ensure no regressions
6. **NEVER add regression tests** - those are added separately after feature completion

#### **Example workflow:**
```typescript
// 1. User scenario: "User creates a new blog post"
// 2. Acceptance test in /test/suite/: 
test('user can create and view new post', async () => {
  // Test complete workflow from command to tree view
});
// 3. Implement just enough to pass test
// 4. Add supporting unit tests for components (if needed)
// 5. Refactor implementation
// 6. NEVER add regression tests - those come later when explicitly requested
```

### **Incremental Development (Recommended)**

#### **Change management:**
- Make small, focused changes (one concept at a time)
- Test after each logical change
- Never batch unrelated modifications
- Keep changes under 100 lines when possible

#### **Benefits:**
- Easier debugging (small change scope)
- Safer rollback (minimal impact)
- Better code review (focused changes)
- Continuous validation (catch issues early)

### **Documentation Update Requirements**

#### **After feature completion:**
1. **Update CLAUDE.md** with new patterns or architectural changes
2. **Update README.md** if feature is user-facing
3. **Update inline code documentation** for complex logic
4. **Update test documentation** for new testing patterns

#### **Documentation triggers:**
- New commands or user-facing features
- Changes to extension architecture
- New testing patterns or tools
- Bug fixes that required significant investigation

---

This document should be updated as the extension evolves, especially when adding new features or changing architecture.
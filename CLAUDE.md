# Claude Code Instructions - Micro.blog VS Code Extension

## Project Overview

This is a VS Code extension for micro.blog integration built using **Domain Driven Design (DDD)** principles. **PHASE 3 REMOTE UPLOADS DISPLAY COMPLETED** - includes read-only browsing, local content creation, publishing, image uploads, and remote uploads tree display.

### Current Status ✅ (v0.3.20250711 - Phase 3 Remote Uploads Display Complete)
- **Phase 1 Complete**: Read-only browsing, authentication, API integration
- **Local Content Creation**: New Post command with workspace integration
- **Publishing Capabilities**: Publish local drafts to micro.blog
- **Image Upload Support**: Upload images with retry logic and multiple formats
- **Remote Uploads Display**: Tree view shows uploaded media from micro.blog API
- **Enhanced Tree View**: Shows local drafts, remote content, and remote uploads
- **File Management**: Automatic workspace structure and file operations
- **Real-time Updates**: File watcher provides instant tree view updates
- **Quality Maintained**: 119 passing tests (82 core tests + comprehensive coverage)
- **Development Tools**: Justfile for streamlined development workflow
- **Complete API Integration**: `/micropub/media?q=source` endpoint for remote uploads

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

## Recent Changes & Current State

### ✅ **Completed Features**

#### **Phase 1 (v0.1.0)**: Complete read-only browsing with authentication
1. Full UI Integration with tree view and content viewer
2. Secure authentication with micro.blog API
3. Error handling and recovery flows

#### **Phase 2 Week 1**: Local content creation
1. **LocalPost Domain Entity**: Full frontmatter support and markdown serialization
2. **FileManager Service**: Workspace structure creation and file operations
3. **Enhanced TreeProvider**: Shows local drafts alongside remote content
4. **New Post Command**: Complete workflow for creating local posts
5. **File Watching**: Real-time tree updates when content changes

#### **Phase 2 Week 2**: Publishing capabilities
1. **PublishingService**: Complete orchestration of validation → conversion → API publishing
2. **Context Menu Integration**: Right-click local posts → "Publish to Micro.blog"
3. **Progress Indicators**: VS Code progress notifications during publishing

#### **Phase 3**: Remote uploads display
1. **Remote Uploads API**: Integration with `/micropub/media?q=source` endpoint
2. **UploadManager Service**: API calls with 5-minute caching for performance
3. **Tree View Integration**: Shows "📁 Remote Uploads (count)" with metadata
4. **Context Menus**: Copy as Markdown/HTML for remote upload URLs
5. **Error Recovery**: Graceful fallback to local uploads on API failure


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

## 🎉 MVP Completion Status

### ✅ **COMPLETED FEATURES**
- **Full UI Integration**: Tree view showing Published/Drafts, click-to-view content
- **Proper Authentication**: `/account/verify` endpoint integration
- **Error Handling**: Clear error messages and recovery flows
- **Comprehensive Testing**: 18 passing tests with API mocks
- **Bug Resolution**: API endpoint issue fixed (personal domains → micro.blog endpoint)
- **Distribution**: Ready as `micro-blog-vscode-0.1.0.vsix`

### 🏗️ **ARCHITECTURE IMPROVEMENTS MADE**
- **Enhanced API Client**: Added token verification method
- **Improved Service Layer**: Better error handling and user feedback
- **Fixed Domain Logic**: Blog entity always uses correct API endpoint
- **Complete Provider Integration**: Tree and content providers fully wired
- **Activation Events**: Proper lazy loading with VS Code best practices

### 🎉 **PHASE 2 WEEK 1 COMPLETED**
The extension now includes local content creation capabilities in addition to read-only browsing.

### **Phase 2 Architectural Additions (v0.1.20250711)**
- **LocalPost Domain Entity**: Handles frontmatter, markdown serialization, and slug generation
- **FileManager Service**: Workspace structure creation, file operations, and local content management
- **Enhanced TreeProvider**: Shows local drafts alongside remote content with proper icons
- **File Watching**: Real-time tree updates when local content changes
- **New Post Command**: Integrated workflow for creating local markdown posts
- **Development Tools**: Justfile for streamlined development workflow

### ✅ **PHASE 2 WEEK 2 COMPLETED**
The extension now includes full publishing capabilities, allowing users to publish local drafts directly to micro.blog.

### **Phase 2 Week 2 Publishing Features (v0.2.20250711)**
- **PublishingService**: Complete orchestration of validation → conversion → API publishing workflow
- **Enhanced ApiClient**: Added `publishPost()` method with Micropub protocol support
- **Context Menu Integration**: Right-click local posts → "Publish to Micro.blog"
- **Micropub Format Support**: Automatic conversion from LocalPost to Micropub format
- **Publishing Validation**: Pre-publish validation with clear error messages
- **Progress Indicators**: VS Code progress notifications during publishing
- **Comprehensive Test Coverage**: 40 passing tests (15 new publishing tests added)
- **Microsoft VS Code Patterns**: Follows official tree view context menu patterns

### ✅ **IMAGE UPLOAD FEATURE COMPLETED**
The extension now includes comprehensive image upload functionality.

### ✅ **PHASE 3 REMOTE UPLOADS DISPLAY COMPLETED**
The extension now displays uploaded media files from micro.blog in the tree view.

### **Phase 3 Remote Uploads Display Features (v0.3.20250711)**
- **UploadFile Domain Enhancement**: Added remote URL support with CDN and multiple image sizes
- **ApiClient Enhancement**: Added `fetchUploadedMedia()` method for `/micropub/media?q=source` endpoint
- **UploadManager Transformation**: Changed from local file scanning to remote API integration with 5-minute caching
- **TreeProvider Enhancement**: Shows "📁 Remote Uploads (count)" section with fallback to local uploads
- **Loading States**: Visual feedback during API calls with error handling and retry options
- **ATDD Implementation**: Following test-driven development with 119 passing tests
- **Performance Optimization**: Cached API responses reduce repeated network calls

### **Image Upload Features**
- **Media Upload Command**: `microblog.uploadImage` command with file dialog integration
- **File Validation**: JPEG/PNG/GIF support up to 10MB with clear error messages
- **Context Menu**: Right-click upload for image files in Explorer
- **Progress Feedback**: VS Code progress indicators during upload
- **Retry Logic**: Automatic retry (max 3 attempts) with exponential backoff
- **URL Handling**: Copy URL or markdown format to clipboard
- **API Integration**: Full Micropub media endpoint protocol compliance
- **Comprehensive Testing**: 26 new tests covering all upload scenarios


### 🚀 **Next Phase: Advanced Features**
Future development will include draft synchronization, multi-blog support, and enhanced media management capabilities.

---

## 🛡️ **DEVELOPMENT PROTOCOLS** (Mandatory for Phase 2+)

### **Quality Gates (Non-Negotiable)**

#### **Before ANY code changes:**
1. Run `npm run compile` - ensure TypeScript compiles cleanly
2. Run `npm test` - ensure all tests pass (currently 104 tests)
3. Run `npm run lint` - ensure code style compliance
4. **ALL must pass before making any changes**

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

### **ATDD Workflow for New Features**

#### **For each user-facing feature:**
1. **Write user scenario first** - describe what user wants to accomplish
2. **Convert to failing acceptance test** - test the complete user workflow
3. **Implement minimal code** to make the test pass
4. **Add supporting unit tests** as needed for implementation details
5. **Refactor with test protection** - improve code while tests ensure no regressions

#### **Example workflow:**
```typescript
// 1. User scenario: "User creates a new blog post"
// 2. Acceptance test: 
test('user can create and view new post', async () => {
  // Test complete workflow from command to tree view
});
// 3. Implement just enough to pass test
// 4. Add unit tests for components
// 5. Refactor implementation
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
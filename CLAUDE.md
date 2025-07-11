# Claude Code Instructions - Micro.blog VS Code Extension

## Project Overview

This is a VS Code extension for micro.blog integration built using **Domain Driven Design (DDD)** principles. **MVP COMPLETED** - fully functional read-only content browsing with secure authentication.

### Current Status ✅ (v0.1.0 - MVP Complete)
- **Authentication**: Working with proper `/account/verify` endpoint
- **API Integration**: Successfully fetching posts via Micropub API with correct endpoint management
- **Configuration**: Simplified token-only setup with auto-domain discovery
- **UI Integration**: Tree view and content viewing fully implemented
- **Security**: Clean logging without sensitive data exposure
- **Testing**: 18 passing tests with comprehensive API mocking
- **Distribution**: Packaged as VSIX and ready for user testing
- **Bug Fixes**: API endpoint issue resolved (always use micro.blog/micropub)

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
│   └── Credentials.ts       # Authentication value object
├── services/                # Application services
│   ├── MicroblogService.ts  # Main orchestration (configure, fetch)
│   ├── ApiClient.ts         # Micropub HTTP client
│   └── FileManager.ts       # Workspace and file operations ✅
├── providers/               # VS Code integration ✅
│   ├── TreeProvider.ts      # Content tree view (local + remote) ✅
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

### ✅ **Completed (MVP Phase 1)**
1. **Working authentication** with micro.blog API
2. **Token-only configuration** with domain auto-discovery
3. **Clean, secure logging** without sensitive data
4. **Domain entity tests** passing (Blog, Post, Credentials)
5. **API integration** successfully fetching 83+ posts
6. **Constants-based configuration** management

### 🚧 **In Progress**
- Documentation updates for new configuration flow

### 📋 **Next Steps (Future Phases)**
1. **Tree View Provider** - Browse posts in VS Code Explorer
2. **Content Provider** - View post content in editor
3. **Enhanced testing** - More comprehensive test coverage
4. **Publishing features** - Write and publish new posts

## API Integration Details

### Endpoints Used
- **Authentication**: `https://micro.blog/micropub?q=source`
- **Post Fetching**: Same endpoint (auto-discovers user content)
- **Future**: `https://micro.blog/micropub` for posting

### Authentication Flow
1. User provides app token (from Account → Edit Apps → New Token)
2. Extension validates token by fetching user's posts
3. Auto-discovers blog domain from first post URL
4. Stores both token (SecretStorage) and domain (globalState)

## Testing Strategy

### Current Tests ✅
- **Domain entities**: Blog creation, Post parsing, Credentials validation
- **VS Code integration**: Extension activation and command registration

### Needed Tests 📝
- **API Client**: HTTP request/response handling with mocks
- **MicroblogService**: Configuration and post fetching flows
- **Error handling**: Network failures, invalid tokens

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
- **Pure business logic** with no external dependencies
- **Self-validating** entities with business rules
- **Easily testable** in isolation

## Known Issues & Considerations

1. **Requires published posts** - Domain discovery needs at least one post
2. **Read-only MVP** - No editing/publishing capabilities yet
3. **Single blog support** - Multi-blog support planned for later
4. **Development mode only** - Not yet packaged for distribution

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

### 🚀 **READY FOR PHASE 2 WEEK 2**
Next: Draft editing workflow with sync status tracking and conflict detection.

---

## 🛡️ **DEVELOPMENT PROTOCOLS** (Mandatory for Phase 2+)

### **Quality Gates (Non-Negotiable)**

#### **Before ANY code changes:**
1. Run `npm run compile` - ensure TypeScript compiles cleanly
2. Run `npm test` - ensure all tests pass (currently 18 tests)
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
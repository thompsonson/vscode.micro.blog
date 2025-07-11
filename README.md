# Micro.blog VS Code Extension

> ✅ **Phase 1 Complete** | ✅ **Phase 2 Complete** - Full local creation & publishing ready!

A VS Code extension for micro.blog integration that lets you browse remote content and create/edit posts locally in VS Code, built with Domain Driven Design principles.

## 🚀 Features

### ✅ **Completed**

#### **Phase 1 (v0.1.0) - Read-Only Browsing**
- **🔧 Simple Configuration**: One-click setup with app token only
- **🔐 Secure Authentication**: Uses VS Code SecretStorage + proper token verification
- **📱 Connection Testing**: Verify credentials and view account info
- **📁 Content Browsing**: Tree view with posts organized by Published/Drafts  
- **👀 Content Viewing**: Click posts to view formatted content in editor
- **🔄 Refresh**: Update content with latest posts
- **🛡️ Error Handling**: Clear error messages for common issues
- **🧪 Comprehensive Testing**: 18 passing tests with API mocking

#### **Phase 2 Week 1 (v0.1.20250711) - Local Content Creation**
- **📝 New Post Creation**: Create local blog posts with "New Post" command
- **📂 Workspace Integration**: Automatic `.microblog/` and `content/` folder setup
- **📋 Enhanced Tree View**: Shows "📝 Local Drafts" alongside remote content
- **🔍 File Watching**: Real-time tree updates when local files change
- **✍️ Markdown Support**: Full frontmatter support with title, status, type metadata
- **🎯 Click-to-Edit**: Click local posts to open in VS Code editor

#### **Phase 2 Week 2 (v0.2.20250711) - Publishing**
- **📤 One-Click Publishing**: Right-click local posts → "Publish to Micro.blog"
- **✅ Content Validation**: Pre-publish validation with clear error messages
- **🔄 Progress Feedback**: VS Code progress notifications during publishing
- **🌐 Micropub Protocol**: Full support for micro.blog's publishing API
- **🎯 Context Menu Integration**: Native VS Code right-click workflow
- **🛡️ Error Handling**: Comprehensive error recovery and user feedback

## 📦 Installation & Setup

### For Users
1. **Install from VSIX**: Download `micro-blog-vscode-0.2.20250711.vsix` and install via:
   - Command Palette → "Extensions: Install from VSIX"
   - Or: `code --install-extension micro-blog-vscode-0.2.20250711.vsix`

### For Developers  
1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run compile` to build
4. Press **F5** to launch Extension Development Host

## 🔧 Configuration

1. **Get your app token**: Go to [micro.blog](https://micro.blog) → Account → Edit Apps → New Token
2. **Configure extension**: 
   - Command Palette (**Cmd+Shift+P**) → **"Micro.blog: Configure"**
   - Enter your app token
   - Extension auto-discovers your blog domain
3. **View your posts**: Look for **"MICRO.BLOG POSTS"** in the Explorer sidebar

## 🎯 Usage

### **Browsing Remote Content**
- **Browse Posts**: Expand "📄 Published Posts" and "📋 Remote Drafts" in the tree view
- **View Content**: Click any remote post to open formatted content in editor  
- **Test Connection**: Command Palette → "Micro.blog: Test Micro.blog Extension"
- **Refresh**: Click refresh icon (↻) or run "Micro.blog: Refresh Content"

### **Creating Local Content**
- **New Post**: Click the ➕ button in tree view toolbar (requires workspace folder)
- **Edit Locally**: Click any post in "📝 Local Drafts" to edit in VS Code
- **Auto-Save**: Changes are automatically saved to your workspace

### **Publishing to Micro.blog** ✨ **New!**
- **Publish**: Right-click any local post → select "Publish to Micro.blog"
- **Progress**: Watch publishing progress in VS Code notifications
- **Success**: Get confirmation with optional URL to published post
- **Error Handling**: Clear error messages for validation failures or API issues

## Architecture

This extension follows Domain Driven Design (DDD) principles within VS Code's standard structure:

```
src/
├── extension.ts              # VS Code entry point (composition root)
├── config/
│   └── constants.ts          # API endpoints, storage keys, timeouts
├── domain/                   # Core business logic
│   ├── Blog.ts              # Blog entity
│   ├── Post.ts              # Post entity
│   ├── LocalPost.ts         # Local post entity with publishing support  
│   └── Credentials.ts       # Authentication value object
├── services/                # Application services
│   ├── MicroblogService.ts  # Main orchestration
│   ├── ApiClient.ts         # Micropub HTTP client with publishing
│   ├── PublishingService.ts # Publishing workflow orchestration
│   └── FileManager.ts       # Local content management
└── providers/               # VS Code integration ✅
    ├── TreeProvider.ts      # Content tree view ✅
    └── ContentProvider.ts   # Read-only content viewer ✅
```

## 🧪 Testing

- **Run tests**: `npm test` (40 tests passing)
- **Coverage**: Domain logic, publishing workflow, API client with mocks, VS Code integration
- **Manual testing**: Working with real micro.blog accounts

## 🛠️ Development

- `npm run compile` - Compile TypeScript
- `npm run watch` - Watch for changes and recompile  
- `npm run lint` - ESLint validation
- `npm test` - Run test suite
- `npx @vscode/vsce package` - Package as VSIX

## 🔄 Known Issues & Solutions

### ✅ **Fixed: API Endpoint Issue**
- **Problem**: Extension tried to use personal domain for API calls (e.g., `matt.thompson.gr/micropub`)
- **Solution**: Always use main `micro.blog/micropub` endpoint for API calls
- **Status**: Resolved in v0.1.0

## 🗺️ Roadmap

### ✅ **Phase 1: Read-Only Browsing** (Complete)
- Browse and view existing micro.blog content

### 🚧 **Phase 2: Local Content Creation & Editing**
- ✅ **Week 1**: Local post creation (Complete)
- 🔄 **Week 2**: Edit remote drafts locally (In Progress)  
- 📋 **Week 3**: Publishing capability (Planned)

### 📋 **Phase 3: Advanced Features** (Future)
- Multi-blog support
- Photo uploads  
- Categories and tags management
- Full bi-directional sync

## API References

- [Micro.blog API Documentation](https://help.micro.blog/t/api-overview/93)
- [Micropub Specification](https://micropub.spec.indieweb.org/)
- [VS Code Extension API](https://code.visualstudio.com/api)
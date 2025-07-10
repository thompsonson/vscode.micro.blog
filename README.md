# Micro.blog VS Code Extension

> ✅ **MVP Complete** - Ready for user testing!

A VS Code extension for browsing and viewing your micro.blog content directly in VS Code, built with Domain Driven Design principles.

## 🚀 Features

### ✅ **Completed (v0.1.0)**
- **🔧 Simple Configuration**: One-click setup with app token only
- **🔐 Secure Authentication**: Uses VS Code SecretStorage + proper token verification
- **📱 Connection Testing**: Verify credentials and view account info
- **📁 Content Browsing**: Tree view with posts organized by Published/Drafts  
- **👀 Content Viewing**: Click posts to view formatted content in editor
- **🔄 Refresh**: Update content with latest posts
- **🛡️ Error Handling**: Clear error messages for common issues
- **🧪 Comprehensive Testing**: 18 passing tests with API mocking

## 📦 Installation & Setup

### For Users
1. **Install from VSIX**: Download `micro-blog-vscode-0.1.0.vsix` and install via:
   - Command Palette → "Extensions: Install from VSIX"
   - Or: `code --install-extension micro-blog-vscode-0.1.0.vsix`

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

- **Browse Posts**: Expand "Published" and "Drafts" in the tree view
- **View Content**: Click any post to open formatted content in editor  
- **Test Connection**: Command Palette → "Micro.blog: Test Micro.blog Extension"
- **Refresh**: Click refresh icon (↻) or run "Micro.blog: Refresh Content"

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
│   └── Credentials.ts       # Authentication value object
├── services/                # Application services
│   ├── MicroblogService.ts  # Main orchestration
│   └── ApiClient.ts         # Micropub HTTP client
└── providers/               # VS Code integration ✅
    ├── TreeProvider.ts      # Content tree view ✅
    └── ContentProvider.ts   # Read-only content viewer ✅
```

## 🧪 Testing

- **Run tests**: `npm test` (18 tests passing)
- **Coverage**: Domain logic, API client with mocks, VS Code integration
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

## 🗺️ Roadmap (Future Phases)

### Phase 2: Content Editing
- Edit posts locally in VS Code
- Save changes as drafts

### Phase 3: Publishing  
- Publish new posts via Micropub
- Update existing posts

### Phase 4: Advanced Features
- Multi-blog support
- Photo uploads
- Categories and tags management

## API References

- [Micro.blog API Documentation](https://help.micro.blog/t/api-overview/93)
- [Micropub Specification](https://micropub.spec.indieweb.org/)
- [VS Code Extension API](https://code.visualstudio.com/api)
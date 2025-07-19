# Changelog

All notable changes to the Micro.blog VS Code Extension will be documented in this file.

## [0.5.20250719] - 2025-07-19

### Added
- **Draft to Published Organization**: Automatic file movement from `content/drafts/` to `content/published/` after successful publish
- Enhanced LocalPost domain entity with `location: 'drafts' | 'published'` property
- FileManager enhanced with folder creation, file movement, and migration logic
- TreeProvider shows separate "📝 Local Drafts" and "📄 Published Posts (Local)" sections
- Automatic migration of existing flat content structure to organized folders
- Conflict resolution with timestamp-based auto-renaming
- Progress notifications during file operations
- Graceful error handling (publish success but move failure shows warning)

### Changed
- Updated tree view to show separate sections for local drafts and published posts
- File structure now uses `content/drafts/` and `content/published/` folders
- Improved file organization workflow for better content management

## [0.4.20250719] - 2025-07-19

### Added
- Upload content viewing with dedicated webview panels
- Click-to-view functionality for all upload types
- Image viewer with metadata, actions, and error handling
- Text file preview with content streaming and size limits
- Support for TXT, JSON, XML, CSV, YAML file preview
- Copy-to-clipboard functionality for text content

## [0.3.20250711] - 2025-07-11

### Added
- Remote uploads display from API
- Pages section with dedicated API endpoint
- Enhanced tree view with all content types
- Caching for performance optimization
- Context menus for format copying

## [0.2.20250711] - 2025-07-11

### Added
- Publishing capabilities with Micropub POST support
- Context menu integration for publishing
- Progress indicators and validation
- Comprehensive test coverage expansion

## [0.1.20250711] - 2025-07-11

### Added
- LocalPost domain entity with frontmatter support
- FileManager service for workspace operations
- Enhanced tree view showing local drafts
- File watching for real-time updates
- New Post command for content creation

## [0.1.0] - Initial Release

### Added
- Full UI Integration with tree view and content viewer
- Secure authentication with micro.blog API
- Content browsing for posts and drafts
- Error handling and recovery flows
# Remote Upload Click-to-View Feature

## 🎯 Goal
Add click functionality to remote uploads in tree view to display file content within VS Code.

## 📝 Current State
- ✅ Remote uploads tree section working (shows 67 files)
- ✅ Files display with icons and metadata
- ❌ Clicking files does nothing

## 🚀 Requested Feature

**User clicks remote upload → VS Code displays content**

### Image Files
- Open in webview panel with image display
- Show metadata (filename, upload date, alt text, URL)
- Actions: Copy URL, Copy Markdown, Open in Browser

### Non-Image Files  
- Open metadata panel with file info
- Actions: Copy URL, Open in Browser
- Text preview for supported types (TXT, JSON, etc.)

## 🏗️ DDD Architecture Alignment

### Domain Enhancement
```typescript
// src/domain/UploadFile.ts (existing - add methods)
class UploadFile {
  isImageFile(): boolean;
  isTextFile(): boolean;
  getOptimalViewingUrl(): string;
}
```

### New Service Layer
```typescript
// src/services/ContentViewerService.ts (new)
class ContentViewerService {
  async displayUpload(uploadFile: UploadFile): Promise<void>;
  private createImageViewer(file: UploadFile): Promise<vscode.WebviewPanel>;
  private createMetadataPanel(file: UploadFile): Promise<vscode.WebviewPanel>;
}
```

### Provider Integration
```typescript
// src/providers/TreeProvider.ts (extend existing)
onDidChangeSelection: (item: UploadFile) => {
  this.contentViewerService.displayUpload(item);
}
```

## 🧪 ATDD Development Protocol

### Quality Gates (Pre-Development)
```bash
npm run compile  # Must pass
npm test        # Must pass (114 tests)
npm run lint    # Must pass
```

### Acceptance Test First
```typescript
// /test/suite/ - Write BEFORE implementation
describe('Upload Content Viewing', () => {
  test('user clicks image upload and views content', async () => {
    // Given: Upload tree with image file
    // When: User clicks image in tree
    // Then: Webview opens showing image + metadata
  });
  
  test('user clicks document and sees metadata panel', async () => {
    // Complete user workflow test
  });
});
```

### Implementation Order
1. **Domain methods** - Add file type detection to UploadFile
2. **Service layer** - ContentViewerService with webview creation
3. **Provider integration** - Tree click handler
4. **Testing validation** - Ensure acceptance tests pass

## 📋 Success Criteria

- [ ] Acceptance tests pass for complete user workflows
- [ ] Image files open in webview with metadata display
- [ ] Non-image files show metadata panel
- [ ] All quality gates remain green
- [ ] No regression test modifications

## 🚧 Development Notes

**Architecture**: Follows existing DDD patterns (domain → services → providers)
**Testing**: Focus on acceptance tests in `/test/suite/` only
**Quality**: Maintain all 114 existing tests passing
**Incremental**: Small focused changes with continuous validation

---

**Enhancement builds on existing upload infrastructure using established DDD patterns**
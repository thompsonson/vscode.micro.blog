# Draft to Published File Management Feature

**✅ IMPLEMENTED in v0.5.20250719**

**⚠️ Read and respect all development requirements in CLAUDE.md before implementation**

## 🎯 Goal
Organize local content by moving drafts to published folder after successful publishing and updating tree view accordingly.

## 📝 Current State
- ✅ Local drafts creation working in `content/` folder
- ✅ Publishing to micro.blog functional with context menu
- ❌ All files remain in flat `content/` structure
- ❌ No distinction between draft and published content

## 🚀 Requested Feature

**User publishes local draft → File moves to published folder + tree updates**

### File Organization
- Create `content/drafts/` and `content/published/` subfolders
- Move `.md` files from `drafts/` → `published/` after successful publish
- Update tree view to reflect new organization

### Tree View Changes
- "📝 Local Drafts" shows `content/drafts/` contents
- Add "📄 Published Posts (Local)" showing `content/published/` contents
- Automatic count updates after file movements

## 🏗️ DDD Architecture Alignment

### Service Layer Enhancement
```typescript
// src/services/FileManager.ts (extend existing)
class FileManager {
  async moveToPublished(localPost: LocalPost): Promise<void>;
  async createPublishedFolder(): Promise<void>;
  async migrateDraftsToSubfolder(): Promise<void>;
}
```

### Publishing Integration
```typescript
// src/services/PublishingService.ts (extend existing)
async publishPost(localPost: LocalPost): Promise<void> {
  // ... existing publish logic
  await this.fileManager.moveToPublished(localPost);
  await this.treeProvider.refresh();
}
```

### Provider Updates
```typescript
// src/providers/TreeProvider.ts (extend existing)
// Add Published Posts (Local) section
// Update Local Drafts to scan drafts/ subfolder
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
describe('Draft File Management', () => {
  test('user publishes draft and file moves to published folder', async () => {
    // Given: Local draft in drafts/ folder
    // When: User publishes successfully
    // Then: File moves to published/ and tree updates
  });
  
  test('tree view shows separate draft and published sections', async () => {
    // Complete workflow with tree validation
  });
});
```

### Implementation Order
1. **FileManager enhancement** - Add folder creation and file movement
2. **Publishing integration** - Call file movement after successful publish
3. **TreeProvider updates** - Add published section and update draft scanning
4. **Migration logic** - Handle existing files in flat structure

## 📋 Success Criteria

- [x] Drafts automatically move to published/ after successful publish
- [x] Tree view shows separate "Local Drafts" and "Published Posts (Local)" sections
- [x] File counts update correctly after movements
- [x] Existing workflow unchanged (publish still works)
- [x] All quality gates remain green

## 🚧 Development Notes

**Architecture**: Extends existing FileManager and PublishingService patterns
**Migration**: Handle existing flat content/ structure gracefully
**Testing**: Focus on file system operations and tree view updates
**Backwards compatibility**: Ensure existing drafts continue working

## 📋 Implementation Decisions

### File Movement Behavior
- **Publish success + move failure**: Leave in drafts, show warning notification (no rollback)
- **Preserve dates**: Maintain original file modification dates for sorting

### Migration Strategy
- **Existing files**: Default all to `drafts/` folder (safer assumption)
- **Migration trigger**: When `.microblog/` exists but no `content/drafts/` structure detected

### Domain Model Updates
- **LocalPost enhancement**: Add `location: 'drafts' | 'published'` property
- **FilePath updates**: Include subfolder in filePath for business logic consistency

### Tree View Behavior
- **Always show sections**: Display both "📝 Local Drafts (0)" and "📄 Published Posts (Local) (0)" even when empty
- **Consistent with uploads**: Matches current uploads section behavior

### Edge Cases
- **Name conflicts**: Auto-rename with timestamp: `post-name-2025-07-19-143522.md`
- **Partial failures**: Continue processing, show summary notification
- **Migration failure**: Continue with flat structure, show error notification

### UX & Testing
- **Visual feedback**: Use VS Code progress notifications during moves
- **Manual movement**: Not included (keep scope focused)
- **File system testing**: Use VS Code's `MemFS` for test isolation
- **Integration tests**: Test complete publish → move → tree refresh workflow

---

**Organizes local content workflow with clear draft/published separation**
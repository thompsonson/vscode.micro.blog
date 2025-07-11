# Phase 2: Publishing Local Posts

## ✅ **COMPLETED - Phase 2 Week 2 (v0.2.20250711)**

## 🎯 **Primary Objective**
**Enable publishing local markdown posts directly to micro.blog**

## 🚀 **Core Feature: Publish Posts**

**Goal:** Publish local drafts directly to micro.blog
**User Flow:**
1. User has local draft in `content/my-post.md`
2. Right-click → "Publish to Micro.blog"
3. Extension converts markdown + frontmatter to Micropub format
4. POST to `/micropub` endpoint
5. Success notification or error message
6. Post appears on micro.blog

## 📋 **ATDD User Scenarios**

### Scenario: Publish Local Post
```gherkin
Feature: Publish Post to Micro.blog
  Scenario: User publishes a local draft
    Given I have a local post "my-post.md" with valid frontmatter
    When I right-click and select "Publish to Micro.blog"
    Then the post is converted to Micropub format
    And sent via POST /micropub
    And I see a success notification
    And the post appears on my micro.blog
```

## 🏗️ **Technical Implementation**

### Domain Enhancements
```typescript
// Extend existing LocalPost (src/domain/LocalPost.ts)
class LocalPost {
  // ... existing properties ...
  
  toMicropubFormat(): MicropubPost;
  validateForPublishing(): ValidationResult;
}
```

### New Services
```typescript
// src/services/PublishingService.ts
interface PublishingService {
  publishPost(localPost: LocalPost): Promise<PublishResult>;
  convertToMicropub(localPost: LocalPost): MicropubPost;
  validateContent(localPost: LocalPost): ValidationResult;
}
```

### Extended API Client
```typescript
// src/services/ApiClient.ts (additions)
async publishPost(postData: MicropubPost): Promise<PublishResponse>;
```

### New Commands
- `microblog.publishPost` - Publish selected local post

## 📊 **API Integration Details**

### Micropub Publishing
```http
POST /micropub
Authorization: Bearer {token}
Content-Type: application/x-www-form-urlencoded

h=entry&content=Hello+world&name=My+Post+Title
```

## 🧪 **Testing Strategy**

### Acceptance Tests
```typescript
describe('Publishing Workflow', () => {
  test('publishes local post successfully', async () => {
    // Given: Local post with valid content
    const localPost = createTestPost({
      title: 'Test Post',
      content: 'Test content',
      status: 'draft'
    });
    
    // When: User publishes
    await executeCommand('microblog.publishPost', localPost);
    
    // Then: API called correctly
    expect(mockApiClient.publishPost).toHaveBeenCalledWith({
      h: 'entry',
      name: 'Test Post',
      content: 'Test content'
    });
    
    // And: Success notification shown
    expect(showSuccessMessage).toHaveBeenCalled();
  });
});
```

### Unit Tests
- PublishingService content conversion and validation
- LocalPost Micropub format conversion
- Content validation and error handling
- Network failure recovery

## 🎯 **Success Criteria**

### Publishing Feature
- Publish success rate >95% for valid content
- Frontmatter correctly converted to Micropub format
- Published posts appear on micro.blog within 30 seconds
- Clear error messages for validation failures
- Success/failure notifications provide immediate feedback

### Technical Requirements
- Publish operations complete in <10 seconds
- No data loss during publish failures
- Proper error recovery and user feedback

## 🚧 **Scope Limitations**

**Explicitly NOT included:**
- ❌ Tree view status updates
- ❌ Sync status tracking
- ❌ Media upload or image handling
- ❌ Multi-blog support
- ❌ Bulk operations
- ❌ Complex Micropub properties

**Focus:** Simple, reliable text post publishing

## 📂 **File Structure (Simplified)**

```
workspace/
  content/
    my-post.md           # Local posts
    another-post.md      # More local posts
```

**Frontmatter Format:**
```markdown
---
title: "My Post Title"
status: "draft"
type: "post"
---

# My Post Title

Content goes here...
```

## 🔄 **Development Workflow**

### Quality Gates (Mandatory)
1. `npm run compile && npm test && npm run lint` before changes
2. Make incremental change (one feature at a time)
3. Re-run quality gates after changes
4. Fix failures immediately

### ATDD Approach
1. Write user scenario (Gherkin format)
2. Convert to failing acceptance test
3. Implement minimal code to pass test
4. Add supporting unit tests
5. Refactor with test protection

### Feature Development Order
1. **LocalPost Enhancement** - Add Micropub conversion methods
2. **Publishing Service** - Core Micropub POST integration
3. **Content Validation** - Frontmatter validation
4. **VS Code Integration** - Right-click command
5. **Error Handling** - Network failures and validation errors
6. **User Feedback** - Success/failure notifications

## 📞 **Validation Plan**

### Publishing Workflow Testing
- [ ] Test publish with various frontmatter configurations
- [ ] Verify posts appear correctly on micro.blog
- [ ] Test error scenarios (invalid content, network failures)
- [ ] Validate notifications provide clear feedback

### User Experience Testing
- [ ] Test with real micro.blog account
- [ ] Validate right-click workflow feels natural
- [ ] Confirm error messages are actionable

---

**🎯 Simple, focused publishing that gets local content onto micro.blog**
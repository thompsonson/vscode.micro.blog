# Uploads Tree Display Feature

## 🎯 **Objective**
**Add "📁 Uploads" section to tree view showing user's uploaded media files from micro.blog**

## 🚀 **Feature: Remote Uploads Tree Section**

**Goal:** Display user's uploaded media files from micro.blog in tree view alongside content sections
**User Flow:**
1. User configures micro.blog extension with valid credentials
2. Tree view shows "📁 Uploads (12)" section with count from API
3. Expand to see individual uploaded files with icons and metadata
4. Right-click for markdown/HTML format options using remote URLs

## 📋 **ATDD User Scenarios**

### Scenario: Display Remote Uploads Section
```gherkin
Feature: Show Remote Uploads in Tree View
  Scenario: User sees uploaded media files in tree
    Given I have configured micro.blog with valid credentials
    And I have uploaded media files to my micro.blog account
    When I refresh the tree view
    Then tree view shows "📁 Uploads (12)" section with API count
    And I can expand to see individual uploaded files
    And each file shows name, upload date, and type icon
    And files use remote URLs for markdown/HTML format copying
```

## 🔗 **API Integration**

### Endpoint Discovery
**Correct Endpoint**: `GET /micropub/media?q=source`
- **URL**: `https://micro.blog/micropub/media?q=source`
- **Authentication**: Bearer token (same as existing Micropub integration)
- **Response Time**: ~3 seconds
- **Content**: User's own uploaded media files (not community timeline)

### Response Format
```json
{
  "items": [
    {
      "url": "https://user.domain.com/uploads/2025/filename.png",
      "published": "2025-07-11T11:53:26+00:00", 
      "alt": "AI-generated alt text",
      "sizes": {
        "large": "https://user.domain.com/uploads/2025/filename.png",
        "medium": "https://user.domain.com/uploads/2025/filename-m.png", 
        "small": "https://user.domain.com/uploads/2025/filename-s.png"
      },
      "cdn": {
        "large": "https://cdn.uploads.micro.blog/123456/2025/filename.png",
        "medium": "https://cdn.uploads.micro.blog/123456/2025/filename-m.png",
        "small": "https://cdn.uploads.micro.blog/123456/2025/filename-s.png"
      }
    }
  ]
}
```

### Implementation Notes
- ✅ **No HTML parsing required** (unlike `/posts/media` endpoint)
- ✅ **Direct field mapping** from JSON response
- ✅ **Rich metadata**: Multiple image sizes, CDN URLs, AI-generated alt text
- ✅ **Standard Micropub protocol** endpoint
- ✅ **Performance optimized**: ~3 seconds response time

## 🏗️ **Technical Implementation**

### Enhanced Domain Objects
```typescript
// src/domain/UploadFile.ts
class UploadFile {
  fileName: string;
  filePath: string;      // For tree display consistency
  fileSize: number;      // Inferred from context (not provided by API)
  mimeType: string;      // Inferred from URL extension
  lastModified: Date;    // From 'published' field
  
  // New remote-specific fields
  remoteUrl: string;     // Original upload URL
  cdnUrl?: string;       // CDN URL for performance
  altText?: string;      // AI-generated alt text
  imageSizes?: {         // Multiple image sizes available
    large: string;
    medium?: string;
    small?: string;
  };
  publishedDate: string; // ISO timestamp from API
  
  getDisplayName(): string;
  getIcon(): string;
  isImageFile(): boolean;
  toMarkdown(size?: 'large' | 'medium' | 'small'): string;
  toHtml(size?: 'large' | 'medium' | 'small'): string;
  getOptimalUrl(preferCdn?: boolean): string;
}
```

### Enhanced Services
```typescript
// src/services/UploadManager.ts
interface UploadManager {
  fetchRemoteUploads(): Promise<UploadFile[]>;
  getUploadById(url: string): UploadFile | undefined;
  refreshUploads(): Promise<void>;
}

// src/services/ApiClient.ts (additions)
interface ApiClient {
  fetchUploadedMedia(): Promise<UploadFile[]>;
}
```

### Enhanced Tree Provider
```typescript
// src/providers/TreeProvider.ts (additions)
- Add "Uploads" tree section with remote file count
- Fetch uploads via API calls (with caching)
- Display individual files with metadata from API
- Context menu for copying markdown/HTML formats with remote URLs
- Loading states during API calls
- Error handling for API failures
- Retry functionality for failed requests
```

### Data Mapping Strategy
```typescript
function mapApiResponseToUploadFile(item: any): UploadFile {
  return new UploadFile({
    fileName: extractFilenameFromUrl(item.url),
    filePath: `remote-uploads/${extractFilenameFromUrl(item.url)}`,
    fileSize: 0, // Not provided by API, could be fetched separately
    mimeType: inferMimeTypeFromUrl(item.url),
    lastModified: new Date(item.published),
    
    // Remote-specific fields
    remoteUrl: item.url,
    cdnUrl: item.cdn?.large,
    altText: item.alt,
    imageSizes: item.sizes,
    publishedDate: item.published
  });
}
```

## 🌳 **Tree Structure**

```
MICRO.BLOG POSTS
├── 📝 Local Drafts (1)
├── 📁 Uploads (12)                   ← REMOTE UPLOADS SECTION
│   ├── 🖼️ vscode-editing-blog-post.png (2025-07-11)
│   ├── 🖼️ output.png (2025-06-28)
│   ├── 🖼️ 8b0ef9853d.jpg (2025-06-27)
│   ├── 🖼️ 8007971add.jpg (2025-06-23)
│   ├── 🖼️ 2ed655ef6b.jpg (2025-06-22)
│   └── ... (7 more items)
├── 📄 Published Posts (81)
└── 📋 Remote Drafts (4)
```

**Display Format:**
- File name extracted from remote URL
- Upload date instead of file size (since size not provided by API)
- Icons based on inferred file type from URL extension
- Context menu provides multiple URL format options (original, CDN, different sizes)

## 🧪 **Testing Strategy**

### Acceptance Tests
```typescript
describe('Remote Uploads Tree Display', () => {
  test('shows uploads section with API file count', async () => {
    // Given: Mock API response with uploaded files
    mockApiResponse('/micropub/media?q=source', {
      items: [
        { url: 'https://user.com/uploads/image1.png', published: '2025-07-11T10:00:00Z' },
        { url: 'https://user.com/uploads/image2.jpg', published: '2025-07-10T15:30:00Z' }
      ]
    });
    
    // When: Tree provider refreshes
    await treeProvider.refresh();
    
    // Then: Uploads section appears with API count
    const sections = await getTreeSections();
    expect(sections).toContain('📁 Uploads (2)');
  });
  
  test('handles API failures gracefully', async () => {
    // Given: API returns error
    mockApiError('/micropub/media?q=source', 500);
    
    // When: Tree provider refreshes
    await treeProvider.refresh();
    
    // Then: Shows error state with retry option
    expect(getUploadsSectionState()).toBe('error');
    expect(hasRetryOption()).toBe(true);
  });
});
```

### Unit Tests
- UploadFile domain object with remote URL support
- ApiClient fetchUploadedMedia method
- UploadManager API integration and caching
- TreeProvider uploads section with loading states
- Error handling for network failures

## 🎯 **Success Criteria**

- ✅ Uploads section appears in tree view with remote file count
- ✅ File count accurate from API response
- ✅ Individual files show with proper icons and upload dates
- ✅ Context menu available for markdown/HTML format copying with remote URLs
- ✅ API response time under 5 seconds
- ✅ Graceful handling of API failures with retry options
- ✅ Loading indicators during API calls
- ✅ Support for multiple image sizes and CDN URLs

## 🚧 **Scope Limitations**

**Included:**
- ✅ Display remote uploaded media files from micro.blog API
- ✅ File metadata (name, upload date, type inferred from URL)
- ✅ Context menu for copying markdown/HTML formats with remote URLs
- ✅ Multiple image size options (large, medium, small)
- ✅ CDN URL support for performance
- ✅ AI-generated alt text integration

**Excluded:**
- ❌ Upload functionality (handled by existing upload commands)
- ❌ File management operations (delete, rename - would require additional API calls)
- ❌ Thumbnail previews in tree view (performance considerations)
- ❌ File size information (not provided by API)
- ❌ Local file system integration (pure remote API approach)

## 🔄 **Development Order**

1. **Enhanced UploadFile Domain Object** - Remote file representation with URL, sizes, alt text
2. **ApiClient Enhancement** - Add `fetchUploadedMedia()` method for `/micropub/media?q=source`
3. **UploadManager Service** - API integration, caching, error handling  
4. **TreeProvider Extension** - Add remote uploads section with loading states
5. **Context Menu Integration** - Multiple URL format options (original, CDN, sizes)
6. **Error Handling & UX** - Loading indicators, retry functionality, graceful failures

## 📞 **Validation**

- [✅] Tree shows uploads section with correct API count
- [✅] Remote file metadata displays correctly (name, date, type)
- [✅] Context menu works for format copying with remote URLs
- [✅] API calls complete within 5 seconds  
- [✅] Loading states show during API calls
- [✅] Error states handle API failures gracefully
- [✅] Retry functionality works for failed requests
- [✅] Multiple image sizes supported in context menu
- [✅] CDN URLs available for performance optimization

## 🔍 **Implementation Notes**

**Key Insight**: Use `/micropub/media?q=source` endpoint (not `/posts/media`) to get user's actual uploads rather than community media timeline.

**Performance**: ~3 second API response with rich metadata (multiple image sizes, CDN URLs, alt text) makes this approach superior to original local file scanning.

**Architecture**: Pure API-based approach eliminates local file system dependencies and provides access to remote features like CDN optimization and multiple image sizes.

---

**🎯 Extends existing tree view with remote uploads visibility using micro.blog's Micropub media API**
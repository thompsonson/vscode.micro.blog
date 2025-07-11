# Image Upload Feature

## 🎯 **Primary Objective**
**Upload images to micro.blog media endpoint and return usable URLs**

## 🚀 **Core Feature: Upload Images**

**Goal:** Upload local images to micro.blog media endpoint
**User Flow:**
1. User right-clicks image file in `uploads/` folder
2. Select "Upload to Micro.blog"
3. Extension uploads via media endpoint with progress feedback
4. Returns URL with "Copy as Markdown" option
5. Success notification with copyable URL and markdown format

## 📋 **ATDD User Scenarios**

### Scenario: Upload Image File
```gherkin
Feature: Upload Image to Micro.blog
  Scenario: User uploads a local image
    Given I have an image file in "content/uploads/my-photo.jpg"
    When I right-click and select "Upload to Micro.blog"
    Then the media endpoint is discovered
    And the image uploads via multipart form
    And I receive the uploaded URL
    And can copy the URL for use in posts
```

## 🏗️ **Technical Implementation**

### New Domain Objects
```typescript
// src/domain/MediaAsset.ts
class MediaAsset {
  filePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  
  isValidImageType(): boolean;
  isWithinSizeLimit(): boolean;
}

// src/domain/UploadResult.ts
class UploadResult {
  success: boolean;
  url?: string;
  markdownFormat?: string;
  error?: string;
  retryCount?: number;
}
```

### New Services
```typescript
// src/services/MediaService.ts
interface MediaService {
  discoverMediaEndpoint(): Promise<string>;
  uploadImage(asset: MediaAsset): Promise<UploadResult>;
  validateImageFile(filePath: string): ValidationResult;
  formatAsMarkdown(url: string, alt: string): string;
  retryUpload(asset: MediaAsset, maxRetries: number): Promise<UploadResult>;
}
```

### Extended API Client
```typescript
// src/services/ApiClient.ts (additions)
async getConfig(): Promise<MicropubConfig>;
async uploadMedia(mediaEndpoint: string, formData: FormData): Promise<UploadResponse>;
```

### New Commands
- `microblog.uploadImage` - Upload selected image file

## 📊 **API Integration Details**

### Media Upload Workflow
```http
# 1. Discover media endpoint
GET /micropub?q=config
Authorization: Bearer {token}

# Response:
{
  "media-endpoint": "https://micro.blog/micropub/media"
}

# 2. Upload image
POST https://micro.blog/micropub/media
Authorization: Bearer {token}
Content-Type: multipart/form-data

file={binary_image_data}

# Response:
HTTP/1.1 202 Accepted
Location: https://username.micro.blog/uploads/123.jpg
```

## 🧪 **Testing Strategy**

### Acceptance Tests
```typescript
describe('Image Upload Workflow', () => {
  test('uploads image and returns URL', async () => {
    // Given: Valid image file
    const imagePath = './content/uploads/test-image.jpg';
    
    // When: User uploads
    const result = await executeCommand('microblog.uploadImage', imagePath);
    
    // Then: Media endpoint discovered
    expect(mockApiClient.getConfig).toHaveBeenCalled();
    
    // And: Image uploaded
    expect(mockApiClient.uploadMedia).toHaveBeenCalled();
    
    // And: URL returned
    expect(result.url).toMatch(/https:\/\/.*\.micro\.blog\/uploads\/.*\.jpg/);
  });
});
```

### Unit Tests
- MediaService endpoint discovery and upload logic
- MediaAsset validation (file type, size)
- FormData construction for multipart upload
- Error handling for network failures

## 🎯 **Success Criteria**

### Upload Feature
- Upload success rate >95% for valid images
- Support JPEG, PNG, GIF formats up to 10MB
- Upload operations complete in <30 seconds
- Progress feedback during upload for files >1MB
- Automatic retry (max 3 attempts) for network failures
- Returned URLs are immediately usable
- "Copy as Markdown" option for easy post insertion
- Clear error messages for invalid files

### User Experience
- Right-click upload feels natural
- Progress feedback during upload
- Easy URL copying for use in posts

## 🚧 **Scope Limitations**

**Explicitly NOT included:**
- ❌ Image resizing or processing
- ❌ Bulk upload operations
- ❌ Image gallery or management
- ❌ Automatic markdown insertion
- ❌ Image optimization

**Focus:** Simple, reliable image upload with URL retrieval

## 📂 **File Structure**

```
workspace/
  content/
    my-post.md           # Posts
  uploads/               # Images for upload (parallel to content)
    photo1.jpg
    screenshot.png
```

**Expected Output:**
Uploaded images become accessible at URLs like:
```html
<img src="https://matt.thompson.gr/uploads/2025/output.png" width="600" height="198" alt="">
```

## 🔄 **Development Workflow**

### Quality Gates (Mandatory)
1. `npm run compile && npm test && npm run lint` before changes
2. Make incremental change
3. Re-run quality gates after changes
4. Fix failures immediately

### ATDD Approach
1. Write user scenario (Gherkin format)
2. Convert to failing acceptance test
3. Implement minimal code to pass test
4. Add supporting unit tests
5. Refactor with test protection

### Feature Development Order
1. **MediaAsset Domain Object** - File validation logic
2. **Media Endpoint Discovery** - GET /micropub?q=config
3. **Upload Service** - Multipart form upload with progress
4. **Retry Logic** - Network failure recovery (max 3 attempts)
5. **VS Code Integration** - Right-click command
6. **Markdown Formatting** - "Copy as Markdown" option
7. **User Feedback** - Progress display and URL/markdown options

## 📞 **Validation Plan**

### Upload Testing
- [ ] Test with JPEG, PNG, GIF files
- [ ] Verify returned URLs are accessible
- [ ] Test file size and type validation
- [ ] Test error scenarios (network failures, invalid files)

### User Experience Testing
- [ ] Test with real micro.blog account
- [ ] Validate right-click workflow
- [ ] Confirm URL copying works correctly

---

**🎯 Simple image upload that returns usable URLs for posts**
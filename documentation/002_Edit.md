# Phase 2: Content Creation & Draft Editing

## 🎯 **Primary Objective** 
**Enable users to create new posts and edit existing drafts locally in VS Code**

**Success Criteria:**
- Users can create new posts with "New Post" command
- Users can edit existing drafts locally as markdown files
- Users can publish new posts and draft updates
- Local content syncs properly with micro.blog
- Simple conflict resolution for draft edits

## 📋 **User-Validated Feature Set**

Based on tester feedback, prioritize:
1. **"New Post" command** - highest priority
2. **Edit existing drafts** - second priority  
3. **Publish workflow** - essential for both
4. **Basic sync status** - prevent data loss

## 🚀 **SMART Goals (3-Week Sprint)**

### Goal 1: Local Content Creation (Week 1)
**Specific**: "New Post" command creates local markdown files with frontmatter
**Measurable**: Users can create posts that appear in tree view as "Local Draft"
**Tasks:**
- [ ] Add "New Post" command to tree view toolbar
- [ ] Create workspace content folder (./content/)
- [ ] Generate markdown template with frontmatter (title, status, type)
- [ ] Update tree view to show local files vs remote content
- [ ] Add file watcher for local content changes

### Goal 2: Draft Editing Workflow (Week 1-2)
**Specific**: Users can edit existing drafts locally and track changes
**Measurable**: Existing drafts downloadable as local markdown files
**Tasks:**
- [ ] Add "Edit Draft" command to draft posts in tree view
- [ ] Download remote draft content to local markdown file
- [ ] Track sync status (Local, Remote, Modified) 
- [ ] Update tree view icons to show sync status
- [ ] Prevent editing published posts locally (read-only)

### Goal 3: Publishing Capability (Week 2-3)
**Specific**: Publish new posts and draft updates to micro.blog
**Measurable**: Local content successfully published via Micropub API
**Tasks:**
- [ ] Add "Publish" command for local drafts
- [ ] Implement Micropub `POST` for new posts
- [ ] Implement Micropub `PUT` for draft updates  
- [ ] Add frontmatter validation before publish
- [ ] Update sync status after successful publish
- [ ] Basic error handling for publish failures

### Goal 4: Simple Conflict Prevention (Week 3)
**Specific**: Prevent common data loss scenarios
**Measurable**: Users warned about potential conflicts
**Tasks:**
- [ ] Check remote draft status before local edit
- [ ] Warn if remote draft newer than local
- [ ] Simple "Remote has changes - download fresh copy?" dialog
- [ ] Backup local changes before overwrite

## 🏗️ **Technical Implementation**

### File Structure
```
workspace/
  .microblog/
    config.json         # Local settings
  content/
    my-new-post.md      # Local posts
    draft-post-1.md     # Downloaded drafts
```

### Frontmatter Format
```markdown
---
title: "My New Post"
status: "draft"  # draft | publish  
type: "post"     # post | page
# Extension metadata
postId: ""       # Empty for new posts
lastSync: ""     # ISO timestamp
---

# My New Post

Content goes here...
```

### Tree View Enhancement
```
Micro.blog
├── 📝 Local Drafts (2)
│   ├── 🟡 my-new-post.md (Local)
│   └── 🔵 draft-post-1.md (Modified)
├── 📄 Published Posts (83)
│   └── 🟢 existing-post.md (Synced)
└── 📋 Remote Drafts (1)
    └── ⬇️  remote-draft.md (Download to edit)
```

## 📅 **3-Week Development Plan**

### Week 1: Local Content Foundation
- New Post command and file creation
- Workspace structure and file watching
- Basic tree view updates

### Week 2: Draft Editing Integration  
- Download drafts as local files
- Sync status tracking and UI updates
- Edit workflow for existing drafts

### Week 3: Publishing & Polish
- Publish workflow implementation
- Conflict prevention basics
- Error handling and user feedback

## 🧪 **Testing Strategy**

### New Test Cases
- [ ] New post creation and file generation
- [ ] Draft download and local editing
- [ ] Publish workflow with Micropub POST/PUT
- [ ] Sync status accuracy
- [ ] Conflict detection basics

### User Testing
- [ ] Test with existing MVP testers
- [ ] Focus on create → edit → publish workflow
- [ ] Validate sync status clarity
- [ ] Confirm no data loss scenarios

## 🎯 **Success Metrics**

### User Experience
- Users can create new post in <30 seconds
- Draft editing feels natural (like local files)
- Publish success rate >95%
- Clear feedback on sync status

### Technical
- File operations complete in <1 second
- Publish requests complete in <10 seconds
- No local content lost during sync operations

## 🚧 **Scope Limitations (Phase 2)**

**Explicitly NOT included:**
- ❌ Complex conflict resolution (merge conflicts)
- ❌ Multi-blog support
- ❌ Media/image uploads
- ❌ Full bi-directional sync
- ❌ Editing published posts (too complex)

**Keep simple:** Focus on the 80% use case (new posts + draft editing)

## 📞 **Validation Plan**

### Week 2 Check-in
- [ ] Demo new post creation to testers
- [ ] Get feedback on local file workflow
- [ ] Validate tree view UX changes

### Phase 2 Complete
- [ ] Full workflow testing with same testers
- [ ] Document any remaining feature requests
- [ ] Plan Phase 3 based on usage patterns

---

## 📋 **Implementation Status**

### **Phase 2 Development State**
- **Status**: Ready for implementation
- **Detailed Plan**: See `002_Implementation_Plan.md` for ATDD implementation guide
- **Development Protocols**: Established in `CLAUDE.md` - mandatory quality gates and ATDD workflow

### **Goal 1: Local Content Creation (Week 1)**
- [ ] Add "New Post" command to tree view toolbar
- [ ] Create workspace content folder (./content/)
- [ ] Generate markdown template with frontmatter (title, status, type)
- [ ] Update tree view to show local files vs remote content
- [ ] Add file watcher for local content changes

### **Goal 2: Draft Editing Workflow (Week 1-2)**
- [ ] Add "Edit Draft" command to draft posts in tree view
- [ ] Download remote draft content to local markdown file
- [ ] Track sync status (Local, Remote, Modified) 
- [ ] Update tree view icons to show sync status
- [ ] Prevent editing published posts locally (read-only)

### **Goal 3: Publishing Capability (Week 2-3)**
- [ ] Add "Publish" command for local drafts
- [ ] Implement Micropub `POST` for new posts
- [ ] Implement Micropub `PUT` for draft updates  
- [ ] Add frontmatter validation before publish
- [ ] Update sync status after successful publish
- [ ] Basic error handling for publish failures

### **Goal 4: Simple Conflict Prevention (Week 3)**
- [ ] Check remote draft status before local edit
- [ ] Warn if remote draft newer than local
- [ ] Simple "Remote has changes - download fresh copy?" dialog
- [ ] Backup local changes before overwrite

### **Testing & Validation**
- [ ] New post creation and file generation
- [ ] Draft download and local editing
- [ ] Publish workflow with Micropub POST/PUT
- [ ] Sync status accuracy
- [ ] Conflict detection basics
- [ ] Week 2 check-in with testers
- [ ] Full workflow testing with same MVP testers

---

**🎯 This directly addresses tester feedback while keeping scope manageable and building on your solid MVP foundation.**

**📋 Implementation Guide**: See `002_Implementation_Plan.md` for detailed ATDD approach, user scenarios, acceptance tests, and technical architecture.
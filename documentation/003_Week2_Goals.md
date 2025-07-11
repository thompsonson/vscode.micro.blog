# Phase 2 Week 2: Draft Editing Workflow

> **🎯 Simple Objectives Document**  
> Created: 2025-07-11  
> Status: Ready to implement

## 📝 **What We're Building**

**"Edit Draft" Feature** - Allow users to download remote drafts and edit them locally with sync status tracking.

## 🚀 **User Workflow**

1. **See Remote Draft** - User sees draft in "📋 Remote Drafts" section
2. **Download for Editing** - Right-click → "Edit Draft Locally"
3. **Edit Locally** - Draft downloads to `./content/` and opens in editor
4. **Track Changes** - Sync status shows: Synced → Modified as user edits
5. **Visual Feedback** - Tree view icons show sync status clearly

## ✅ **Success Criteria**

- **Natural Feel**: Editing remote drafts feels as easy as editing local files
- **Clear Status**: User always knows if their changes are saved locally vs synced
- **No Data Loss**: User can safely edit without losing work
- **Quick Access**: One-click download and immediate editing

## 🔧 **Technical Deliverables**

### **Core Components**
- **SyncManager**: Track sync status (Synced, Modified, Local, Remote)
- **Context Menus**: Right-click actions for different content types
- **Download Service**: Convert remote drafts to local markdown files
- **Status Icons**: Visual indicators in tree view (🟢 Synced, 🔵 Modified, etc.)

### **User Commands**
- `microblog.editDraftLocally` - Download remote draft for editing
- Enhanced tree view with sync status indicators
- Context-sensitive right-click menus

### **File Enhancements**
- LocalPost entity extended with sync metadata
- FileManager enhanced with remote content download
- TreeProvider updated with sync status display

## 📋 **Implementation Approach**

**Follow established patterns:**
- ATDD: User scenario → Failing test → Minimal implementation
- Quality gates: Compile + Test + Lint before/after every change
- Incremental: One feature at a time, test continuously

**Build on Week 1 foundation:**
- Extend existing LocalPost and FileManager
- Enhance existing TreeProvider
- Add to existing command structure

## 🎯 **Week 2 Outcome**

By end of Week 2, users will be able to:
- Download any remote draft for local editing
- See clear sync status for all content
- Edit remote drafts as naturally as local files
- Have confidence their changes won't be lost

This sets up Week 3 for publishing capabilities (upload changes back to micro.blog).
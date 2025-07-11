#!/bin/bash

# Script to open VS Code with the latest development version of the micro.blog extension
# in your test blog folder

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Launching VS Code with Micro.blog Extension (Development)${NC}"
echo ""

# Get the directory where this script is located (extension root)
EXTENSION_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
echo -e "📦 Extension directory: ${GREEN}$EXTENSION_DIR${NC}"

# Default blog folder (can be overridden by passing argument)
BLOG_FOLDER="${1:-/Users/mthompson/Projects/test/my-blog}"
echo -e "📝 Blog folder: ${GREEN}$BLOG_FOLDER${NC}"

# Check if blog folder exists, create if it doesn't
if [ ! -d "$BLOG_FOLDER" ]; then
    echo ""
    echo -e "📁 Blog folder doesn't exist. Creating it..."
    mkdir -p "$BLOG_FOLDER"
    echo -e "${GREEN}✓ Created blog folder${NC}"
fi

# Compile the extension to ensure latest changes are built
echo ""
echo -e "🔨 Compiling extension..."
cd "$EXTENSION_DIR"
npm run compile

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Compilation successful${NC}"
else
    echo -e "❌ Compilation failed. Please fix errors before testing."
    exit 1
fi

# Launch VS Code with the extension in development mode
echo ""
echo -e "🎯 Opening VS Code with extension loaded..."
echo -e "   • Extension (dev): ${EXTENSION_DIR}"
echo -e "   • Workspace: ${BLOG_FOLDER}"
echo ""

# Open VS Code with the extension loaded for the blog folder
code --extensionDevelopmentPath="$EXTENSION_DIR" "$BLOG_FOLDER"

echo -e "${GREEN}✓ VS Code launched!${NC}"
echo ""
echo "💡 Tips:"
echo "   • The extension is loaded from your development folder"
echo "   • Any changes you make to the extension code will be included next time you run this script"
echo "   • Use Cmd+R (Mac) or Ctrl+R (Windows/Linux) to reload the window after making extension changes"
echo "   • Your blog posts will be saved in: $BLOG_FOLDER/content/"
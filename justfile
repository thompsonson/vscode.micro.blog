# Micro.blog VS Code Extension Development

# Default recipe (runs when you type 'just')
@default:
    just --list

# Variables
extension_name := "micro-blog-vscode"
version := `node -p "require('./package.json').version"`
blog_folder := env_var_or_default("BLOG_FOLDER", "/Users/mthompson/Projects/test/my-blog")

# Colors for output (using shell)
green := `echo "\033[0;32m"`
blue := `echo "\033[0;34m"`
yellow := `echo "\033[0;33m"`
reset := `echo "\033[0m"`

# Compile TypeScript
build:
    @echo "{{blue}}🔨 Building extension...{{reset}}"
    npm run compile
    @echo "{{green}}✓ Build complete{{reset}}"

# Run tests
test: build
    @echo "{{blue}}🧪 Running tests...{{reset}}"
    npm test
    @echo "{{green}}✓ Tests complete{{reset}}"

# Run linter
lint:
    @echo "{{blue}}🔍 Linting code...{{reset}}"
    npm run lint
    @echo "{{green}}✓ Linting complete{{reset}}"

# Run all quality checks
check: build test lint
    @echo "{{green}}✅ All checks passed!{{reset}}"

# Watch for changes and rebuild
watch:
    @echo "{{blue}}👀 Watching for changes...{{reset}}"
    npm run watch

# Open VS Code with extension loaded in test blog folder
blog folder=blog_folder:
    @echo "{{blue}}🚀 Launching VS Code with extension (development mode){{reset}}"
    @echo "📦 Extension: {{justfile_directory()}}"
    @echo "📝 Blog folder: {{folder}}"
    @# Create blog folder if it doesn't exist
    @mkdir -p {{folder}}
    @# Compile first
    @just build
    @echo ""
    @echo "{{blue}}Opening VS Code...{{reset}}"
    code --extensionDevelopmentPath="{{justfile_directory()}}" "{{folder}}"
    @echo "{{green}}✓ VS Code launched!{{reset}}"
    @echo ""
    @echo "💡 Tips:"
    @echo "   • Cmd+R to reload window after code changes"
    @echo "   • Blog posts saved in: {{folder}}/content/"

# Quick test with default blog
dev: (blog blog_folder)

# Create and open a new blog folder
new-blog name:
    @echo "{{blue}}📁 Creating new blog: {{name}}{{reset}}"
    @mkdir -p ~/{{name}}-blog
    @just blog ~/{{name}}-blog

# Package extension as VSIX
package: check
    @echo "{{blue}}📦 Packaging extension...{{reset}}"
    npx vsce package
    @echo "{{green}}✓ Created {{extension_name}}-{{version}}.vsix{{reset}}"

# Install packaged extension
install: package
    @echo "{{blue}}🔌 Installing extension...{{reset}}"
    code --install-extension {{extension_name}}-{{version}}.vsix
    @echo "{{green}}✓ Extension installed{{reset}}"

# Clean build artifacts
clean:
    @echo "{{yellow}}🧹 Cleaning build artifacts...{{reset}}"
    rm -rf out/
    rm -f {{extension_name}}-*.vsix
    @echo "{{green}}✓ Clean complete{{reset}}"

# Run quick compile + test
qt: build test
    @echo "{{green}}✓ Quick test complete{{reset}}"

# Show current version
version:
    @echo "{{extension_name}} version {{version}}"

# Update version (example: just bump-version 0.2.0)
bump-version new_version:
    @echo "{{blue}}📝 Updating version to {{new_version}}...{{reset}}"
    npm version {{new_version}} --no-git-tag-version
    @echo "{{green}}✓ Version updated to {{new_version}}{{reset}}"

# Git status check before commit
status:
    @echo "{{blue}}📊 Git status:{{reset}}"
    @git status -s
    @echo ""
    @echo "{{blue}}📝 Recent commits:{{reset}}"
    @git log --oneline -5

# Help for Phase 2 development
phase2-help:
    @echo "{{blue}}📚 Phase 2 Development Commands:{{reset}}"
    @echo ""
    @echo "  {{green}}just dev{{reset}}        - Open test blog with extension"
    @echo "  {{green}}just test{{reset}}       - Run all tests" 
    @echo "  {{green}}just check{{reset}}      - Run all quality checks"
    @echo "  {{green}}just watch{{reset}}      - Watch mode for development"
    @echo "  {{green}}just package{{reset}}    - Create VSIX for distribution"
    @echo ""
    @echo "{{yellow}}Current focus: Local content creation & draft editing{{reset}}"
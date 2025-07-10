# Micro.blog VS Code Extension MVP

A VS Code extension for browsing and viewing micro.blog content using Domain Driven Design principles.

## Features

- **Simplified Configuration**: Single app token input with automatic blog domain discovery
- **Secure Authentication**: Uses VS Code's SecretStorage for secure app token storage  
- **Micropub API Integration**: Fetches content via the standard Micropub API
- **Domain Driven Design**: Clean architecture with separated business logic

## Setup

### Prerequisites

1. A micro.blog account
2. An app token from your micro.blog account (Account → Edit Apps)

### Installation

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run compile` to build the extension
4. Press F5 in VS Code to launch the Extension Development Host

### Configuration

1. In the Extension Development Host, open the Command Palette (Cmd+Shift+P)
2. Run "Configure Micro.blog" command
3. Enter your app token (from Account → Edit Apps → New Token)
4. The extension will validate your credentials, auto-discover your blog domain, and prepare to show your posts

## Architecture

This extension follows Domain Driven Design (DDD) principles within VS Code's standard structure:

```
src/
├── extension.ts              # VS Code entry point (composition root)
├── config/
│   └── constants.ts          # API endpoints, storage keys, timeouts
├── domain/                   # Core business logic
│   ├── Blog.ts              # Blog entity
│   ├── Post.ts              # Post entity  
│   └── Credentials.ts       # Authentication value object
├── services/                # Application services
│   ├── MicroblogService.ts  # Main orchestration
│   └── ApiClient.ts         # Micropub HTTP client
└── providers/               # VS Code integration (planned)
    ├── TreeProvider.ts      # Content tree view (planned)
    └── ContentProvider.ts   # Read-only content viewer (planned)
```

## Testing

- Run `npm test` to execute unit tests
- Tests cover domain logic, API client, and VS Code integration
- Manual testing requires a real micro.blog account

## Development

- `npm run compile` - Compile TypeScript
- `npm run watch` - Watch for changes and recompile
- `npm run lint` - Run ESLint
- `npm test` - Run tests

## Next Steps (Future Phases)

- Content editing capabilities
- Publishing functionality  
- Multi-blog support
- Offline synchronization

## API References

- [Micro.blog API Documentation](https://help.micro.blog/t/api-overview/93)
- [Micropub Specification](https://micropub.spec.indieweb.org/)
- [VS Code Extension API](https://code.visualstudio.com/api)
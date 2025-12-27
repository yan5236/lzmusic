# AGENTS.md

This file provides guidance for agentic coding agents working in this repository.

## Project Overview

Electron + React + TypeScript + Vite desktop music player application. The project uses:
- React 19 with TypeScript for UI
- Electron for desktop functionality
- Tailwind CSS + Material-UI for styling
- better-sqlite3 for local database

## Build & Lint Commands

```bash
# Development
npm run dev                # Start development server (React + Electron)
npm run dev:react          # Start Vite dev server only (port 5238)
npm run dev:dist           # Build and run production Electron app

# Building
npm run build              # Build React UI and Electron main process
npm run build:react        # Build React UI to dist-react/
npm run build:electron     # Build Electron to dist-electron/

# Packaging
npm run dist               # Build and generate platform-specific installer
npm run dist:win           # Generate Windows installer
npm run dist:mac           # Generate macOS installer
npm run dist:linux         # Generate Linux AppImage

# Code Quality
npm run lint               # Run ESLint checks (no fix)
```

**Note:** No test framework is currently configured in this project.

## Code Style Guidelines

### Imports
- Use named imports for React hooks and utilities
- Use `import type` for type-only imports to prevent runtime dependencies
- Use relative paths with `./` or `../` for local imports
- Group imports: React → Third-party → Local → Types

### TypeScript & Types
- Use TypeScript strict mode (already enabled)
- Prefer `interface` for object shapes, `type` for unions/computed types
- Use `as const` for immutable objects/constants
- Add JSDoc comments for non-obvious functions (in Chinese, as per codebase)
- Use `?` for optional fields

### Naming Conventions
- Components: PascalCase (e.g., `BottomPlayer`, `HomeView`)
- Functions: camelCase (e.g., `playSong`, `loadPlaylists`)
- Event handlers: 'handle' prefix (e.g., `handlePlay`, `handleError`)
- State variables: camelCase, descriptive (e.g., `playerState`, `isLoading`)
- Constants/Enums: PascalCase (e.g., `PlaybackMode`, `ViewState`)
- IPC channels: kebab-case with domain prefix (e.g., `app-db-playlist-create`)
- Async functions: load/get/save prefix (e.g., `loadHistory`, `getPlaylists`)

### Error Handling
- Use try-catch for all async operations
- Return structured `{ success, data?, error? }` objects from IPC handlers
- Use `console.error` for error logging with descriptive messages
- Show user-friendly toast messages for UI errors (in Chinese)
- Always clean up in `finally` blocks

### React Component Patterns
- Use functional components with hooks
- Memoize callbacks with `useCallback`
- Use `useRef` for DOM refs and caching values
- Always cleanup subscriptions in `useEffect` return
- Destructure complex state objects for cleaner JSX
- Make callback props optional (`?`) with null checks

### IPC Communication (Electron)
- Use `handle` for request-response patterns (async)
- Use `on` for one-way communication (events)
- Prefix channels with domain: `domain-action` (e.g., `app-db-playlist-create`)
- Always return structured response objects from handlers

### Database Operations
- Use prepared statements for all queries
- Parameterize all user input to prevent SQL injection
- Initialize databases in app ready event
- Close databases in app quit event

### Styling (Tailwind CSS)
- Use Tailwind utility classes for all styling
- Prefer responsive prefixes (`md:`, `lg:`) over media queries
- Use conditional class interpolation for dynamic styles
- Follow the mobile-first approach

### File Organization
```
src/
├── ui/                 # React UI code
│   ├── components/     # Reusable UI components
│   ├── views/          # Page-level components
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # UI utilities
│   └── types.ts        # UI-specific types
├── electron/           # Electron main process
│   ├── api/           # IPC handlers by domain
│   ├── database/      # Database modules
│   ├── ipc/           # IPC utilities
│   └── windows/       # Window management
└── shared/            # Shared types and utilities
```
- Keep UI code in `src/ui/`, Electron code in `src/electron/`
- Shared types in `src/shared/`
- Group by functionality, not file type

### General Practices
1. **Modularity**: Split large files into smaller, focused modules
2. **Comments**: Add JSDoc comments for non-obvious functions and complex logic (in Chinese)
3. **No Unnecessary Changes**: Don't add backup solutions or alternative implementations
4. **Edit Carefully**: Read files before editing, never delete to edit
5. **Type Safety**: Avoid `any` type, use proper TypeScript types
6. **Performance**: Use `useCallback`, `useMemo`, and `useRef` appropriately
7. **Accessibility**: Include proper ARIA labels and semantic HTML

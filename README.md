# GameNexus - Browser Gaming Portal

[![Made with Replit](https://replit.com/badge/v1.svg)](https://replit.com)

## Overview
GameNexus is a gaming website that hosts multiple browser games. Users can browse a game library and play different games directly in their browser.

## Current Features
- **Game Library Homepage**: Browse all available games with beautiful card UI
- **Snake Game**: Classic arcade snake game with keyboard controls
- **Memory Match**: Card matching game to test memory skills
- **3D Platformer**: Jump and collect coins in a 3D environment

## Project Structure
```
client/
├── src/
│   ├── components/ui/     # Reusable UI components (shadcn)
│   ├── hooks/             # Custom React hooks
│   ├── lib/
│   │   ├── stores/        # Zustand state stores
│   │   └── utils.ts       # Utility functions
│   ├── pages/
│   │   ├── games/         # Individual game pages
│   │   │   ├── SnakeGame.tsx
│   │   │   ├── MemoryGame.tsx
│   │   │   └── PlatformerGame.tsx
│   │   ├── HomePage.tsx   # Game library homepage
│   │   └── not-found.tsx
│   ├── App.tsx            # Main app with routing
│   └── main.tsx           # Entry point
├── public/
│   ├── sounds/            # Game audio files
│   └── textures/          # Game textures
server/
├── index.ts               # Express server setup
├── routes.ts              # API routes
└── storage.ts             # Data storage interface
```

## Tech Stack
- **Frontend**: React, React Router, Tailwind CSS
- **3D Graphics**: React Three Fiber, Drei
- **State Management**: Zustand
- **Backend**: Express.js
- **Build**: Vite

## Games

### Snake
- Controls: Arrow keys or WASD
- Press SPACE to pause/resume
- Eat red food to grow and score points
- Avoid walls and your own tail

### Memory Match
- Click cards to flip them
- Find matching pairs
- Complete with fewest moves possible

### 3D Platformer
- Controls: Arrow keys or WASD to move
- SPACE/W/Up to jump
- Collect all golden coins to win
- Don't fall off platforms

## Running Locally
```bash
npm run dev
```
The app runs on port 5000.

## Recent Changes
-March 2026: Project is now on GitHub as well.
- December 2025: Initial release with 3 games
- Game library homepage with responsive design
- High score tracking with localStorage
- Sound effects integration

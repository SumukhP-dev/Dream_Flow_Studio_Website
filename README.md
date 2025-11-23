# Dream Flow Creator Studio

A cross-platform creator studio for AI-generated sleep stories with rich editing, media playback, asset management, and analytics.

## Tech Stack

### Frontend

- **Framework**: Expo + React Native Web
- **Language**: TypeScript
- **UI Library**: React Native Paper
- **State Management**: Zustand + TanStack Query
- **Routing**: Expo Router

### Backend

- **Framework**: Node.js + Express
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT
- **AI Services**: OpenAI GPT-4

## Project Structure

```
.
├── frontend/          # Expo + React Native app
├── backend/           # Node.js + Express API
└── docs/              # Documentation
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or yarn
- Expo CLI (optional)

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

See [frontend/README.md](./frontend/README.md) for more details.

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Update .env with your configuration
npm run db:generate
npm run db:migrate
npm run dev
```

See [backend/README.md](./backend/README.md) for more details.

## Development

1. Start the backend server (port 3000)
2. Start the frontend development server
3. The frontend will connect to the backend API

## Environment Variables

### Frontend (.env)

```
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
```

### Backend (.env)

```
PORT=3000
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
OPENAI_API_KEY=your-openai-key
```

## Features

- ✅ User authentication
- ✅ Story generation with AI
- ✅ Story editor
- ✅ Asset management
- ✅ Analytics dashboard
- 🔄 Video/audio generation (in progress)
- 🔄 Rich text editing (in progress)

## License

MIT

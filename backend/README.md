# Dream Flow Studio - Backend API

Node.js + Express backend API for Dream Flow Creator Studio.

## Tech Stack

- **Framework**: Express.js ~4.18.2
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT
- **API Documentation**: Swagger/OpenAPI

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or yarn

### Installation

```bash
npm install
```

### Environment Setup

1. Copy `.env.example` to `.env`
2. Update environment variables:
   - `DATABASE_URL`: PostgreSQL connection string
   - `JWT_SECRET`: Secret key for JWT tokens
   - `OPENAI_API_KEY`: OpenAI API key for story generation

### Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Open Prisma Studio (optional)
npm run db:studio
```

### Development

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## API Documentation

Once the server is running, visit:
- Swagger UI: http://localhost:3000/api-docs
- Health Check: http://localhost:3000/health

## API Endpoints

### Authentication
- `POST /api/v1/auth/signup` - Register new user
- `POST /api/v1/auth/login` - Login user

### Stories
- `POST /api/v1/story` - Generate new story
- `GET /api/v1/story/history` - Get story history
- `GET /api/v1/story/:id` - Get specific story
- `PUT /api/v1/story/:id` - Update story
- `DELETE /api/v1/story/:id` - Delete story

### Assets
- `GET /api/v1/assets/video/:id` - Get video URL
- `GET /api/v1/assets/audio/:id` - Get audio URL
- `POST /api/v1/assets/upload` - Upload custom asset
- `GET /api/v1/assets` - Get all assets

### Analytics
- `GET /api/v1/analytics` - Get analytics data
- `GET /api/v1/analytics/story/:id` - Get story analytics

## Project Structure

```
src/
  middleware/        # Express middleware
  routes/            # API routes
  services/          # Business logic
  types/             # TypeScript types
prisma/
  schema.prisma      # Database schema
```

## Authentication

All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

Tokens are obtained via `/api/v1/auth/login` or `/api/v1/auth/signup`.



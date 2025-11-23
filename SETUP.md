# Setup Guide

This guide will help you set up the Dream Flow Creator Studio project locally.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (or use Docker Compose)
- npm or yarn package manager
- Git

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Dream_Flow_Studio_Website
```

### 2. Set Up Database (Using Docker Compose)

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Verify containers are running
docker-compose ps
```

The database will be available at:

- Host: `localhost`
- Port: `5432`
- Database: `dreamflow_studio`
- User: `dreamflow`
- Password: `dreamflow`

### 3. Set Up Backend

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env and add your configuration:
# - DATABASE_URL (use: postgresql://dreamflow:dreamflow@localhost:5432/dreamflow_studio)
# - JWT_SECRET (generate a random string)
# - OPENAI_API_KEY (your OpenAI API key)

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

The backend API will be available at `http://localhost:3000`
API documentation: `http://localhost:3000/api-docs`

### 4. Set Up Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
echo "EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1" > .env

# Start development server
npm start
```

Follow the Expo CLI prompts to:

- Press `w` to open in web browser
- Press `i` to open in iOS simulator
- Press `a` to open in Android emulator
- Scan QR code with Expo Go app on your phone

## Manual Database Setup (Without Docker)

If you prefer to set up PostgreSQL manually:

1. Install PostgreSQL
2. Create a database:
   ```sql
   CREATE DATABASE dreamflow_studio;
   ```
3. Update `backend/.env` with your database connection string:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/dreamflow_studio"
   ```

## Environment Variables

### Backend (.env)

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://dreamflow:dreamflow@localhost:5432/dreamflow_studio
JWT_SECRET=your-secret-key-here
OPENAI_API_KEY=your-openai-api-key
```

### Frontend (.env)

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
```

## Troubleshooting

### Database Connection Issues

- Ensure PostgreSQL is running: `docker-compose ps`
- Check database credentials in `.env`
- Verify DATABASE_URL format is correct

### Port Already in Use

- Backend (3000): Change `PORT` in `backend/.env`
- Frontend: Expo will automatically use a different port
- PostgreSQL (5432): Change port mapping in `docker-compose.yml`

### Prisma Issues

```bash
# Reset Prisma client
cd backend
rm -rf node_modules/.prisma
npm run db:generate
```

### Expo Issues

```bash
# Clear Expo cache
cd frontend
npx expo start -c
```

### PowerShell Path Issues

If you get errors like "Cannot find path" when running commands, ensure you're in the workspace directory first:

**For PowerShell:**

```powershell
# Navigate to workspace directory first
cd "C:\Users\sumuk\OneDrive - Georgia Institute of Technology\Projects\Dream_Flow_Studio_Website"

# Then navigate to backend/frontend
cd backend
npm test
```

**Or use a single command:**

```powershell
cd "C:\Users\sumuk\OneDrive - Georgia Institute of Technology\Projects\Dream_Flow_Studio_Website\backend"; npm test
```

**Note:** The workspace path contains spaces, so make sure to use quotes around the path.

## Next Steps

1. Create your first user account via the signup endpoint
2. Generate your first story
3. Explore the API documentation at `/api-docs`
4. Check out the frontend screens

## Development Workflow

1. Start database: `docker-compose up -d`
2. Start backend: `cd backend && npm run dev`
3. Start frontend: `cd frontend && npm start`
4. Make changes and see them hot-reload

## Production Deployment

See individual README files:

- [Backend README](./backend/README.md)
- [Frontend README](./frontend/README.md)

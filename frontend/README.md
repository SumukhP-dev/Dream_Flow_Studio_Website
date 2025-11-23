# Dream Flow Studio - Frontend

React Native + Expo application for Dream Flow Creator Studio.

## Tech Stack

- **Framework**: Expo ~52.0.0
- **Routing**: Expo Router ~4.0.0
- **UI Library**: React Native Paper
- **State Management**: Zustand + TanStack Query
- **Forms**: React Hook Form + Zod
- **API Client**: Axios

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (optional, can use npx)

### Installation

```bash
npm install
```

### Development

```bash
# Start development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on Web
npm run web
```

### Environment Variables

Create a `.env` file in the root directory:

```
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Project Structure

```
app/                    # Expo Router pages
components/             # Reusable components
lib/                    # Business logic
  api/                  # API clients
  services/             # Business services
  hooks/                # Custom hooks
  utils/                # Utilities
constants/              # App constants
```

## Building

### Web

```bash
npm run build:web
```

### Mobile

Use EAS Build:

```bash
eas build --platform ios
eas build --platform android
```



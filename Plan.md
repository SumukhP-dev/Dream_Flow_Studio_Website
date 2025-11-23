# Framework Recommendation: Expo + React Native Web for Dream Flow Creator Studio

## Selected Approach: **Expo + React Native Web** (Single Codebase)

### Why Expo + React Native Web?

1. **Single Codebase**: Share code across web, iOS, and Android
2. **Managed Workflow**: Expo handles native builds, dependencies, and deployment
3. **React Ecosystem**: Leverage React/TypeScript and large component library
4. **Rapid Development**: Expo Go for instant testing, EAS Build for production
5. **Web Support**: React Native Web enables web deployment from same codebase
6. **TypeScript First**: Strong typing for complex creator tool logic

## Project Structure

```
studio_expo/
├── app/                          # Expo Router (file-based routing)
│   ├── (auth)/                   # Auth group
│   │   ├── login.tsx
│   │   └── _layout.tsx
│   ├── (tabs)/                   # Main tabs group
│   │   ├── _layout.tsx           # Tab navigation
│   │   ├── editor.tsx            # Story editor screen
│   │   ├── generator.tsx         # Story generator screen
│   │   ├── preview.tsx           # Preview/playback screen
│   │   ├── library.tsx           # Asset library screen
│   │   └── analytics.tsx         # Analytics dashboard
│   ├── _layout.tsx               # Root layout
│   └── +not-found.tsx            # 404 page
├── components/                   # Shared components
│   ├── ui/                       # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   └── Modal.tsx
│   ├── editor/                   # Editor-specific components
│   │   ├── StoryEditor.tsx
│   │   ├── ThemeSelector.tsx
│   │   ├── ParameterControls.tsx
│   │   └── RichTextEditor.tsx
│   ├── preview/                  # Preview components
│   │   ├── VideoPlayer.tsx
│   │   ├── AudioPlayer.tsx
│   │   └── StoryPreview.tsx
│   └── library/                  # Library components
│       ├── AssetGrid.tsx
│       ├── AssetCard.tsx
│       └── UploadButton.tsx
├── lib/                          # Business logic & utilities
│   ├── api/                      # API clients
│   │   ├── client.ts             # Axios/fetch setup
│   │   ├── story.ts              # Story API endpoints
│   │   ├── assets.ts             # Asset management endpoints
│   │   └── analytics.ts          # Analytics endpoints
│   ├── services/                 # Business logic services
│   │   ├── storyService.ts
│   │   ├── assetService.ts
│   │   └── authService.ts
│   ├── hooks/                    # Custom React hooks
│   │   ├── useStory.ts
│   │   ├── useAssets.ts
│   │   └── useAuth.ts
│   ├── utils/                    # Utility functions
│   │   ├── formatting.ts
│   │   └── validation.ts
│   └── types/                    # TypeScript types
│       ├── story.ts
│       ├── api.ts
│       └── assets.ts
├── constants/                    # App constants
│   ├── Colors.ts
│   ├── Config.ts                 # API URLs, env vars
│   └── Themes.ts
├── app.json                       # Expo configuration
├── package.json
├── tsconfig.json
├── babel.config.js
└── .env                          # Environment variables
```

## Design System & Theme Consistency

### Relationship with Dream Flow AI Consumer App

The Studio app should share a **unified design system** with the Dream Flow AI consumer app while maintaining product-specific adaptations:

**Shared Elements:**

- Brand colors and color palette (defined in `constants/Colors.ts`)
- Typography system (font families, sizes, weights)
- Core UI components (buttons, inputs, cards, modals)
- Icon style and icon library
- Spacing and layout grid system
- Overall visual language and brand identity

**Product-Specific Adaptations:**

- **Studio App**: More functional, data-dense interface optimized for productivity
  - Higher information density
  - Advanced controls and parameter panels
  - Analytics dashboards and data visualization
  - Multi-panel layouts for editing workflows
- **Consumer App**: More immersive, minimal interface optimized for relaxation
  - Lower information density
  - Full-screen story experiences
  - Simplified navigation
  - Focus on content consumption

### Implementation Approach

1. **Shared Design Tokens**: Create a shared design token system (colors, typography, spacing) that both apps reference
2. **Component Library**: Build reusable UI components that can be customized per product
3. **Theme Configuration**: Use `constants/Themes.ts` to define theme variants (studio vs consumer) while maintaining brand consistency
4. **Design Documentation**: Maintain a design system documentation that both products reference

This approach ensures brand consistency while allowing each product to optimize for its specific use case and user needs.

### Design System Capture Prompt

Use the following prompt to document the Dream Flow AI consumer app's design system:

```
Please analyze and document the complete design system and visual theme of the Dream Flow AI consumer app. Provide detailed specifications for:

1. **Color Palette**
   - Primary brand colors (hex codes)
   - Secondary/accent colors
   - Background colors (light/dark modes if applicable)
   - Text colors (primary, secondary, disabled)
   - Border colors
   - Status colors (success, error, warning, info)
   - Any gradients used

2. **Typography**
   - Primary font family and fallbacks
   - Font sizes (heading levels, body, captions, etc.)
   - Font weights (regular, medium, bold, etc.)
   - Line heights
   - Letter spacing
   - Text styles for different contexts (headings, body, labels, etc.)

3. **Spacing & Layout**
   - Base spacing unit (e.g., 4px, 8px grid)
   - Common spacing values (padding, margins)
   - Border radius values
   - Container max-widths
   - Grid system (if used)

4. **UI Components**
   - Button styles (primary, secondary, text, sizes, states)
   - Input field styles (text inputs, selects, checkboxes, etc.)
   - Card/container styles
   - Modal/dialog styles
   - Navigation patterns (tabs, bottom nav, sidebars)
   - Loading states and animations
   - Empty states

5. **Icons & Imagery**
   - Icon style (outlined, filled, custom)
   - Icon size standards
   - Image treatment (rounded corners, aspect ratios)
   - Illustration style (if any)

6. **Visual Effects**
   - Shadow/elevation styles
   - Blur effects
   - Transitions and animations (duration, easing)
   - Hover states
   - Focus states

7. **Brand Identity**
   - Logo usage and variations
   - Brand voice reflected in UI copy
   - Overall mood/aesthetic (calming, minimal, etc.)
   - Visual metaphors or patterns

8. **Platform-Specific Considerations**
   - iOS-specific design patterns
   - Android-specific design patterns
   - Web-specific adaptations
   - Responsive breakpoints (if web)

Please provide this information in a format that can be easily translated into design tokens (TypeScript constants) for implementation in the Studio app.
```

## Key Dependencies

### Core Expo & React Native

```json
{
  "expo": "~52.0.0",
  "expo-router": "~4.0.0",
  "react": "18.3.1",
  "react-native": "0.76.0",
  "react-native-web": "~0.19.0",
  "react-dom": "18.3.1"
}
```

### Navigation & Routing

- `expo-router`: File-based routing (built-in with Expo)
- `@react-navigation/native`: If custom navigation needed

### UI Components

- `react-native-paper` or `native-base`: Component library
- `react-native-vector-icons`: Icons
- `@expo/vector-icons`: Expo icon set

### Editor & Content

- `react-native-quill` or `react-native-rich-text-editor`: Rich text editing
- `react-native-video`: Video playback
- `expo-av`: Audio/video handling
- `react-native-image-picker`: Image selection

### API & State Management

- `axios` or `@tanstack/react-query`: API client & data fetching
- `zustand` or `@reduxjs/toolkit`: State management
- `react-hook-form`: Form handling

### File & Media

- `expo-file-system`: File operations
- `expo-document-picker`: File selection
- `expo-sharing`: Share functionality

### Platform-Specific

- `expo-web-browser`: Web browser integration
- `expo-status-bar`: Status bar control

## Configuration Files

### app.json (Expo Configuration)

```json
{
  "expo": {
    "name": "Dream Flow Studio",
    "slug": "dream-flow-studio",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "scheme": "dreamflowstudio",
    "web": {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/favicon.png"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.dreamflow.studio"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png"
      },
      "package": "com.dreamflow.studio"
    },
    "plugins": ["expo-router"],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

### tsconfig.json

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

### babel.config.js

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: ["react-native-reanimated/plugin", "expo-router/babel"],
  };
};
```

## FastAPI Backend Integration

### API Client Setup (`lib/api/client.ts`)

```typescript
import axios from "axios";
import { Config } from "@/constants/Config";

const apiClient = axios.create({
  baseURL: Config.API_BASE_URL, // From .env
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token interceptor
apiClient.interceptors.request.use((config) => {
  const token = getAuthToken(); // From secure storage
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
```

### Story API (`lib/api/story.ts`)

- `POST /api/v1/story`: Generate new story
- `GET /api/v1/story/history`: Get story history
- `GET /api/v1/story/{id}`: Get specific story
- `PUT /api/v1/story/{id}`: Update story
- `DELETE /api/v1/story/{id}`: Delete story

### Asset API (`lib/api/assets.ts`)

- `GET /api/v1/assets/video/{id}`: Get video URL
- `GET /api/v1/assets/audio/{id}`: Get audio URL
- `POST /api/v1/assets/upload`: Upload custom assets

## Web Deployment

### Static Export (Recommended)

```bash
npx expo export:web
```

Deploys to: Vercel, Netlify, GitHub Pages, or any static host

### Next.js Integration (Optional)

If you need SSR/ISR later, you can wrap the Expo app in Next.js:

- Use `next-transpile-modules` to include React Native Web
- Wrap Expo Router in Next.js pages

## Mobile Deployment

### EAS Build (Expo Application Services)

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

### EAS Submit (App Store Distribution)

```bash
eas submit --platform ios
eas submit --platform android
```

## Platform-Specific Considerations

### Web

- Use `Platform.OS === 'web'` for web-specific code
- Leverage web APIs (localStorage, fetch, etc.)
- Consider PWA capabilities with `expo-web-browser`

### Mobile

- Use Expo APIs for native features (camera, file system)
- Handle deep linking with Expo Router
- Use `expo-status-bar` for status bar styling

### Desktop (Future)

- Electron wrapper: `react-native-electron` or custom Electron setup
- Or use Flutter for desktop-only companion app

## Development Workflow

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Web development
npx expo start --web

# iOS simulator
npx expo start --ios

# Android emulator
npx expo start --android
```

### Environment Variables

Create `.env`:

```
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Access via `process.env.EXPO_PUBLIC_*` (must prefix with `EXPO_PUBLIC_` for client-side)

## Key Implementation Files

### Entry Point (`app/_layout.tsx`)

- Root layout with providers (theme, auth, state management)
- Navigation container setup

### Story Editor (`app/(tabs)/editor.tsx`)

- Rich text editor for story content
- Theme and parameter controls
- Preview integration
- Save/load functionality

### Story Generator (`app/(tabs)/generator.tsx`)

- Form for story generation parameters
- API integration with FastAPI
- Progress tracking for generation
- Result preview

### Preview Screen (`app/(tabs)/preview.tsx`)

- Video/audio player
- Story text display
- Playback controls
- Export/share options

## Integration Points

### FastAPI Backend

- Base URL: `Config.API_BASE_URL` (from environment)
- Authentication: Bearer token in headers
- Endpoints: `/api/v1/story`, `/api/v1/story/history`, etc.

### Supabase (if needed)

- Use `@supabase/supabase-js` for direct database queries
- Or route through FastAPI backend

### Storage

- Local: `expo-file-system` for caching
- Remote: FastAPI asset endpoints
- Cloud: Supabase Storage (if configured)

## Next Steps

1. **Initialize Expo Project**

   - Run `npx create-expo-app studio_expo --template`
   - Configure `app.json` and TypeScript

2. **Set Up Project Structure**

   - Create directory structure as outlined
   - Set up path aliases in `tsconfig.json`

3. **Install Core Dependencies**

   - Install Expo Router and core packages
   - Set up UI component library

4. **Create API Client Layer**

   - Set up axios client with FastAPI integration
   - Create API service files for story, assets, analytics

5. **Build Core Screens**

   - Story editor with rich text editing
   - Story generator with form controls
   - Preview screen with video/audio playback

6. **Add State Management**

   - Set up Zustand or Redux Toolkit
   - Create stores for stories, assets, auth

7. **Configure Web Deployment**

   - Set up static export
   - Configure deployment to Vercel/Netlify

8. **Set Up Mobile Builds**

   - Configure EAS Build
   - Set up app store credentials
   - Create build profiles

## Alternative: Flutter (If Expo Doesn't Meet Needs)

If you need desktop support immediately or prefer Flutter:

- Use Flutter for all platforms (web, mobile, desktop)
- Leverage existing Flutter expertise from consumer app
- Share some UI components between consumer and studio apps

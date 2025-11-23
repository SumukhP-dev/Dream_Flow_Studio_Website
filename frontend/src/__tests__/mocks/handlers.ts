import { http, HttpResponse } from 'msw';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000/api/v1';

export const handlers = [
  // Auth endpoints
  http.post(`${API_BASE_URL}/auth/signup`, async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      success: true,
      user: {
        id: 'test-user-id',
        email: body.email,
        name: body.name || null,
      },
      token: 'mock-jwt-token',
    }, { status: 201 });
  }),

  http.post(`${API_BASE_URL}/auth/login`, async ({ request }) => {
    const body = await request.json() as any;
    if (body.email === 'test@example.com' && body.password === 'password123') {
      return HttpResponse.json({
        success: true,
        user: {
          id: 'test-user-id',
          email: body.email,
          name: 'Test User',
        },
        token: 'mock-jwt-token',
      });
    }
    return HttpResponse.json({
      success: false,
      error: { message: 'Invalid credentials' },
    }, { status: 401 });
  }),

  // Story endpoints
  http.post(`${API_BASE_URL}/story`, async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      success: true,
      story: {
        id: 'test-story-id',
        title: 'Test Story',
        content: 'This is a test story content.',
        theme: body.theme || 'default',
        parameters: body.parameters || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }, { status: 201 });
  }),

  http.get(`${API_BASE_URL}/story/history`, () => {
    return HttpResponse.json({
      success: true,
      stories: [
        {
          id: 'story-1',
          title: 'Story 1',
          content: 'Content 1',
          theme: 'nature',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'story-2',
          title: 'Story 2',
          content: 'Content 2',
          theme: 'fantasy',
          createdAt: new Date().toISOString(),
        },
      ],
    });
  }),

  http.get(`${API_BASE_URL}/story/:id`, ({ params }) => {
    return HttpResponse.json({
      success: true,
      story: {
        id: params.id,
        title: 'Test Story',
        content: 'Test content',
        theme: 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  }),

  http.put(`${API_BASE_URL}/story/:id`, async ({ request, params }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      success: true,
      story: {
        id: params.id,
        ...body,
        updatedAt: new Date().toISOString(),
      },
    });
  }),

  http.delete(`${API_BASE_URL}/story/:id`, () => {
    return HttpResponse.json({
      success: true,
      message: 'Story deleted successfully',
    });
  }),

  // Asset endpoints
  http.get(`${API_BASE_URL}/assets`, () => {
    return HttpResponse.json({
      success: true,
      assets: [],
      pagination: {
        total: 0,
        limit: 50,
        offset: 0,
      },
    });
  }),

  http.post(`${API_BASE_URL}/assets/upload`, async ({ request }) => {
    return HttpResponse.json({
      success: true,
      asset: {
        id: 'test-asset-id',
        type: 'image',
        url: 'https://example.com/test-asset.jpg',
        name: 'test.jpg',
        size: 1024,
        createdAt: new Date().toISOString(),
      },
    }, { status: 201 });
  }),

  // Analytics endpoints
  http.get(`${API_BASE_URL}/analytics`, () => {
    return HttpResponse.json({
      success: true,
      analytics: {
        totalStories: 10,
        totalViews: 100,
        averageGenerationTime: 5.5,
        popularThemes: ['nature', 'fantasy'],
        usageByDate: [],
      },
    });
  }),
];


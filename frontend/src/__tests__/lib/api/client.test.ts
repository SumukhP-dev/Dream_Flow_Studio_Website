import apiClient from '@/lib/api/client';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000/api/v1';

describe('API Client', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('should add auth token to requests', async () => {
    await AsyncStorage.setItem('auth_token', 'test-token');

    let requestHeaders: any = {};
    server.use(
      http.get(`${API_BASE_URL}/test`, ({ request }) => {
        requestHeaders = Object.fromEntries(request.headers.entries());
        return HttpResponse.json({ success: true });
      })
    );

    await apiClient.get('/test');
    expect(requestHeaders.authorization).toBe('Bearer test-token');
  });

  it('should handle 401 errors by clearing token', async () => {
    await AsyncStorage.setItem('auth_token', 'invalid-token');

    server.use(
      http.get(`${API_BASE_URL}/test`, () => {
        return HttpResponse.json(
          { success: false, error: { message: 'Unauthorized' } },
          { status: 401 }
        );
      })
    );

    try {
      await apiClient.get('/test');
    } catch (error) {
      // Expected to throw
    }

    const token = await AsyncStorage.getItem('auth_token');
    expect(token).toBeNull();
  });
});


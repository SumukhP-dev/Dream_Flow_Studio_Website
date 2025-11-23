import { exportStory, ExportFormat } from '../../services/exportService';
import { Story } from '@prisma/client';

describe('ExportService', () => {
  const mockStory: Story = {
    id: 'test-story-id',
    userId: 'test-user-id',
    title: 'Test Story',
    content: '<p>This is a <strong>test</strong> story with <em>formatting</em>.</p><p>Second paragraph.</p>',
    theme: 'calming',
    parameters: { tone: 'peaceful', length: 'medium' },
    videoUrl: 'https://storage.example.com/video.mp4',
    audioUrl: 'https://storage.example.com/audio.mp3',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-02T00:00:00Z'),
  };

  describe('PDF Export', () => {
    it('should export story to PDF format', async () => {
      const result = await exportStory(mockStory, 'pdf', {
        includeMetadata: true,
        includeMediaLinks: true,
      });

      expect(result).toBeInstanceOf(Buffer);
      expect((result as Buffer).length).toBeGreaterThan(0);
    });

    it('should include metadata when requested', async () => {
      const result = await exportStory(mockStory, 'pdf', {
        includeMetadata: true,
        includeMediaLinks: false,
      });

      expect(result).toBeInstanceOf(Buffer);
      // PDF should contain title and metadata
      const pdfText = (result as Buffer).toString('utf-8');
      expect(pdfText).toContain('Test Story');
    });

    it('should include media links when requested', async () => {
      const result = await exportStory(mockStory, 'pdf', {
        includeMetadata: false,
        includeMediaLinks: true,
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle stories without media', async () => {
      const storyWithoutMedia = { ...mockStory, videoUrl: null, audioUrl: null };
      const result = await exportStory(storyWithoutMedia, 'pdf', {
        includeMediaLinks: true,
      });

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle HTML content correctly', async () => {
      const result = await exportStory(mockStory, 'pdf', {});
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('Markdown Export', () => {
    it('should export story to Markdown format', async () => {
      const result = await exportStory(mockStory, 'markdown', {
        includeMetadata: true,
        includeMediaLinks: true,
      });

      expect(typeof result).toBe('string');
      expect(result).toContain('# Test Story');
      expect(result).toContain('**Theme:**');
    });

    it('should convert HTML to Markdown', async () => {
      const result = await exportStory(mockStory, 'markdown', {}) as string;

      expect(result).toContain('**test**'); // <strong> converted
      expect(result).toContain('*formatting*'); // <em> converted
    });

    it('should include metadata when requested', async () => {
      const result = await exportStory(mockStory, 'markdown', {
        includeMetadata: true,
      }) as string;

      expect(result).toContain('**Theme:** calming');
      expect(result).toContain('**Created:**');
    });

    it('should include media links when requested', async () => {
      const result = await exportStory(mockStory, 'markdown', {
        includeMediaLinks: true,
      }) as string;

      expect(result).toContain('[Video]');
      expect(result).toContain('[Audio]');
    });

    it('should handle long content', async () => {
      const longContent = '<p>' + 'Lorem ipsum. '.repeat(100) + '</p>';
      const longStory = { ...mockStory, content: longContent };
      const result = await exportStory(longStory, 'markdown', {});

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(1000);
    });
  });

  describe('JSON Export', () => {
    it('should export story to JSON format', async () => {
      const result = await exportStory(mockStory, 'json', {
        includeMetadata: true,
        includeMediaLinks: true,
      });

      expect(typeof result).toBe('string');
      const parsed = JSON.parse(result as string);
      expect(parsed.title).toBe('Test Story');
      expect(parsed.theme).toBe('calming');
    });

    it('should include all story data', async () => {
      const result = await exportStory(mockStory, 'json', {}) as string;
      const parsed = JSON.parse(result);

      expect(parsed).toHaveProperty('title');
      expect(parsed).toHaveProperty('content');
      expect(parsed).toHaveProperty('theme');
      expect(parsed).toHaveProperty('parameters');
      expect(parsed).toHaveProperty('createdAt');
      expect(parsed).toHaveProperty('updatedAt');
    });

    it('should include metadata when requested', async () => {
      const result = await exportStory(mockStory, 'json', {
        includeMetadata: true,
      }) as string;
      const parsed = JSON.parse(result);

      expect(parsed.metadata).toBeDefined();
      expect(parsed.metadata.id).toBe('test-story-id');
      expect(parsed.metadata.userId).toBe('test-user-id');
    });

    it('should include media links when requested', async () => {
      const result = await exportStory(mockStory, 'json', {
        includeMediaLinks: true,
      }) as string;
      const parsed = JSON.parse(result);

      expect(parsed.videoUrl).toBe('https://storage.example.com/video.mp4');
      expect(parsed.audioUrl).toBe('https://storage.example.com/audio.mp3');
    });

    it('should not include media links when not requested', async () => {
      const result = await exportStory(mockStory, 'json', {
        includeMediaLinks: false,
      }) as string;
      const parsed = JSON.parse(result);

      expect(parsed.videoUrl).toBeUndefined();
      expect(parsed.audioUrl).toBeUndefined();
    });

    it('should handle pending media status', async () => {
      const storyWithPending = {
        ...mockStory,
        videoUrl: 'pending',
        audioUrl: 'processing',
      };
      const result = await exportStory(storyWithPending, 'json', {
        includeMediaLinks: true,
      }) as string;
      const parsed = JSON.parse(result);

      // Should not include pending/processing URLs
      expect(parsed.videoUrl).toBeUndefined();
      expect(parsed.audioUrl).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unsupported format', async () => {
      await expect(
        exportStory(mockStory, 'invalid' as ExportFormat, {})
      ).rejects.toThrow('Unsupported export format');
    });

    it('should handle empty content', async () => {
      const emptyStory = { ...mockStory, content: '' };
      const result = await exportStory(emptyStory, 'json', {});
      expect(typeof result).toBe('string');
    });

    it('should handle special characters in content', async () => {
      const specialStory = {
        ...mockStory,
        content: '<p>Special chars: &amp; &lt; &gt; &quot; &#39;</p>',
      };
      const result = await exportStory(specialStory, 'markdown', {}) as string;
      expect(result).toContain('&');
      expect(result).toContain('<');
      expect(result).toContain('>');
    });
  });
});


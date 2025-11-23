import PDFDocument from 'pdfkit';
import { Story } from '@prisma/client';

export type ExportFormat = 'pdf' | 'markdown' | 'json';

export interface ExportOptions {
  includeMetadata?: boolean;
  includeMediaLinks?: boolean;
}

/**
 * Export a story to the specified format
 */
export async function exportStory(
  story: Story,
  format: ExportFormat,
  options: ExportOptions = {}
): Promise<Buffer | string> {
  switch (format) {
    case 'pdf':
      return exportToPDF(story, options);
    case 'markdown':
      return exportToMarkdown(story, options);
    case 'json':
      return exportToJSON(story, options);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Export story to PDF format
 */
function exportToPDF(story: Story, options: ExportOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Title
      doc.fontSize(24).font('Helvetica-Bold').text(story.title, { align: 'center' });
      doc.moveDown();

      // Metadata (if requested)
      if (options.includeMetadata) {
        doc.fontSize(10).font('Helvetica').fillColor('gray');
        doc.text(`Theme: ${story.theme}`, { align: 'left' });
        doc.text(`Created: ${new Date(story.createdAt).toLocaleDateString()}`, { align: 'left' });
        if (story.updatedAt && story.updatedAt !== story.createdAt) {
          doc.text(`Updated: ${new Date(story.updatedAt).toLocaleDateString()}`, { align: 'left' });
        }
        doc.moveDown();
        doc.fillColor('black');
      }

      // Media links (if requested and available)
      if (options.includeMediaLinks) {
        if (story.videoUrl && story.videoUrl !== 'pending') {
          doc.fontSize(10).font('Helvetica').fillColor('blue');
          doc.text(`Video: ${story.videoUrl}`, { link: story.videoUrl });
        }
        if (story.audioUrl && story.audioUrl !== 'pending') {
          doc.fontSize(10).font('Helvetica').fillColor('blue');
          doc.text(`Audio: ${story.audioUrl}`, { link: story.audioUrl });
        }
        if (story.videoUrl || story.audioUrl) {
          doc.moveDown();
          doc.fillColor('black');
        }
      }

      // Content
      doc.fontSize(12).font('Helvetica');
      
      // Remove HTML tags and convert to plain text for PDF
      const plainText = story.content
        .replace(/<[^>]+>/g, '') // Remove HTML tags
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      // Split into paragraphs and add to PDF
      const paragraphs = plainText.split(/\n\s*\n/).filter(p => p.trim());
      paragraphs.forEach((paragraph, index) => {
        if (index > 0) doc.moveDown();
        doc.text(paragraph.trim(), {
          align: 'left',
          lineGap: 5,
        });
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Export story to Markdown format
 */
function exportToMarkdown(story: Story, options: ExportOptions): string {
  let markdown = `# ${story.title}\n\n`;

  // Metadata (if requested)
  if (options.includeMetadata) {
    markdown += `**Theme:** ${story.theme}\n`;
    markdown += `**Created:** ${new Date(story.createdAt).toLocaleDateString()}\n`;
    if (story.updatedAt && story.updatedAt !== story.createdAt) {
      markdown += `**Updated:** ${new Date(story.updatedAt).toLocaleDateString()}\n`;
    }
    markdown += '\n';
  }

  // Media links (if requested and available)
  if (options.includeMediaLinks) {
    if (story.videoUrl && story.videoUrl !== 'pending') {
      markdown += `[Video](${story.videoUrl})\n\n`;
    }
    if (story.audioUrl && story.audioUrl !== 'pending') {
      markdown += `[Audio](${story.audioUrl})\n\n`;
    }
  }

  // Content - convert HTML to markdown where possible
  let content = story.content
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '') // Remove remaining HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Clean up extra newlines
  content = content.replace(/\n{3,}/g, '\n\n').trim();

  markdown += content + '\n';

  return markdown;
}

/**
 * Export story to JSON format
 */
function exportToJSON(story: Story, options: ExportOptions): string {
  const exportData: any = {
    title: story.title,
    content: story.content,
    theme: story.theme,
    parameters: story.parameters,
    createdAt: story.createdAt.toISOString(),
    updatedAt: story.updatedAt.toISOString(),
  };

  if (options.includeMediaLinks) {
    if (story.videoUrl && story.videoUrl !== 'pending') {
      exportData.videoUrl = story.videoUrl;
    }
    if (story.audioUrl && story.audioUrl !== 'pending') {
      exportData.audioUrl = story.audioUrl;
    }
  }

  if (options.includeMetadata) {
    exportData.metadata = {
      id: story.id,
      userId: story.userId,
      createdAt: story.createdAt.toISOString(),
      updatedAt: story.updatedAt.toISOString(),
    };
  }

  return JSON.stringify(exportData, null, 2);
}


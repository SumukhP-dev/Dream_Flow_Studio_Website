import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { Colors } from '@/constants/Colors';

export interface MarkdownPreviewProps {
  content: string;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content }) => {
  if (!content.trim()) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyText}>
          {/* Empty state */}
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Markdown
        style={{
          body: styles.markdownBody,
          heading1: styles.heading1,
          heading2: styles.heading2,
          heading3: styles.heading3,
          paragraph: styles.paragraph,
          strong: styles.strong,
          em: styles.em,
          list_item: styles.listItem,
          bullet_list: styles.bulletList,
        }}
      >
        {content}
      </Markdown>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  content: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
  },
  emptyText: {
    color: Colors.text.tertiary,
  },
  markdownBody: {
    color: Colors.text.primary,
    fontFamily: 'System',
  },
  heading1: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  heading2: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  heading3: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 12,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.text.secondary,
    marginBottom: 12,
  },
  strong: {
    fontWeight: '700',
    color: Colors.text.primary,
  },
  em: {
    fontStyle: 'italic',
    color: Colors.text.secondary,
  },
  listItem: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  bulletList: {
    marginBottom: 12,
  },
});


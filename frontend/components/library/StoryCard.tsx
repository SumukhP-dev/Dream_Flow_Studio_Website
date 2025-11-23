import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Story } from '@/lib/api/story';
import { MediaStatusIndicator, MediaStatus } from '@/components/media/MediaStatusIndicator';

interface StoryCardProps {
  story: Story;
  onPress: () => void;
  onEdit?: () => void;
  onExport?: () => void;
  onDelete?: () => void;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  viewMode?: 'grid' | 'list';
}

export const StoryCard: React.FC<StoryCardProps> = ({
  story,
  onPress,
  onEdit,
  onExport,
  onDelete,
  selected = false,
  onSelect,
  viewMode = 'grid',
}) => {
  const getVideoStatus = (): MediaStatus => {
    if (!story.videoUrl) return 'pending';
    if (story.videoUrl === 'pending') return 'pending';
    if (story.videoUrl === 'processing') return 'processing';
    if (story.videoUrl === 'failed') return 'failed';
    return 'completed';
  };

  const getAudioStatus = (): MediaStatus => {
    if (!story.audioUrl) return 'pending';
    if (story.audioUrl === 'pending') return 'pending';
    if (story.audioUrl === 'processing') return 'processing';
    if (story.audioUrl === 'failed') return 'failed';
    return 'completed';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const preview = story.content.substring(0, 100).replace(/<[^>]+>/g, '') + '...';

  if (viewMode === 'list') {
    return (
      <TouchableOpacity
        style={[styles.listCard, selected && styles.selectedCard]}
        onPress={onPress}
        onLongPress={() => onSelect?.(!selected)}
      >
        {onSelect && (
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => onSelect(!selected)}
          >
            <MaterialCommunityIcons
              name={selected ? 'checkbox-marked' : 'checkbox-blank-outline'}
              size={24}
              color={selected ? Colors.primary.purple : Colors.text.tertiary}
            />
          </TouchableOpacity>
        )}
        <View style={styles.listContent}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle} numberOfLines={1}>
              {story.title}
            </Text>
            <View style={styles.listActions}>
              {onEdit && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                >
                  <MaterialCommunityIcons
                    name="pencil"
                    size={18}
                    color={Colors.text.secondary}
                  />
                </TouchableOpacity>
              )}
              {onExport && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    onExport();
                  }}
                >
                  <MaterialCommunityIcons
                    name="download"
                    size={18}
                    color={Colors.text.secondary}
                  />
                </TouchableOpacity>
              )}
              {onDelete && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  <MaterialCommunityIcons
                    name="delete"
                    size={18}
                    color={Colors.status.error}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
          <Text style={styles.listPreview} numberOfLines={2}>
            {preview}
          </Text>
          <View style={styles.listFooter}>
            <View style={styles.listMeta}>
              <Text style={styles.listTheme}>{story.theme}</Text>
              <Text style={styles.listDate}>{formatDate(story.createdAt)}</Text>
            </View>
            <View style={styles.listMediaStatus}>
              <MediaStatusIndicator
                type="video"
                status={getVideoStatus()}
                url={story.videoUrl || undefined}
              />
              <MediaStatusIndicator
                type="audio"
                status={getAudioStatus()}
                url={story.audioUrl || undefined}
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Grid view
  return (
    <View style={styles.gridCardWrapper}>
      <TouchableOpacity
        style={[styles.gridCard, selected && styles.selectedCard]}
        onPress={onPress}
        onLongPress={() => onSelect?.(!selected)}
      >
      {onSelect && (
        <View style={styles.gridCheckbox}>
          <MaterialCommunityIcons
            name={selected ? 'checkbox-marked' : 'checkbox-blank-outline'}
            size={20}
            color={selected ? Colors.primary.purple : Colors.text.tertiary}
          />
        </View>
      )}
      <View style={styles.gridHeader}>
        <Text style={styles.gridTitle} numberOfLines={2}>
          {story.title}
        </Text>
        <View style={styles.gridActions}>
          {onEdit && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <MaterialCommunityIcons
                name="pencil"
                size={16}
                color={Colors.text.secondary}
              />
            </TouchableOpacity>
          )}
          {onExport && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                onExport();
              }}
            >
              <MaterialCommunityIcons
                name="download"
                size={16}
                color={Colors.text.secondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <Text style={styles.gridPreview} numberOfLines={3}>
        {preview}
      </Text>
      <View style={styles.gridFooter}>
        <Text style={styles.gridTheme}>{story.theme}</Text>
        <Text style={styles.gridDate}>{formatDate(story.createdAt)}</Text>
      </View>
      <View style={styles.gridMediaIcons}>
        {story.videoUrl && story.videoUrl !== 'pending' && story.videoUrl !== 'processing' && story.videoUrl !== 'failed' && (
          <MaterialCommunityIcons
            name="video"
            size={16}
            color={Colors.status.success}
          />
        )}
        {story.audioUrl && story.audioUrl !== 'pending' && story.audioUrl !== 'processing' && story.audioUrl !== 'failed' && (
          <MaterialCommunityIcons
            name="music"
            size={16}
            color={Colors.status.success}
          />
        )}
      </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  gridCardWrapper: {
    width: '48%',
    marginBottom: 16,
  },
  gridCard: {
    backgroundColor: Colors.background.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 200,
  },
  selectedCard: {
    borderColor: Colors.primary.purple,
    backgroundColor: Colors.primary.purple + '10',
  },
  gridCheckbox: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
  },
  gridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  gridTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
    marginRight: 8,
  },
  gridActions: {
    flexDirection: 'row',
    gap: 4,
  },
  gridPreview: {
    fontSize: 12,
    color: Colors.text.tertiary,
    marginBottom: 12,
    lineHeight: 18,
  },
  gridFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gridTheme: {
    fontSize: 11,
    color: Colors.primary.purple,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  gridDate: {
    fontSize: 11,
    color: Colors.text.tertiary,
  },
  gridMediaIcons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  listCard: {
    backgroundColor: Colors.background.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    flexDirection: 'row',
  },
  checkbox: {
    marginRight: 12,
    marginTop: 4,
  },
  listContent: {
    flex: 1,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
  },
  listActions: {
    flexDirection: 'row',
    gap: 8,
  },
  listPreview: {
    fontSize: 13,
    color: Colors.text.tertiary,
    marginBottom: 12,
    lineHeight: 20,
  },
  listFooter: {
    gap: 8,
  },
  listMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listTheme: {
    fontSize: 12,
    color: Colors.primary.purple,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  listDate: {
    fontSize: 12,
    color: Colors.text.tertiary,
  },
  listMediaStatus: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
});


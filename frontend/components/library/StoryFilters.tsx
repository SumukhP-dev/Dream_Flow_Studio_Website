import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

export interface FilterOptions {
  theme?: string;
  hasVideo?: boolean;
  hasAudio?: boolean;
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

interface StoryFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  availableThemes: string[];
  visible: boolean;
  onClose: () => void;
}

export const StoryFilters: React.FC<StoryFiltersProps> = ({
  filters,
  onFiltersChange,
  availableThemes,
  visible,
  onClose,
}) => {
  const [localFilters, setLocalFilters] = useState<FilterOptions>(filters);

  const applyFilters = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const clearFilters = () => {
    const cleared: FilterOptions = {};
    setLocalFilters(cleared);
    onFiltersChange(cleared);
    onClose();
  };

  if (!visible) return null;

  const themes = ['nature', 'fantasy', 'calming', 'adventure', 'meditation', ...availableThemes.filter(t => !['nature', 'fantasy', 'calming', 'adventure', 'meditation'].includes(t))];

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Filters</Text>
          <TouchableOpacity onPress={onClose}>
            <MaterialCommunityIcons name="close" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Theme Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Theme</Text>
            <View style={styles.themeList}>
              <TouchableOpacity
                style={[
                  styles.themeChip,
                  !localFilters.theme && styles.themeChipActive,
                ]}
                onPress={() =>
                  setLocalFilters({ ...localFilters, theme: undefined })
                }
              >
                <Text
                  style={[
                    styles.themeChipText,
                    !localFilters.theme && styles.themeChipTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              {themes.map((theme) => (
                <TouchableOpacity
                  key={theme}
                  style={[
                    styles.themeChip,
                    localFilters.theme === theme && styles.themeChipActive,
                  ]}
                  onPress={() =>
                    setLocalFilters({ ...localFilters, theme })
                  }
                >
                  <Text
                    style={[
                      styles.themeChipText,
                      localFilters.theme === theme && styles.themeChipTextActive,
                    ]}
                  >
                    {theme}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Media Filters */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Media</Text>
            <TouchableOpacity
              style={styles.filterOption}
              onPress={() =>
                setLocalFilters({
                  ...localFilters,
                  hasVideo: localFilters.hasVideo === true ? undefined : true,
                })
              }
            >
              <MaterialCommunityIcons
                name={localFilters.hasVideo ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={20}
                color={localFilters.hasVideo ? Colors.primary.purple : Colors.text.tertiary}
              />
              <Text style={styles.filterOptionText}>Has Video</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterOption}
              onPress={() =>
                setLocalFilters({
                  ...localFilters,
                  hasAudio: localFilters.hasAudio === true ? undefined : true,
                })
              }
            >
              <MaterialCommunityIcons
                name={localFilters.hasAudio ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={20}
                color={localFilters.hasAudio ? Colors.primary.purple : Colors.text.tertiary}
              />
              <Text style={styles.filterOptionText}>Has Audio</Text>
            </TouchableOpacity>
          </View>

          {/* Sort Options */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sort By</Text>
            <View style={styles.sortOptions}>
              {(['createdAt', 'updatedAt', 'title'] as const).map((sortBy) => (
                <TouchableOpacity
                  key={sortBy}
                  style={[
                    styles.sortOption,
                    localFilters.sortBy === sortBy && styles.sortOptionActive,
                  ]}
                  onPress={() =>
                    setLocalFilters({ ...localFilters, sortBy })
                  }
                >
                  <Text
                    style={[
                      styles.sortOptionText,
                      localFilters.sortBy === sortBy && styles.sortOptionTextActive,
                    ]}
                  >
                    {sortBy === 'createdAt' ? 'Date Created' : sortBy === 'updatedAt' ? 'Last Updated' : 'Title'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.sortOrder}>
              <TouchableOpacity
                style={[
                  styles.sortOrderButton,
                  localFilters.sortOrder === 'asc' && styles.sortOrderButtonActive,
                ]}
                onPress={() =>
                  setLocalFilters({ ...localFilters, sortOrder: 'asc' })
                }
              >
                <MaterialCommunityIcons
                  name="arrow-up"
                  size={16}
                  color={localFilters.sortOrder === 'asc' ? Colors.primary.purple : Colors.text.tertiary}
                />
                <Text
                  style={[
                    styles.sortOrderText,
                    localFilters.sortOrder === 'asc' && styles.sortOrderTextActive,
                  ]}
                >
                  Ascending
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sortOrderButton,
                  localFilters.sortOrder === 'desc' && styles.sortOrderButtonActive,
                ]}
                onPress={() =>
                  setLocalFilters({ ...localFilters, sortOrder: 'desc' })
                }
              >
                <MaterialCommunityIcons
                  name="arrow-down"
                  size={16}
                  color={localFilters.sortOrder === 'desc' ? Colors.primary.purple : Colors.text.tertiary}
                />
                <Text
                  style={[
                    styles.sortOrderText,
                    localFilters.sortOrder === 'desc' && styles.sortOrderTextActive,
                  ]}
                >
                  Descending
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
            <Text style={styles.applyButtonText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  container: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '80%',
    maxWidth: 320,
    backgroundColor: Colors.background.surface,
    borderLeftWidth: 1,
    borderLeftColor: Colors.border.subtle,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  themeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  themeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.background.glass,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  themeChipActive: {
    backgroundColor: Colors.primary.purple + '20',
    borderColor: Colors.primary.purple,
  },
  themeChipText: {
    fontSize: 12,
    color: Colors.text.tertiary,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  themeChipTextActive: {
    color: Colors.primary.purple,
    fontWeight: '600',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  filterOptionText: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  sortOptions: {
    gap: 8,
    marginBottom: 12,
  },
  sortOption: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: Colors.background.glass,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sortOptionActive: {
    backgroundColor: Colors.primary.purple + '20',
    borderColor: Colors.primary.purple,
  },
  sortOptionText: {
    fontSize: 14,
    color: Colors.text.tertiary,
  },
  sortOptionTextActive: {
    color: Colors.primary.purple,
    fontWeight: '600',
  },
  sortOrder: {
    flexDirection: 'row',
    gap: 8,
  },
  sortOrderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: Colors.background.glass,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 6,
  },
  sortOrderButtonActive: {
    backgroundColor: Colors.primary.purple + '20',
    borderColor: Colors.primary.purple,
  },
  sortOrderText: {
    fontSize: 12,
    color: Colors.text.tertiary,
  },
  sortOrderTextActive: {
    color: Colors.primary.purple,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border.subtle,
    gap: 12,
  },
  clearButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: Colors.background.glass,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: Colors.primary.purple,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '600',
  },
});


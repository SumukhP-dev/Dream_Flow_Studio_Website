import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Colors } from "@/constants/Colors";
import { StoryCard } from "@/components/library/StoryCard";
import { StoryFilters, FilterOptions } from "@/components/library/StoryFilters";
import { StorySearch } from "@/components/library/StorySearch";
import { storyApi, Story } from "@/lib/api/story";
import { ExportModal } from "@/components/export/ExportModal";
import { HelpTooltip } from "@/components/help/HelpTooltip";

type ViewMode = "grid" | "list";

export default function LibraryScreen() {
  const router = useRouter();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [selectedStories, setSelectedStories] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<FilterOptions>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportStoryId, setExportStoryId] = useState<string | null>(null);
  const [exportStoryTitle, setExportStoryTitle] = useState("");

  // Load stories
  const loadStories = useCallback(async (page = 1, reset = false) => {
    if (reset) {
      setLoading(true);
    }

    try {
      const result = await storyApi.getHistory({
        page,
        limit: pagination.limit,
        ...filters,
        search: searchQuery || undefined,
      });

      if (reset) {
        setStories(result.stories);
      } else {
        setStories((prev) => [...prev, ...result.stories]);
      }
      setPagination(result.pagination);
    } catch (error) {
      console.error("Failed to load stories:", error);
      Alert.alert("Error", "Failed to load stories");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, searchQuery, pagination.limit]);

  useEffect(() => {
    loadStories(1, true);
  }, [filters, searchQuery]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadStories(1, true);
  };

  const handleLoadMore = () => {
    if (pagination.page < pagination.totalPages && !loading) {
      loadStories(pagination.page + 1, false);
    }
  };

  const handleStoryPress = (story: Story) => {
    router.push({
      pathname: "/editor",
      params: { storyId: story.id },
    });
  };

  const handleEdit = (story: Story) => {
    router.push({
      pathname: "/editor",
      params: { storyId: story.id },
    });
  };

  const handleExport = (story: Story) => {
    setExportStoryId(story.id);
    setExportStoryTitle(story.title);
    setExportModalVisible(true);
  };

  const handleDelete = (story: Story) => {
    Alert.alert(
      "Delete Story",
      `Are you sure you want to delete "${story.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await storyApi.delete(story.id);
              loadStories(1, true);
              setSelectedStories(new Set());
            } catch (error) {
              Alert.alert("Error", "Failed to delete story");
            }
          },
        },
      ]
    );
  };

  const handleBulkDelete = () => {
    if (selectedStories.size === 0) return;

    Alert.alert(
      "Delete Stories",
      `Are you sure you want to delete ${selectedStories.size} story/stories?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await Promise.all(
                Array.from(selectedStories).map((id) => storyApi.delete(id))
              );
              loadStories(1, true);
              setSelectedStories(new Set());
            } catch (error) {
              Alert.alert("Error", "Failed to delete some stories");
            }
          },
        },
      ]
    );
  };

  const handleBulkExport = () => {
    if (selectedStories.size === 0) return;
    Alert.alert(
      "Export Stories",
      `Export ${selectedStories.size} story/stories? This feature will be available soon.`
    );
  };

  const toggleSelection = (storyId: string) => {
    const newSelected = new Set(selectedStories);
    if (newSelected.has(storyId)) {
      newSelected.delete(storyId);
    } else {
      newSelected.add(storyId);
    }
    setSelectedStories(newSelected);
  };

  const selectAll = () => {
    if (selectedStories.size === stories.length) {
      setSelectedStories(new Set());
    } else {
      setSelectedStories(new Set(stories.map((s) => s.id)));
    }
  };

  const availableThemes = Array.from(
    new Set(stories.map((s) => s.theme))
  ).sort();

  if (loading && stories.length === 0) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary.purple} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Story Library</Text>
          <View style={styles.headerActions}>
            <View style={styles.headerButtonContainer}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setFiltersVisible(!filtersVisible)}
              >
                <MaterialCommunityIcons
                  name="filter"
                  size={20}
                  color={filtersVisible ? Colors.primary.purple : Colors.text.secondary}
                />
              </TouchableOpacity>
              <HelpTooltip
                text="Filter stories by theme, media presence (video/audio), and sort by date or title. Use filters to quickly find specific stories in your library."
                title="Filters"
              />
            </View>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() =>
                setViewMode(viewMode === "grid" ? "list" : "grid")
              }
            >
              <MaterialCommunityIcons
                name={viewMode === "grid" ? "view-list" : "view-grid"}
                size={20}
                color={Colors.text.secondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={styles.searchRow}>
            <View style={styles.searchInputContainer}>
              <StorySearch value={searchQuery} onChange={setSearchQuery} />
            </View>
            <HelpTooltip
              text="Search stories by title or content. The search is case-insensitive and searches both title and story content. Use keywords to quickly find specific stories."
              title="Search"
            />
          </View>
        </View>

        {/* Bulk Actions */}
        {selectedStories.size > 0 && (
          <View style={styles.bulkActions}>
            <TouchableOpacity
              style={styles.bulkActionButton}
              onPress={selectAll}
            >
              <Text style={styles.bulkActionText}>
                {selectedStories.size === stories.length
                  ? "Deselect All"
                  : "Select All"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bulkActionButton}
              onPress={handleBulkExport}
            >
              <MaterialCommunityIcons
                name="download"
                size={16}
                color={Colors.primary.purple}
              />
              <Text style={styles.bulkActionText}>Export</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkActionButton, styles.bulkActionButtonDanger]}
              onPress={handleBulkDelete}
            >
              <MaterialCommunityIcons
                name="delete"
                size={16}
                color={Colors.status.error}
              />
              <Text
                style={[
                  styles.bulkActionText,
                  styles.bulkActionTextDanger,
                ]}
              >
                Delete
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bulkActionButton}
              onPress={() => setSelectedStories(new Set())}
            >
              <Text style={styles.bulkActionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Stories List/Grid */}
      {stories.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="book-open-variant"
            size={64}
            color={Colors.text.tertiary}
          />
          <Text style={styles.emptyText}>No stories found</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery || Object.keys(filters).length > 0
              ? "Try adjusting your filters or search"
              : "Create your first story using the generator"}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            viewMode === "grid" && styles.gridContainer,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary.purple}
            />
          }
          onScrollEndDrag={handleLoadMore}
        >
          {stories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              viewMode={viewMode}
              selected={selectedStories.has(story.id)}
              onSelect={(selected) =>
                selected
                  ? toggleSelection(story.id)
                  : setSelectedStories((prev) => {
                      const next = new Set(prev);
                      next.delete(story.id);
                      return next;
                    })
              }
              onPress={() => handleStoryPress(story)}
              onEdit={() => handleEdit(story)}
              onExport={() => handleExport(story)}
              onDelete={() => handleDelete(story)}
            />
          ))}
          {pagination.page < pagination.totalPages && (
            <View style={styles.loadMoreContainer}>
              <ActivityIndicator
                size="small"
                color={Colors.primary.purple}
              />
            </View>
          )}
        </ScrollView>
      )}

      {/* Filters Sidebar */}
      <StoryFilters
        filters={filters}
        onFiltersChange={setFilters}
        availableThemes={availableThemes}
        visible={filtersVisible}
        onClose={() => setFiltersVisible(false)}
      />

      {/* Export Modal */}
      {exportStoryId && (
        <ExportModal
          visible={exportModalVisible}
          onClose={() => {
            setExportModalVisible(false);
            setExportStoryId(null);
            setExportStoryTitle("");
          }}
          storyId={exportStoryId}
          storyTitle={exportStoryTitle}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    padding: 16,
    backgroundColor: Colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.text.primary,
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  headerButton: {
    padding: 4,
  },
  searchContainer: {
    marginBottom: 12,
  },
  bulkActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border.subtle,
  },
  bulkActionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: Colors.background.glass,
    gap: 6,
  },
  bulkActionButtonDanger: {
    backgroundColor: Colors.status.error + "20",
  },
  bulkActionText: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontWeight: "600",
  },
  bulkActionTextDanger: {
    color: Colors.status.error,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.text.tertiary,
    textAlign: "center",
  },
  loadMoreContainer: {
    padding: 20,
    alignItems: "center",
  },
});

import React, { useState, useCallback, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from "react-native";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { MarkdownPreview } from "@/components/editor/MarkdownPreview";
import { Colors } from "@/constants/Colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { storyApi, Story } from "@/lib/api/story";
import { ExportModal } from "@/components/export/ExportModal";
import { HelpTooltip } from "@/components/help/HelpTooltip";

type ViewMode = "edit" | "preview" | "split";

export default function EditorScreen() {
  const params = useLocalSearchParams<{ storyId?: string }>();
  const [content, setContent] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("edit");
  const [currentStory, setCurrentStory] = useState<Story | null>(null);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const autoSaveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Load story if storyId is provided
  useEffect(() => {
    if (params.storyId) {
      loadStory(params.storyId);
    }
  }, [params.storyId]);

  const loadStory = async (storyId: string) => {
    setLoading(true);
    try {
      const story = await storyApi.getById(storyId);
      setCurrentStory(story);
      setContent(story.content);
    } catch (error) {
      console.error("Failed to load story:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setSaveStatus("unsaved");

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Auto-save after 2 seconds of inactivity
    if (currentStory) {
      autoSaveTimeoutRef.current = setTimeout(async () => {
        setSaving(true);
        setSaveStatus("saving");
        try {
          await storyApi.update(currentStory.id, { content: newContent });
          setSaveStatus("saved");
          // Reload story to get updated timestamp
          const updatedStory = await storyApi.getById(currentStory.id);
          setCurrentStory(updatedStory);
        } catch (error) {
          console.error("Auto-save failed:", error);
          setSaveStatus("unsaved");
        } finally {
          setSaving(false);
        }
      }, 2000);
    }
  }, [currentStory]);

  const handleManualSave = async () => {
    if (!currentStory) return;

    setSaving(true);
    setSaveStatus("saving");
    try {
      await storyApi.update(currentStory.id, { content });
      setSaveStatus("saved");
      const updatedStory = await storyApi.getById(currentStory.id);
      setCurrentStory(updatedStory);
    } catch (error) {
      console.error("Save failed:", error);
      setSaveStatus("unsaved");
    } finally {
      setSaving(false);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>
            {currentStory?.title || "Story Editor"}
          </Text>
          <View style={styles.headerActions}>
            {currentStory && (
              <>
                <View style={styles.saveStatusContainer}>
                  {saveStatus === "saving" && (
                    <ActivityIndicator size="small" color={Colors.primary.blue} />
                  )}
                  {saveStatus === "saved" && (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={16}
                      color={Colors.status.success}
                    />
                  )}
                  {saveStatus === "unsaved" && (
                    <MaterialCommunityIcons
                      name="circle"
                      size={16}
                      color={Colors.text.tertiary}
                    />
                  )}
                  <Text style={styles.saveStatusText}>
                    {saveStatus === "saving"
                      ? "Saving..."
                      : saveStatus === "saved"
                      ? "Saved"
                      : "Unsaved"}
                  </Text>
                </View>
                <View style={styles.exportButtonContainer}>
                  <TouchableOpacity
                    style={styles.exportButton}
                    onPress={() => setExportModalVisible(true)}
                  >
                    <MaterialCommunityIcons
                      name="download"
                      size={20}
                      color={Colors.primary.purple}
                    />
                    <Text style={styles.exportButtonText}>Export</Text>
                  </TouchableOpacity>
                  <HelpTooltip
                    text="Export your story in PDF, Markdown, or JSON format. PDF is best for sharing and printing, Markdown for editing in other tools, and JSON for data backup."
                    title="Export Options"
                  />
                </View>
              </>
            )}
          </View>
        </View>
        <View style={styles.viewModeContainer}>
          <View style={styles.viewModeButtons}>
            <TouchableOpacity
            style={[
              styles.viewModeButton,
              viewMode === "edit" && styles.viewModeButtonActive,
            ]}
            onPress={() => setViewMode("edit")}
          >
            <MaterialCommunityIcons
              name="pencil"
              size={20}
              color={viewMode === "edit" ? Colors.primary.purple : Colors.text.tertiary}
            />
            <Text
              style={[
                styles.viewModeButtonText,
                viewMode === "edit" && styles.viewModeButtonTextActive,
              ]}
            >
              Edit
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              viewMode === "preview" && styles.viewModeButtonActive,
            ]}
            onPress={() => setViewMode("preview")}
          >
            <MaterialCommunityIcons
              name="eye"
              size={20}
              color={viewMode === "preview" ? Colors.primary.purple : Colors.text.tertiary}
            />
            <Text
              style={[
                styles.viewModeButtonText,
                viewMode === "preview" && styles.viewModeButtonTextActive,
              ]}
            >
              Preview
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              viewMode === "split" && styles.viewModeButtonActive,
            ]}
            onPress={() => setViewMode("split")}
          >
            <MaterialCommunityIcons
              name="view-split-vertical"
              size={20}
              color={viewMode === "split" ? Colors.primary.purple : Colors.text.tertiary}
            />
            <Text
              style={[
                styles.viewModeButtonText,
                viewMode === "split" && styles.viewModeButtonTextActive,
              ]}
            >
              Split
            </Text>
          </TouchableOpacity>
          </View>
          <HelpTooltip
            text="Switch between Edit mode (focus on writing), Preview mode (see how your story looks), and Split mode (edit and preview side-by-side)."
            title="View Modes"
          />
        </View>
      </View>

      {viewMode === "edit" && (
        <RichTextEditor
          value={content}
          onChange={handleContentChange}
          placeholder="Start writing your story..."
          onSave={handleManualSave}
          showWordCount={true}
        />
      )}

      {viewMode === "preview" && <MarkdownPreview content={content} />}

      {viewMode === "split" && (
        <View style={styles.splitContainer}>
          <View style={styles.splitPane}>
            <RichTextEditor
              value={content}
              onChange={handleContentChange}
              placeholder="Start writing your story..."
            />
          </View>
          <View style={styles.splitDivider} />
          <View style={styles.splitPane}>
            <MarkdownPreview content={content} />
          </View>
        </View>
      )}

      {currentStory && (
        <ExportModal
          visible={exportModalVisible}
          onClose={() => setExportModalVisible(false)}
          storyId={currentStory.id}
          storyTitle={currentStory.title}
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
    flex: 1,
  },
  exportButtonContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.background.glass,
    borderWidth: 1,
    borderColor: Colors.primary.purple,
    gap: 6,
  },
  exportButtonText: {
    fontSize: 14,
    color: Colors.primary.purple,
    fontWeight: "600",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  saveStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  saveStatusText: {
    fontSize: 12,
    color: Colors.text.tertiary,
  },
  viewModeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  viewModeButtons: {
    flexDirection: "row",
    gap: 8,
  },
  viewModeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.background.glass,
    gap: 6,
  },
  viewModeButtonActive: {
    backgroundColor: Colors.primary.purple + "20",
    borderWidth: 1,
    borderColor: Colors.primary.purple,
  },
  viewModeButtonText: {
    fontSize: 14,
    color: Colors.text.tertiary,
    fontWeight: "500",
  },
  viewModeButtonTextActive: {
    color: Colors.primary.purple,
    fontWeight: "600",
  },
  splitContainer: {
    flex: 1,
    flexDirection: "row",
  },
  splitPane: {
    flex: 1,
  },
  splitDivider: {
    width: 1,
    backgroundColor: Colors.border.subtle,
  },
});


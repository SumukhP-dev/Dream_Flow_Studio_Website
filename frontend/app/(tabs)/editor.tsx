import React, { useState, useCallback } from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { MarkdownPreview } from "@/components/editor/MarkdownPreview";
import { Colors } from "@/constants/Colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type ViewMode = "edit" | "preview" | "split";

export default function EditorScreen() {
  const [content, setContent] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("edit");

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Story Editor</Text>
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
      </View>

      {viewMode === "edit" && (
        <RichTextEditor
          value={content}
          onChange={handleContentChange}
          placeholder="Start writing your story..."
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
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.text.primary,
    marginBottom: 12,
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


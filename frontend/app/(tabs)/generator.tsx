import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Colors } from "@/constants/Colors";
import { storyApi, StoryGenerationParams } from "@/lib/api/story";
import { HelpTooltip } from "@/components/help/HelpTooltip";

const THEMES = [
  "nature",
  "fantasy",
  "calming",
  "adventure",
  "meditation",
  "space",
  "ocean",
  "forest",
  "mountain",
  "desert",
];

const TONES = ["peaceful", "adventurous", "mysterious", "inspiring", "dreamy"];
const LENGTHS = ["short", "medium", "long"];
const STYLES = ["narrative", "descriptive", "poetic"];

export default function GeneratorScreen() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [customTheme, setCustomTheme] = useState("");
  const [tone, setTone] = useState<string | null>(null);
  const [length, setLength] = useState<string | null>(null);
  const [style, setStyle] = useState<string | null>(null);
  const [generateVideo, setGenerateVideo] = useState(true);
  const [generateAudio, setGenerateAudio] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);

  // Save draft to local storage
  const saveDraft = () => {
    try {
      const draft = {
        prompt,
        theme: selectedTheme || customTheme,
        tone,
        length,
        style,
        generateVideo,
        generateAudio,
      };
      // In a real app, save to AsyncStorage
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2000);
    } catch (error) {
      console.error("Failed to save draft:", error);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a story prompt");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const params: StoryGenerationParams = {
        prompt: prompt.trim(),
        theme: selectedTheme || customTheme || undefined,
        parameters: {
          ...(tone && { tone }),
          ...(length && { length }),
          ...(style && { style }),
        },
        generateVideo,
        generateAudio,
      };

      const story = await storyApi.generate(params);

      // Navigate to editor with the generated story
      router.push({
        pathname: "/editor",
        params: { storyId: story.id },
      });
    } catch (error: any) {
      console.error("Generation failed:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to generate story. Please try again.";
      setError(errorMessage);
      Alert.alert("Generation Failed", errorMessage, [
        { text: "OK" },
        {
          text: "Retry",
          onPress: handleGenerate,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAnother = () => {
    setPrompt("");
    setSelectedTheme(null);
    setCustomTheme("");
    setTone(null);
    setLength(null);
    setStyle(null);
    setError(null);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Story Generator</Text>
        {draftSaved && (
          <View style={styles.draftSavedIndicator}>
            <MaterialCommunityIcons
              name="check-circle"
              size={16}
              color={Colors.status.success}
            />
            <Text style={styles.draftSavedText}>Draft saved</Text>
          </View>
        )}
      </View>

      {/* Prompt Input */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Story Prompt *</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={6}
            placeholder="Describe the story you want to create..."
            placeholderTextColor={Colors.text.tertiary}
            value={prompt}
            onChangeText={(text) => {
              setPrompt(text);
              setError(null);
            }}
          />
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>

      {/* Theme Selector */}
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Theme</Text>
          <HelpTooltip
            text="Choose a theme to guide the AI's storytelling style. Themes help create consistent mood and setting. You can also enter a custom theme for unique stories."
            title="About Themes"
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.themeScroll}
        >
          {THEMES.map((theme) => (
            <TouchableOpacity
              key={theme}
              style={[
                styles.themeChip,
                selectedTheme === theme && styles.themeChipActive,
              ]}
              onPress={() => {
                setSelectedTheme(theme);
                setCustomTheme("");
              }}
            >
              <Text
                style={[
                  styles.themeChipText,
                  selectedTheme === theme && styles.themeChipTextActive,
                ]}
              >
                {theme}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.customThemeContainer}>
          <Text style={styles.customThemeLabel}>Or enter custom theme:</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Custom theme..."
              placeholderTextColor={Colors.text.tertiary}
              value={customTheme}
              onChangeText={(text) => {
                setCustomTheme(text);
                if (text) setSelectedTheme(null);
              }}
            />
          </View>
        </View>
      </View>

      {/* Parameter Controls */}
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Story Parameters</Text>
          <HelpTooltip
            text="Fine-tune your story with tone (emotional feel), length (story duration), and style (writing approach). These parameters help customize the AI's output to match your preferences."
            title="Story Parameters"
          />
        </View>

        {/* Tone */}
        <View style={styles.parameterGroup}>
          <Text style={styles.parameterLabel}>Tone</Text>
          <View style={styles.parameterOptions}>
            {TONES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.parameterChip,
                  tone === t && styles.parameterChipActive,
                ]}
                onPress={() => setTone(tone === t ? null : t)}
              >
                <Text
                  style={[
                    styles.parameterChipText,
                    tone === t && styles.parameterChipTextActive,
                  ]}
                >
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Length */}
        <View style={styles.parameterGroup}>
          <Text style={styles.parameterLabel}>Length</Text>
          <View style={styles.parameterOptions}>
            {LENGTHS.map((l) => (
              <TouchableOpacity
                key={l}
                style={[
                  styles.parameterChip,
                  length === l && styles.parameterChipActive,
                ]}
                onPress={() => setLength(length === l ? null : l)}
              >
                <Text
                  style={[
                    styles.parameterChipText,
                    length === l && styles.parameterChipTextActive,
                  ]}
                >
                  {l}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Style */}
        <View style={styles.parameterGroup}>
          <Text style={styles.parameterLabel}>Style</Text>
          <View style={styles.parameterOptions}>
            {STYLES.map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.parameterChip,
                  style === s && styles.parameterChipActive,
                ]}
                onPress={() => setStyle(style === s ? null : s)}
              >
                <Text
                  style={[
                    styles.parameterChipText,
                    style === s && styles.parameterChipTextActive,
                  ]}
                >
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Media Options */}
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Media Generation</Text>
          <HelpTooltip
            text="Generate video or audio versions of your story. Video creates visual content (may take longer), while audio creates narration. Both can be enabled simultaneously. Note: Media generation may have usage limits."
            title="Media Generation"
          />
        </View>
        <TouchableOpacity
          style={styles.mediaOption}
          onPress={() => setGenerateVideo(!generateVideo)}
        >
          <MaterialCommunityIcons
            name={generateVideo ? "checkbox-marked" : "checkbox-blank-outline"}
            size={24}
            color={generateVideo ? Colors.primary.purple : Colors.text.tertiary}
          />
          <View style={styles.mediaOptionInfo}>
            <View style={styles.mediaOptionHeader}>
              <Text style={styles.mediaOptionLabel}>Generate Video</Text>
              {mediaUsage && (
                <Text style={styles.mediaUsageText}>
                  {mediaUsage.video.remaining}/{mediaUsage.video.limit} remaining
                </Text>
              )}
            </View>
            <Text style={styles.mediaOptionDescription}>
              Create a video version of your story
            </Text>
            {mediaUsage && mediaUsage.video.remaining === 0 && (
              <Text style={styles.mediaLimitWarning}>
                Monthly limit reached. Try again next month.
              </Text>
            )}
            {mediaUsage && mediaUsage.video.remaining > 0 && mediaUsage.video.remaining <= 2 && (
              <Text style={styles.mediaLimitWarning}>
                Only {mediaUsage.video.remaining} video generation{mediaUsage.video.remaining === 1 ? '' : 's'} remaining this month.
              </Text>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.mediaOption}
          onPress={() => setGenerateAudio(!generateAudio)}
        >
          <MaterialCommunityIcons
            name={generateAudio ? "checkbox-marked" : "checkbox-blank-outline"}
            size={24}
            color={generateAudio ? Colors.primary.purple : Colors.text.tertiary}
          />
          <View style={styles.mediaOptionInfo}>
            <View style={styles.mediaOptionHeader}>
              <Text style={styles.mediaOptionLabel}>Generate Audio</Text>
              {mediaUsage && (
                <Text style={styles.mediaUsageText}>
                  {mediaUsage.audio.remaining}/{mediaUsage.audio.limit} remaining
                </Text>
              )}
            </View>
            <Text style={styles.mediaOptionDescription}>
              Create an audio narration of your story
            </Text>
            {mediaUsage && mediaUsage.audio.remaining === 0 && (
              <Text style={styles.mediaLimitWarning}>
                Monthly limit reached. Try again next month.
              </Text>
            )}
            {mediaUsage && mediaUsage.audio.remaining > 0 && mediaUsage.audio.remaining <= 3 && (
              <Text style={styles.mediaLimitWarning}>
                Only {mediaUsage.audio.remaining} audio generation{mediaUsage.audio.remaining === 1 ? '' : 's'} remaining this month.
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.saveDraftButton}
          onPress={saveDraft}
        >
          <MaterialCommunityIcons
            name="content-save"
            size={20}
            color={Colors.text.secondary}
          />
          <Text style={styles.saveDraftText}>Save Draft</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.generateButton,
            (!prompt.trim() || loading) && styles.generateButtonDisabled,
          ]}
          onPress={handleGenerate}
          disabled={!prompt.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors.text.primary} />
          ) : (
            <>
              <MaterialCommunityIcons
                name="auto-fix"
                size={20}
                color={Colors.text.primary}
              />
              <Text style={styles.generateButtonText}>Generate Story</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Generate Another Quick Action */}
      {!loading && prompt && (
        <TouchableOpacity
          style={styles.generateAnotherButton}
          onPress={handleGenerateAnother}
        >
          <MaterialCommunityIcons
            name="refresh"
            size={18}
            color={Colors.primary.purple}
          />
          <Text style={styles.generateAnotherText}>Generate Another</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: Colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.text.primary,
  },
  draftSavedIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  draftSavedText: {
    fontSize: 12,
    color: Colors.status.success,
  },
  section: {
    padding: 16,
    backgroundColor: Colors.background.surface,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text.primary,
  },
  inputContainer: {
    backgroundColor: Colors.background.primary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    padding: 12,
  },
  textArea: {
    fontSize: 14,
    color: Colors.text.primary,
    minHeight: 120,
    textAlignVertical: "top",
  },
  input: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  errorText: {
    fontSize: 12,
    color: Colors.status.error,
    marginTop: 8,
  },
  themeScroll: {
    marginBottom: 12,
  },
  themeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background.glass,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  themeChipActive: {
    backgroundColor: Colors.primary.purple + "20",
    borderColor: Colors.primary.purple,
  },
  themeChipText: {
    fontSize: 14,
    color: Colors.text.tertiary,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  themeChipTextActive: {
    color: Colors.primary.purple,
    fontWeight: "600",
  },
  customThemeContainer: {
    marginTop: 12,
  },
  customThemeLabel: {
    fontSize: 12,
    color: Colors.text.tertiary,
    marginBottom: 8,
  },
  parameterGroup: {
    marginBottom: 16,
  },
  parameterLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  parameterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  parameterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.background.glass,
    borderWidth: 1,
    borderColor: "transparent",
  },
  parameterChipActive: {
    backgroundColor: Colors.primary.purple + "20",
    borderColor: Colors.primary.purple,
  },
  parameterChipText: {
    fontSize: 12,
    color: Colors.text.tertiary,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  parameterChipTextActive: {
    color: Colors.primary.purple,
    fontWeight: "600",
  },
  mediaOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: Colors.background.primary,
    borderRadius: 8,
    marginBottom: 8,
  },
  mediaOptionInfo: {
    marginLeft: 12,
    flex: 1,
  },
  mediaOptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  mediaOptionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text.primary,
  },
  mediaUsageText: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontWeight: "500",
  },
  mediaOptionDescription: {
    fontSize: 12,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  mediaLimitWarning: {
    fontSize: 11,
    color: Colors.status.warning || Colors.status.error,
    marginTop: 4,
    fontStyle: "italic",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },
  saveDraftButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 8,
    backgroundColor: Colors.background.glass,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    gap: 8,
  },
  saveDraftText: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: "600",
  },
  generateButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 8,
    backgroundColor: Colors.primary.purple,
    gap: 8,
  },
  generateButtonDisabled: {
    opacity: 0.5,
  },
  generateButtonText: {
    fontSize: 16,
    color: Colors.text.primary,
    fontWeight: "700",
  },
  generateAnotherButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 8,
    backgroundColor: Colors.background.glass,
    borderWidth: 1,
    borderColor: Colors.primary.purple,
    gap: 6,
  },
  generateAnotherText: {
    fontSize: 14,
    color: Colors.primary.purple,
    fontWeight: "600",
  },
});

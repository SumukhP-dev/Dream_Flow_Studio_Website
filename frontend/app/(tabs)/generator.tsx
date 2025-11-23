import { View, StyleSheet, ScrollView } from "react-native";
import { Text, TextInput, Button, Card } from "react-native-paper";
import { useState } from "react";
import { storyApi, StoryGenerationParams } from "@/lib/api/story";

export default function GeneratorScreen() {
  const [prompt, setPrompt] = useState("");
  const [theme, setTheme] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    try {
      const params: StoryGenerationParams = {
        prompt,
        theme: theme || undefined,
        generateVideo: true,
        generateAudio: true,
      };
      const story = await storyApi.generate(params);
      console.log("Story generated:", story);
      // TODO: Navigate to editor or preview with the generated story
    } catch (error) {
      console.error("Generation failed:", error);
      // TODO: Show error message
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.title}>
            Generate Story
          </Text>
          <TextInput
            label="Story Prompt"
            value={prompt}
            onChangeText={setPrompt}
            mode="outlined"
            multiline
            numberOfLines={4}
            placeholder="Describe the story you want to create..."
            style={styles.input}
          />
          <TextInput
            label="Theme (optional)"
            value={theme}
            onChangeText={setTheme}
            mode="outlined"
            placeholder="e.g., calming, adventure, fantasy"
            style={styles.input}
          />
          <Button
            mode="contained"
            onPress={handleGenerate}
            loading={loading}
            disabled={!prompt.trim() || loading}
            style={styles.button}
          >
            Generate Story
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  card: {
    margin: 16,
    backgroundColor: "#1A1A1A",
  },
  title: {
    marginBottom: 16,
    color: "#FFFFFF",
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
});



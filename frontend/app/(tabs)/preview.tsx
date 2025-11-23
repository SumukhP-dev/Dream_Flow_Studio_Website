import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Video, ResizeMode, Audio } from "expo-av";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { MediaStatusIndicator, MediaStatus } from "@/components/media/MediaStatusIndicator";
import { storyApi, Story } from "@/lib/api/story";
import { useLocalSearchParams } from "expo-router";
import { MarkdownPreview } from "@/components/editor/MarkdownPreview";

export default function PreviewScreen() {
  const params = useLocalSearchParams<{ storyId?: string }>();
  const [story, setStory] = useState<Story | null>(null);
  const [mediaStatus, setMediaStatus] = useState<{ video: MediaStatus; audio: MediaStatus } | null>(null);
  const [loading, setLoading] = useState(false);
  const [videoStatus, setVideoStatus] = useState<any>({});
  const [audioStatus, setAudioStatus] = useState<any>({});
  const videoRef = useRef<Video>(null);
  const audioRef = useRef<Audio.Sound>(null);
  const statusPollInterval = useRef<NodeJS.Timeout | null>(null);

  // Load story and media status
  useEffect(() => {
    if (params.storyId) {
      loadStory(params.storyId);
      startStatusPolling(params.storyId);
    }

    return () => {
      if (statusPollInterval.current) {
        clearInterval(statusPollInterval.current);
      }
      if (audioRef.current) {
        audioRef.current.unloadAsync();
      }
    };
  }, [params.storyId]);

  const loadStory = async (storyId: string) => {
    setLoading(true);
    try {
      const loadedStory = await storyApi.getById(storyId);
      setStory(loadedStory);
      await loadMediaStatus(storyId);
    } catch (error) {
      console.error("Failed to load story:", error);
      Alert.alert("Error", "Failed to load story");
    } finally {
      setLoading(false);
    }
  };

  const loadMediaStatus = async (storyId: string) => {
    try {
      const status = await storyApi.getMediaStatus(storyId);
      setMediaStatus({
        video: status.video as MediaStatus,
        audio: status.audio as MediaStatus,
      });
    } catch (error) {
      console.error("Failed to load media status:", error);
    }
  };

  const startStatusPolling = (storyId: string) => {
    // Poll every 5 seconds if media is pending or processing
    statusPollInterval.current = setInterval(async () => {
      const status = await storyApi.getMediaStatus(storyId);
      const currentStatus = {
        video: status.video as MediaStatus,
        audio: status.audio as MediaStatus,
      };
      setMediaStatus(currentStatus);

      // Stop polling if both are completed or failed
      if (
        currentStatus.video !== "pending" &&
        currentStatus.video !== "processing" &&
        currentStatus.audio !== "pending" &&
        currentStatus.audio !== "processing"
      ) {
        if (statusPollInterval.current) {
          clearInterval(statusPollInterval.current);
          statusPollInterval.current = null;
        }
        // Reload story to get updated URLs
        loadStory(storyId);
      }
    }, 5000);
  };

  const handleRegenerateVideo = async () => {
    if (!story) return;
    try {
      await storyApi.regenerateMedia(story.id, "video");
      await loadMediaStatus(story.id);
      if (params.storyId) {
        startStatusPolling(params.storyId);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to regenerate video");
    }
  };

  const handleRegenerateAudio = async () => {
    if (!story) return;
    try {
      await storyApi.regenerateMedia(story.id, "audio");
      await loadMediaStatus(story.id);
      if (params.storyId) {
        startStatusPolling(params.storyId);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to regenerate audio");
    }
  };

  const playVideo = async () => {
    if (videoRef.current && story?.videoUrl && story.videoUrl !== "pending" && story.videoUrl !== "processing" && story.videoUrl !== "failed") {
      await videoRef.current.playAsync();
    }
  };

  const playAudio = async () => {
    if (story?.audioUrl && story.audioUrl !== "pending" && story.audioUrl !== "processing" && story.audioUrl !== "failed") {
      try {
        if (audioRef.current) {
          await audioRef.current.unloadAsync();
        }
        const { sound } = await Audio.Sound.createAsync(
          { uri: story.audioUrl },
          { shouldPlay: true }
        );
        audioRef.current = sound;
      } catch (error) {
        Alert.alert("Error", "Failed to play audio");
      }
    }
  };

  if (loading && !story) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary.purple} />
      </View>
    );
  }

  if (!story) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No story selected</Text>
        <Text style={styles.emptySubtext}>
          Select a story from the library to preview
        </Text>
      </View>
    );
  }

  const canPlayVideo =
    story.videoUrl &&
    story.videoUrl !== "pending" &&
    story.videoUrl !== "processing" &&
    story.videoUrl !== "failed";

  const canPlayAudio =
    story.audioUrl &&
    story.audioUrl !== "pending" &&
    story.audioUrl !== "processing" &&
    story.audioUrl !== "failed";

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{story.title}</Text>
        <Text style={styles.theme}>Theme: {story.theme}</Text>
      </View>

      {/* Media Status Indicators */}
      {mediaStatus && (
        <View style={styles.mediaStatusContainer}>
          <MediaStatusIndicator
            type="video"
            status={mediaStatus.video}
            onRegenerate={handleRegenerateVideo}
            url={story.videoUrl || undefined}
          />
          <MediaStatusIndicator
            type="audio"
            status={mediaStatus.audio}
            onRegenerate={handleRegenerateAudio}
            url={story.audioUrl || undefined}
          />
        </View>
      )}

      {/* Video Player */}
      {canPlayVideo && (
        <View style={styles.playerContainer}>
          <Text style={styles.playerLabel}>Video</Text>
          <Video
            ref={videoRef}
            source={{ uri: story.videoUrl! }}
            style={styles.video}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            onPlaybackStatusUpdate={(status) => setVideoStatus(status)}
          />
        </View>
      )}

      {/* Audio Player */}
      {canPlayAudio && (
        <View style={styles.playerContainer}>
          <Text style={styles.playerLabel}>Audio</Text>
          <TouchableOpacity
            style={styles.audioPlayButton}
            onPress={playAudio}
          >
            <MaterialCommunityIcons
              name={audioStatus.isPlaying ? "pause-circle" : "play-circle"}
              size={64}
              color={Colors.primary.purple}
            />
            <Text style={styles.audioPlayText}>
              {audioStatus.isPlaying ? "Pause" : "Play Audio"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Story Content */}
      <View style={styles.contentContainer}>
        <Text style={styles.contentLabel}>Story Content</Text>
        <MarkdownPreview content={story.content} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    padding: 20,
    backgroundColor: Colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.text.primary,
    marginBottom: 8,
  },
  theme: {
    fontSize: 14,
    color: Colors.text.tertiary,
  },
  mediaStatusContainer: {
    padding: 16,
  },
  playerContainer: {
    padding: 16,
    backgroundColor: Colors.background.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  playerLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: 12,
  },
  video: {
    width: "100%",
    height: 200,
    backgroundColor: Colors.background.primary,
    borderRadius: 8,
  },
  audioPlayButton: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  audioPlayText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: "500",
  },
  contentContainer: {
    padding: 16,
  },
  contentLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 18,
    color: Colors.text.primary,
    textAlign: "center",
    marginTop: 100,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.text.tertiary,
    textAlign: "center",
    marginTop: 8,
  },
});

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '@/constants/Config';
import { storyApi } from '@/lib/api/story';

export type ExportFormat = 'pdf' | 'markdown' | 'json';

interface ExportModalProps {
  visible: boolean;
  onClose: () => void;
  storyId: string;
  storyTitle: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  visible,
  onClose,
  storyId,
  storyTitle,
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>(null);

  const handleExport = async (format: ExportFormat) => {
    if (loading) return;

    setLoading(true);
    setSelectedFormat(format);

    try {
      // For web platform, use blob download
      if (Platform.OS === 'web') {
        const blob = await storyApi.export(storyId, format, {
          includeMetadata: true,
          includeMediaLinks: true,
        });

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const filename = `${storyTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${format === 'pdf' ? 'pdf' : format === 'markdown' ? 'md' : 'json'}`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        Alert.alert('Export Complete', 'File downloaded successfully', [
          { text: 'OK', onPress: onClose },
        ]);
        onClose();
        return;
      }

      // For mobile platforms, use FileSystem
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const apiBaseUrl = Config.API_BASE_URL;
      const url = `${apiBaseUrl}/story/${storyId}/export?format=${format}&includeMetadata=true&includeMediaLinks=true`;
      
      const filename = `${storyTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${format === 'pdf' ? 'pdf' : format === 'markdown' ? 'md' : 'json'}`;
      const fileUri = FileSystem.documentDirectory + filename;
      
      const downloadResumable = FileSystem.createDownloadResumable(
        url,
        fileUri,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await downloadResumable.downloadAsync();
      
      if (!result) {
        throw new Error('Download failed');
      }

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable && result.uri) {
        await Sharing.shareAsync(result.uri, {
          mimeType: format === 'pdf' ? 'application/pdf' : format === 'markdown' ? 'text/markdown' : 'application/json',
          dialogTitle: `Share ${storyTitle}`,
        });
      } else {
        Alert.alert(
          'Export Complete',
          `File saved to: ${result.uri}`,
          [{ text: 'OK', onPress: onClose }]
        );
      }

      onClose();
    } catch (error: any) {
      console.error('Export error:', error);
      Alert.alert(
        'Export Failed',
        error.message || 'Failed to export story. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setSelectedFormat(null);
    }
  };

  const formats: { format: ExportFormat; label: string; icon: string; description: string }[] = [
    {
      format: 'pdf',
      label: 'PDF',
      icon: 'file-pdf-box',
      description: 'Portable document format',
    },
    {
      format: 'markdown',
      label: 'Markdown',
      icon: 'language-markdown',
      description: 'Plain text with formatting',
    },
    {
      format: 'json',
      label: 'JSON',
      icon: 'code-json',
      description: 'Structured data format',
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Export Story</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>Choose an export format:</Text>

          <View style={styles.formatList}>
            {formats.map((item) => (
              <TouchableOpacity
                key={item.format}
                style={[
                  styles.formatOption,
                  selectedFormat === item.format && styles.formatOptionSelected,
                  loading && styles.formatOptionDisabled,
                ]}
                onPress={() => handleExport(item.format)}
                disabled={loading}
              >
                <View style={styles.formatIconContainer}>
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={32}
                    color={selectedFormat === item.format ? Colors.primary.purple : Colors.text.secondary}
                  />
                </View>
                <View style={styles.formatInfo}>
                  <Text style={styles.formatLabel}>{item.label}</Text>
                  <Text style={styles.formatDescription}>{item.description}</Text>
                </View>
                {loading && selectedFormat === item.format && (
                  <ActivityIndicator
                    size="small"
                    color={Colors.primary.purple}
                    style={styles.loader}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary.purple} />
              <Text style={styles.loadingText}>Exporting...</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: Colors.background.surface,
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 20,
  },
  formatList: {
    gap: 12,
  },
  formatOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.background.glass,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  formatOptionSelected: {
    borderColor: Colors.primary.purple,
    backgroundColor: Colors.primary.purple + '10',
  },
  formatOptionDisabled: {
    opacity: 0.5,
  },
  formatIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  formatInfo: {
    flex: 1,
  },
  formatLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  formatDescription: {
    fontSize: 12,
    color: Colors.text.tertiary,
  },
  loader: {
    marginLeft: 8,
  },
  loadingContainer: {
    marginTop: 20,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
});


import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

export type MediaStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface MediaStatusIndicatorProps {
  type: 'video' | 'audio';
  status: MediaStatus;
  onRegenerate?: () => void;
  url?: string;
}

export const MediaStatusIndicator: React.FC<MediaStatusIndicatorProps> = ({
  type,
  status,
  onRegenerate,
  url,
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          icon: 'clock-outline',
          color: Colors.text.tertiary,
          label: 'Pending',
          showLoader: false,
        };
      case 'processing':
        return {
          icon: 'loading',
          color: Colors.primary.blue,
          label: 'Processing...',
          showLoader: true,
        };
      case 'completed':
        return {
          icon: 'check-circle',
          color: Colors.status.success,
          label: 'Ready',
          showLoader: false,
        };
      case 'failed':
        return {
          icon: 'alert-circle',
          color: Colors.status.error,
          label: 'Failed',
          showLoader: false,
        };
      default:
        return {
          icon: 'help-circle',
          color: Colors.text.tertiary,
          label: 'Unknown',
          showLoader: false,
        };
    }
  };

  const config = getStatusConfig();
  const typeLabel = type === 'video' ? 'Video' : 'Audio';

  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        <View style={styles.iconContainer}>
          {config.showLoader ? (
            <ActivityIndicator size="small" color={config.color} />
          ) : (
            <MaterialCommunityIcons
              name={config.icon as any}
              size={20}
              color={config.color}
            />
          )}
        </View>
        <View style={styles.info}>
          <Text style={styles.typeLabel}>{typeLabel}</Text>
          <Text style={[styles.statusLabel, { color: config.color }]}>
            {config.label}
          </Text>
        </View>
        {status === 'failed' && onRegenerate && (
          <TouchableOpacity
            style={styles.regenerateButton}
            onPress={onRegenerate}
          >
            <MaterialCommunityIcons
              name="refresh"
              size={16}
              color={Colors.primary.purple}
            />
            <Text style={styles.regenerateText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
      {status === 'completed' && url && url !== 'pending' && url !== 'processing' && url !== 'failed' && (
        <View style={styles.urlContainer}>
          <Text style={styles.urlLabel}>URL:</Text>
          <Text style={styles.urlText} numberOfLines={1} ellipsizeMode="middle">
            {url}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: Colors.background.glass,
    borderRadius: 8,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: Colors.primary.purple,
    gap: 4,
  },
  regenerateText: {
    fontSize: 12,
    color: Colors.primary.purple,
    fontWeight: '600',
  },
  urlContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border.subtle,
  },
  urlLabel: {
    fontSize: 10,
    color: Colors.text.tertiary,
    marginBottom: 4,
  },
  urlText: {
    fontSize: 10,
    color: Colors.text.secondary,
    fontFamily: 'monospace',
  },
});


import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  autoFocus?: boolean;
  onBlur?: () => void;
}

type FormatType = 'bold' | 'italic' | 'underline' | 'heading' | 'list';

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Start writing your story...',
  minHeight = 200,
  autoFocus = false,
  onBlur,
}) => {
  const inputRef = useRef<TextInput>(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  const handleSelectionChange = useCallback((e: any) => {
    setSelection({
      start: e.nativeEvent.selection.start,
      end: e.nativeEvent.selection.end,
    });
  }, []);

  const applyFormat = useCallback(
    (format: FormatType) => {
      const { start, end } = selection;
      const selectedText = value.substring(start, end);

      if (!selectedText && format !== 'list') {
        // If no text selected, just move cursor or insert format markers
        return;
      }

      let formattedText = '';
      const beforeText = value.substring(0, start);
      const afterText = value.substring(end);

      switch (format) {
        case 'bold':
          formattedText = `**${selectedText}**`;
          break;
        case 'italic':
          formattedText = `*${selectedText}*`;
          break;
        case 'underline':
          formattedText = `__${selectedText}__`;
          break;
        case 'heading':
          formattedText = `## ${selectedText || 'Heading'}`;
          break;
        case 'list':
          formattedText = selectedText
            ? `- ${selectedText.split('\n').join('\n- ')}`
            : '- ';
          break;
      }

      const newValue = beforeText + formattedText + afterText;
      onChange(newValue);

      // Reset selection after formatting
      setTimeout(() => {
        inputRef.current?.setNativeProps({
          selection: {
            start: start + formattedText.length,
            end: start + formattedText.length,
          },
        });
      }, 0);
    },
    [value, selection, onChange]
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => applyFormat('bold')}
          accessibilityLabel="Bold"
        >
          <MaterialCommunityIcons name="format-bold" size={20} color={Colors.text.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => applyFormat('italic')}
          accessibilityLabel="Italic"
        >
          <MaterialCommunityIcons name="format-italic" size={20} color={Colors.text.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => applyFormat('heading')}
          accessibilityLabel="Heading"
        >
          <MaterialCommunityIcons name="format-header-1" size={20} color={Colors.text.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => applyFormat('list')}
          accessibilityLabel="List"
        >
          <MaterialCommunityIcons name="format-list-bulleted" size={20} color={Colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          ref={inputRef}
          style={[styles.input, { minHeight }]}
          value={value}
          onChangeText={onChange}
          onSelectionChange={handleSelectionChange}
          placeholder={placeholder}
          placeholderTextColor={Colors.text.quaternary}
          multiline
          textAlignVertical="top"
          autoFocus={autoFocus}
          onBlur={onBlur}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {value.length} characters
        </Text>
        <Text style={styles.footerText}>
          Markdown supported
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  toolbar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
  },
  toolbarButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: Colors.background.glass,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.background.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border.subtle,
  },
  footerText: {
    fontSize: 12,
    color: Colors.text.tertiary,
  },
});


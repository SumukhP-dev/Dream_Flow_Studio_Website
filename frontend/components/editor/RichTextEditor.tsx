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
  onSave?: () => void;
  showWordCount?: boolean;
}

type FormatType = 'bold' | 'italic' | 'underline' | 'heading' | 'list';

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Start writing your story...',
  minHeight = 200,
  autoFocus = false,
  onBlur,
  onSave,
  showWordCount = true,
}) => {
  const inputRef = useRef<TextInput>(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const handleSelectionChange = useCallback((e: any) => {
    setSelection({
      start: e.nativeEvent.selection.start,
      end: e.nativeEvent.selection.end,
    });
  }, []);

  // Add to history
  const addToHistory = useCallback((newValue: string) => {
    // Remove any history after current index (for redo)
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(newValue);
    historyIndexRef.current = historyRef.current.length - 1;
    
    // Limit history size
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
      historyIndexRef.current--;
    }
    
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, []);

  // Initialize history
  React.useEffect(() => {
    if (historyRef.current.length === 0) {
      historyRef.current = [value];
      historyIndexRef.current = 0;
    }
  }, []);

  const handleChange = useCallback((newValue: string) => {
    addToHistory(newValue);
    onChange(newValue);
  }, [onChange, addToHistory]);

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      const previousValue = historyRef.current[historyIndexRef.current];
      onChange(previousValue);
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(true);
    }
  }, [onChange]);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      const nextValue = historyRef.current[historyIndexRef.current];
      onChange(nextValue);
      setCanUndo(true);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
    }
  }, [onChange]);

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
      handleChange(newValue);

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
    [value, selection, handleChange]
  );

  const wordCount = value.trim().split(/\s+/).filter(word => word.length > 0).length;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.toolbar}>
        <View style={styles.toolbarGroup}>
          <TouchableOpacity
            style={[styles.toolbarButton, !canUndo && styles.toolbarButtonDisabled]}
            onPress={undo}
            disabled={!canUndo}
            accessibilityLabel="Undo"
          >
            <MaterialCommunityIcons 
              name="undo" 
              size={20} 
              color={canUndo ? Colors.text.primary : Colors.text.tertiary} 
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toolbarButton, !canRedo && styles.toolbarButtonDisabled]}
            onPress={redo}
            disabled={!canRedo}
            accessibilityLabel="Redo"
          >
            <MaterialCommunityIcons 
              name="redo" 
              size={20} 
              color={canRedo ? Colors.text.primary : Colors.text.tertiary} 
            />
          </TouchableOpacity>
        </View>
        <View style={styles.toolbarDivider} />
        <View style={styles.toolbarGroup}>
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
            onPress={() => applyFormat('underline')}
            accessibilityLabel="Underline"
          >
            <MaterialCommunityIcons name="format-underline" size={20} color={Colors.text.primary} />
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
        {onSave && (
          <>
            <View style={styles.toolbarDivider} />
            <TouchableOpacity
              style={styles.toolbarButton}
              onPress={onSave}
              accessibilityLabel="Save"
            >
              <MaterialCommunityIcons name="content-save" size={20} color={Colors.primary.purple} />
            </TouchableOpacity>
          </>
        )}
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
          onChangeText={handleChange}
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
        {showWordCount && (
          <Text style={styles.footerText}>
            {wordCount} words • {value.length} characters
          </Text>
        )}
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
  },
  toolbarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolbarDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border.subtle,
    marginHorizontal: 8,
  },
  toolbarButton: {
    padding: 8,
    marginRight: 4,
    borderRadius: 8,
    backgroundColor: Colors.background.glass,
  },
  toolbarButtonDisabled: {
    opacity: 0.5,
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


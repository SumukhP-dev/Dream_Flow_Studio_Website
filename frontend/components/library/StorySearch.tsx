import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

interface StorySearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const StorySearch: React.FC<StorySearchProps> = ({
  value,
  onChange,
  placeholder = 'Search stories...',
}) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (text: string) => {
    setLocalValue(text);
    onChange(text);
  };

  const clearSearch = () => {
    setLocalValue('');
    onChange('');
  };

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons
        name="magnify"
        size={20}
        color={Colors.text.tertiary}
        style={styles.searchIcon}
      />
      <TextInput
        style={styles.input}
        value={localValue}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.text.tertiary}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {localValue.length > 0 && (
        <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
          <MaterialCommunityIcons
            name="close-circle"
            size={20}
            color={Colors.text.tertiary}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: Colors.text.primary,
    padding: 0,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
});


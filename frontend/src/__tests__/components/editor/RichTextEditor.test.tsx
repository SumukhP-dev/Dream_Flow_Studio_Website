import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RichTextEditor } from '@/components/editor/RichTextEditor';

describe('RichTextEditor', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with placeholder', () => {
    const { getByPlaceholderText } = render(
      <RichTextEditor value="" onChange={mockOnChange} />
    );
    expect(getByPlaceholderText('Start writing your story...')).toBeTruthy();
  });

  it('should display initial value', () => {
    const { getByDisplayValue } = render(
      <RichTextEditor value="Initial content" onChange={mockOnChange} />
    );
    expect(getByDisplayValue('Initial content')).toBeTruthy();
  });

  it('should call onChange when text changes', () => {
    const { getByPlaceholderText } = render(
      <RichTextEditor value="" onChange={mockOnChange} />
    );
    const input = getByPlaceholderText('Start writing your story...');
    fireEvent.changeText(input, 'New content');
    expect(mockOnChange).toHaveBeenCalledWith('New content');
  });

  it('should display character count', () => {
    const { getByText } = render(
      <RichTextEditor value="Test" onChange={mockOnChange} />
    );
    expect(getByText('4 characters')).toBeTruthy();
  });

  it('should render toolbar buttons', () => {
    const { getByLabelText } = render(
      <RichTextEditor value="" onChange={mockOnChange} />
    );
    expect(getByLabelText('Bold')).toBeTruthy();
    expect(getByLabelText('Italic')).toBeTruthy();
    expect(getByLabelText('Heading')).toBeTruthy();
    expect(getByLabelText('List')).toBeTruthy();
  });
});


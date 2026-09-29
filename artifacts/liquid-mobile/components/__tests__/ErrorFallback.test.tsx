import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ErrorFallback } from '../ErrorFallback';
import { reloadAppAsync } from 'expo';

// Mock expo and its reloadAppAsync function
jest.mock('expo', () => ({
  reloadAppAsync: jest.fn(),
}));

// Mock hooks to avoid errors
jest.mock('@/hooks/useColors', () => ({
  useColors: () => ({
    background: '#fff',
    foreground: '#000',
    primary: '#007AFF',
    primaryForeground: '#fff',
    mutedForeground: '#666',
    card: '#eee',
    border: '#ddd',
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@expo/vector-icons', () => ({
  Feather: 'Feather',
}));

describe('ErrorFallback', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls reloadAppAsync when Try Again is pressed', async () => {
    const error = new Error('Test error');
    const resetError = jest.fn();
    (reloadAppAsync as jest.Mock).mockResolvedValueOnce(undefined);

    const { getByText } = render(
      <ErrorFallback error={error} resetError={resetError} />
    ) as any;

    fireEvent.press(getByText('Try Again'));

    await waitFor(() => {
      expect(reloadAppAsync).toHaveBeenCalled();
    });

    // resetError should not be called if reloadAppAsync succeeds
    expect(resetError).not.toHaveBeenCalled();
  });

  it('calls resetError when reloadAppAsync throws an error', async () => {
    // Spy on console.error to avoid noisy test output
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const error = new Error('Test error');
    const resetError = jest.fn();

    // Mock reloadAppAsync to reject/throw an error
    (reloadAppAsync as jest.Mock).mockRejectedValueOnce(new Error('Failed to reload'));

    const { getByText } = render(
      <ErrorFallback error={error} resetError={resetError} />
    ) as any;

    // Press the button which triggers handleRestart
    fireEvent.press(getByText('Try Again'));

    // Verify resetError is called when the catch block executes
    await waitFor(() => {
      expect(reloadAppAsync).toHaveBeenCalled();
      expect(resetError).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to restart app:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });
});

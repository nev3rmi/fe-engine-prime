import { useState, useEffect } from "react";

/**
 * Hook to debounce a value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook to debounce a callback function
 */
export function useDebouncedCallback<Args extends any[]>(
  callback: (...args: Args) => void,
  delay: number
) {
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout>();

  const debouncedCallback = (...args: Args) => {
    clearTimeout(debounceTimer);
    const newTimer = setTimeout(() => {
      callback(...args);
    }, delay);
    setDebounceTimer(newTimer);
  };

  useEffect(() => {
    return () => {
      clearTimeout(debounceTimer);
    };
  }, [debounceTimer]);

  return debouncedCallback;
}

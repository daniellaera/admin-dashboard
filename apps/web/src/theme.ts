import { createTheme } from '@mantine/core';

/**
 * Visual parity with the original Chakra UI theme: blue primary, soft gray surfaces,
 * medium radius. Semantic colours the old code *assumed* (muted text, primary accents)
 * are real tokens here (AUDIT CQ-13).
 */
export const theme = createTheme({
  primaryColor: 'blue',
  defaultRadius: 'md',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
  headings: { fontWeight: '700' },
  components: {
    Button: { defaultProps: { radius: 'md' } },
    Card: { defaultProps: { radius: 'md', withBorder: true, padding: 'lg' } },
  },
});

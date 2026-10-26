import { notifications } from '@mantine/notifications';
import { errorMessage } from './api.ts';

/** Toast helpers with the wording of the original app. */
export const toast = {
  success(message: string, title?: string) {
    notifications.show({ color: 'green', title, message });
  },
  info(message: string, title?: string) {
    notifications.show({ color: 'blue', title, message });
  },
  warning(message: string, title?: string) {
    notifications.show({ color: 'yellow', title, message });
  },
  error(error: unknown, fallback = 'Something went wrong! If the problem persists, contact us!') {
    notifications.show({
      color: 'red',
      title: 'Error',
      message: error ? errorMessage(error) : fallback,
    });
  },
};

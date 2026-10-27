import { Button, PasswordInput, Stack, Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { useState } from 'react';
import { useCallback } from 'react';
import { useSudo } from '@/features/auth/api.ts';
import { ApiError, errorMessage } from '@/lib/api.ts';
import { toast } from '@/lib/notify.ts';

const MODAL_ID = 'sudo';

function SudoForm({ onConfirmed }: { onConfirmed: () => void }) {
  const sudo = useSudo();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        sudo.mutate(password, {
          onSuccess: onConfirmed,
          onError: (err) => {
            setError(errorMessage(err));
          },
        });
      }}
    >
      <Stack>
        <Text size="sm">
          Changing roles or inviting administrators requires your password. Confirmation stays valid
          for 10 minutes.
        </Text>
        <PasswordInput
          label="Your password"
          autoComplete="current-password"
          data-autofocus
          value={password}
          onChange={(e) => {
            setPassword(e.currentTarget.value);
          }}
          error={error}
        />
        <Button type="submit" loading={sudo.isPending} disabled={password.length === 0}>
          Confirm
        </Button>
      </Stack>
    </form>
  );
}

function isSudoRequired(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 403 &&
    Boolean(error.problem?.type.endsWith('sudo-required'))
  );
}

/**
 * Runs an admin action; when the API answers 403 `sudo-required`, asks for the password in a
 * modal and retries the same action once confirmed (ADR-013 sudo mode).
 */
export function useSudoAction() {
  return useCallback(async (action: () => Promise<unknown>): Promise<void> => {
    try {
      await action();
    } catch (error) {
      if (!isSudoRequired(error)) {
        toast.error(error);
        return;
      }
      modals.open({
        modalId: MODAL_ID,
        title: 'Confirm with your password',
        children: (
          <SudoForm
            onConfirmed={() => {
              modals.close(MODAL_ID);
              action().catch((err: unknown) => {
                toast.error(err);
              });
            }}
          />
        ),
      });
    }
  }, []);
}

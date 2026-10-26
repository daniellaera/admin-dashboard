import {
  ActionIcon,
  type ActionIconProps,
  Anchor,
  type AnchorProps,
  Button,
  type ButtonProps,
} from '@mantine/core';
import { createLink, type LinkComponent } from '@tanstack/react-router';
import { type ComponentPropsWithoutRef, forwardRef } from 'react';

/**
 * Mantine components wrapped with TanStack Router's `createLink` so `to`, `params` and `search`
 * stay fully typed (Mantine's polymorphic `component={Link}` loses the registered router types).
 * Mantine's `*Props` types omit the DOM attributes, so they are added back minus `href`, which the
 * router owns.
 */
type WithAnchorAttrs<P> = P & Omit<ComponentPropsWithoutRef<'a'>, keyof P | 'href'>;

const MantineAnchor = forwardRef<HTMLAnchorElement, WithAnchorAttrs<AnchorProps>>((props, ref) => (
  <Anchor ref={ref} {...props} />
));
MantineAnchor.displayName = 'MantineAnchor';
const CreatedAnchorLink = createLink(MantineAnchor);
export const AnchorLink: LinkComponent<typeof MantineAnchor> = (props) => (
  <CreatedAnchorLink preload="intent" {...props} />
);

const MantineButton = forwardRef<HTMLAnchorElement, WithAnchorAttrs<ButtonProps>>((props, ref) => (
  <Button ref={ref} component="a" {...props} />
));
MantineButton.displayName = 'MantineButton';
const CreatedButtonLink = createLink(MantineButton);
export const ButtonLink: LinkComponent<typeof MantineButton> = (props) => (
  <CreatedButtonLink preload="intent" {...props} />
);

const MantineActionIcon = forwardRef<HTMLAnchorElement, WithAnchorAttrs<ActionIconProps>>(
  (props, ref) => <ActionIcon ref={ref} component="a" {...props} />,
);
MantineActionIcon.displayName = 'MantineActionIcon';
const CreatedActionIconLink = createLink(MantineActionIcon);
export const ActionIconLink: LinkComponent<typeof MantineActionIcon> = (props) => (
  <CreatedActionIconLink preload="intent" {...props} />
);

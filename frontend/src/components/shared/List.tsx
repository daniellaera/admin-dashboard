import {
    Avatar,
    AvatarProps,
    Box,
    BoxProps,
    Flex,
    FlexProps,
    Stack,
    StackProps
  } from "@chakra-ui/react";
  
  type ListProps = StackProps;
  
  function List({ ...rest }: ListProps) {
    return <Stack spacing="4" {...rest} />;
  }
  
  type ListItemProps = FlexProps;
  
  function ListItem({ ...rest }: ListItemProps) {
    return <Flex align="center" {...rest} />;
  }
  
  type ListItemAvatarProps = AvatarProps;
  
  function ListItemAvatar({ ...rest }: ListItemAvatarProps) {
    return <Avatar flexShrink="0" mr="3" size="sm" {...rest} />;
  }
  
  type ListItemExtraProps = BoxProps;
  
  function ListItemExtra({ ...rest }: ListItemExtraProps) {
    return <Box flexShrink="0" {...rest} />;
  }
  
  type ListItemTextProps = BoxProps;
  
  function ListItemText({ ...rest }: ListItemTextProps) {
    return <Box flex="1 1 auto" {...rest} />;
  }
  
  export { List, ListItem, ListItemAvatar, ListItemExtra, ListItemText };
  
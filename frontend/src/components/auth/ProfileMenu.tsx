import {
  Box,
  Flex,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Stack,
  Text,
  useToast
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "../../hooks/auth/useProfile";
import { useSignOut } from "../../hooks/auth/useSignOut";
import { useAuth } from "../../providers/AuthProvider";
import { truncate } from "../../utils/functions";
import ProfileAvatar from "../shared/ProfileAvatar";

function ProfileMenu() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.email);
  const navigate = useNavigate();
  const signOut = useSignOut();
  const toast = useToast();

  const handleSignOut = () => {
    signOut.mutate(undefined, {
      onSuccess: () => {
        navigate("/signin");
      },
      onError: () => {
        toast({
          description:
            "Something went wrong! If the problem persists, contact us!",
          status: "error"
        });
      }
    });
  };

  return (
    <Stack>
      <Box px={4} mb='8' border={'1px solid gray'} borderRadius='2xl'>
        <Flex alignItems={'center'}>
          <Menu placement="bottom-end" closeOnSelect closeOnBlur>
            <MenuButton
              py="4"
              as={IconButton}
              rounded={'full'}
              variant={'link'}
              cursor={'pointer'}
            >
              <ProfileAvatar mr="3" avatarSize="sm" url={profile?.avatarUrl} avatarName={truncate(user?.email!)} />
            </MenuButton>
            <MenuList>
              <MenuItem onClick={handleSignOut}>Sign out</MenuItem>
            </MenuList>
          </Menu>
          <Box>
            <Text fontSize="sm" fontWeight="medium">
              {profile?.username ? profile.username : ''}
            </Text>
            <Text color="muted" fontSize="xs" fontWeight="normal">
              {profile?.authorEmail}
            </Text>
          </Box>
        </Flex>
      </Box>
    </Stack>
  );
}

export { ProfileMenu };

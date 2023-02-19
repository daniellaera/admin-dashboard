import { ArrowUpDownIcon } from "@chakra-ui/icons";
import {
  Avatar,
  Box,
  Button,
  Flex,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useToast
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "../../hooks/auth/useProfile";
import { useSignOut } from "../../hooks/auth/useSignOut";
import { useAuth } from "../../providers/AuthProvider";

function ProfileMenu() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.email);
  const navigate = useNavigate();
  const signOut = useSignOut();
  const toast = useToast();

  const handleSignOut = () => {
    signOut.mutate(undefined, {
      onSuccess: () => {
        navigate("/login");
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
    <Menu>
      <MenuButton
        as={Button}
        isLoading={signOut.isLoading}
        height="fit-content"
        loadingText="Signing out..."
        py="4"
        rightIcon={<ArrowUpDownIcon fontSize="sm" />}
        textAlign="left"
        variant="outline"
      >
        <Flex align="center">
          <Avatar mr={3} size="sm" />
          <Box>
            <Text fontSize="sm" fontWeight="medium">
              {profile?.username ? profile.username : ''}
            </Text>
            <Text color="muted" fontSize="xs" fontWeight="normal">
              {profile?.authorEmail}
            </Text>
          </Box>
        </Flex>
      </MenuButton>
      <MenuList>
        <MenuItem onClick={handleSignOut}>Sign out</MenuItem>
      </MenuList>
    </Menu>
  );
}

export { ProfileMenu };

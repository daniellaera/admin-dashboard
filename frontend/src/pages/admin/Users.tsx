import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Text,
  useDisclosure,
  useToast
} from "@chakra-ui/react";
import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loading } from "../../components/shared/Loading";
import { Page } from "../../components/shared/Page";
import { Pagination } from "../../components/shared/Pagination";
import { Result } from "../../components/shared/Result";
import {
  Toolbar,
  ToolbarActions,
  ToolbarTitle
} from "../../components/shared/Toolbar";
import { UserTable } from "../../components/user/UserTable";
import { useRemoveUser } from "../../hooks/user/useRemoveUser";
import { useUsers } from "../../hooks/user/useUsers";
import { User } from "../../types/user";

const pageSize = 5;

const Users = () => {
  const toast = useToast();
  const [activeUser, setActiveUser] = useState<User | undefined>(undefined);
  const [pageIndex, setPageIndex] = useState(0);
  const { isOpen, onClose, onOpen } = useDisclosure();
  const cancelRef = useRef(null);
  const { data, isError, isLoading } = useUsers();
  const removeUser = useRemoveUser();

  const users = useMemo(() => {
    return data?.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize);
  }, [data, pageIndex]);

  if (isLoading) {
    return <Loading />;
  }

  if (isError) {
    return (
      <Result
        description="Something went wrong! If the problem persists, contact us!"
        status="error"
        title="Oops!"
      />
    );
  }

  function handlePageChange(newPageIndex: number) {
    setPageIndex(newPageIndex);
  }

  function handleCloseRemoveAlert() {
    setActiveUser(undefined);
    onClose();
  }

  function handleOpenRemoveAlert(user: User) {
    setActiveUser(user);
    onOpen();
  }

  function handleRemoveUser(user: User) {
    removeUser.mutate(user, {
      onSuccess: () => {
        onClose();
        toast({
          description: `${user.firstName} ${user.lastName} has been removed`,
          status: "success"
        });
      },
      onError: () => {
        toast({
          description:
            "Something went wrong! If the problem persists, contact us!",
          status: "error"
        });
      }
    });
  }

  return (
    <Page animation="slideFade">
      <Toolbar>
        <ToolbarTitle>Users</ToolbarTitle>
        <ToolbarActions>
          <Button as={Link} colorScheme='blue' to="/admin/users/new">
            Add User
          </Button>
        </ToolbarActions>
      </Toolbar>
      <Card mt="8">
        <CardHeader>
          <Text>Users table</Text>
        </CardHeader>
        <CardBody>
          <UserTable
            onDelete={(user) => handleOpenRemoveAlert(user)}
            users={users}
          />
        </CardBody>
        <CardFooter>
          <Pagination
            onPageChange={handlePageChange}
            pageIndex={pageIndex}
            pageSize={pageSize}
            total={data?.length!}
          />
        </CardFooter>
      </Card>
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={handleCloseRemoveAlert}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete User
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure? You can't undo this action afterwards.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={handleCloseRemoveAlert}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                isLoading={removeUser.isLoading}
                onClick={() => handleRemoveUser(activeUser!)}
                ml={3}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Page>
  );
};

export default Users;

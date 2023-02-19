import { DeleteIcon, EditIcon } from "@chakra-ui/icons";
import {
  Badge,
  Box,
  HStack,
  IconButton,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { Empty } from "../shared/Empty";
import { User } from "../../types/user";

type UserTableProps = {
  onDelete: (user: User) => void;
  users?: User[];
};

const UserTable = ({ onDelete, users }: UserTableProps) => {

  if (!users || users.length === 0) {
    return <Empty message="Users will show up here!" />
  }

  return (
    <Box overflowX="auto" >
      <Table variant={'simple'}>
        <Thead>
          <Tr>
            <Th>Name</Th>
            <Th>Status</Th>
            <Th>Role</Th>
            <Th isNumeric>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {users.map((item) => (
            <Tr key={item.email}>
              <Td>{`${item.firstName} ${item.lastName}`}</Td>
              <Td>
                {item.disabled ? (
                  <Badge>Disabled</Badge>
                ) : (
                  <Badge colorScheme="green">Active</Badge>
                )}
              </Td>
              <Td>{item.role}</Td>
              <Td isNumeric>
                <HStack justify="right">
                  <IconButton
                    aria-label={`Edit ${item.firstName} ${item.lastName}`}
                    as={Link}
                    icon={<EditIcon />}
                    to={`/admin/users/${item.id}`}
                  />
                  <IconButton
                    aria-label={`Delete ${item.firstName} ${item.lastName}`}
                    icon={<DeleteIcon />}
                    onClick={() => onDelete(item)}
                  />
                </HStack>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}

export { UserTable };

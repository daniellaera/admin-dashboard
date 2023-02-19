import { ReactNode } from 'react';
import {
  Flex,
  Icon,
  useColorModeValue,
  FlexProps,
} from '@chakra-ui/react';
import { IconType } from 'react-icons';
import { NavLink } from 'react-router-dom';

interface NavItemProps extends FlexProps {
  icon?: IconType;
  children: ReactNode;
  href: string;
}
const NavItem = ({ icon, children, href, ...rest }: NavItemProps) => {
  const bg = useColorModeValue("gray.100", "gray.900");
  return (
    <NavLink to={href}>
      <Flex
        align="center"
        p="4"
        mx="4"
        borderRadius="lg"
        role="group"
        cursor="pointer"
        _hover={{
          bg: bg,
        }}
        {...rest}>
        {icon && (
          <Icon
            mr="4"
            fontSize="16"
            _groupHover={{
              bg: bg,
            }}
            as={icon}
          />
        )}
        {children}
      </Flex>
    </NavLink>
  );
};

export default NavItem;

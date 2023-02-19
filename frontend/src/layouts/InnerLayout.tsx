import { ArrowBackIcon } from "@chakra-ui/icons";
import { Button, Spacer } from "@chakra-ui/react";
import { Link, Outlet } from "react-router-dom";
import { DarkModeSwitch } from "../components/shared/DarkModeSwitch";
import { Footer } from "../components/shared/Footer";
import { Navbar } from "../components/shared/Navbar";

function InnerLayout() {
  return (
    <>
      <Navbar>
        <Button
          as={Link}
          colorScheme="blue"
          leftIcon={<ArrowBackIcon />}
          ml="-2"
          size="sm"
          variant="ghost"
          to="/"
        >
          Back to home
        </Button>
        <Spacer />
        <DarkModeSwitch />
      </Navbar>
      <Outlet />
      <Footer />
    </>
  );
}

export { InnerLayout };

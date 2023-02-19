import * as React from "react"
import { Button } from "@chakra-ui/react"
import type { ButtonProps } from "@chakra-ui/react"
import { Link } from "react-router-dom"

interface Props extends ButtonProps {
  to: string
}
export const LinkButton: React.FC<Props> = (props) => {
  return (
    <Button as={Link} textDecor="none !important" {...props}>
      {props.children}
    </Button>
  )
}

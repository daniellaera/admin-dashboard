import { HTMLMotionProps, motion } from "framer-motion";

const animations = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 }
  },
  slideFade: {
    initial: { y: -16, opacity: 0 },
    animate: { y: 0, opacity: 1 }
  }
};

type PageProps = HTMLMotionProps<"div"> & {
  animation?: "fade" | "slideFade";
};

function Page({ animation = "fade", ...rest }: PageProps) {
  return <motion.div {...animations[animation]} {...rest} />;
}

export { Page };

import { motion } from "framer-motion";

const variants = {
  initial: { opacity: 0, y: 16, filter: "blur(4px)" },
  enter:   { opacity: 1, y: 0,  filter: "blur(0px)" },
  exit:    { opacity: 0, y: -16, filter: "blur(4px)" },
};

const transition = { duration: 0.45, ease: [0.22, 1, 0.36, 1] };

const PageWrapper = ({ children, className = "" }) => {
  return (
    <motion.div
      className={className}
      variants={variants}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={transition}
    >
      {children}
    </motion.div>
  );
};

export default PageWrapper;
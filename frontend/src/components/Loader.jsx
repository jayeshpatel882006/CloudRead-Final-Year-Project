import { ClipLoader } from "react-spinners";

const Loader = () => {
  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      <ClipLoader size={50} color="#4f46e5" />
    </div>
  );
};

export default Loader;
import { ClipLoader } from "react-spinners";

const Loader = ({ inline = false }) => {
  if (inline) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <ClipLoader size={18} color="#4f46e5" />
      </div>
    );
  }
  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      <ClipLoader size={50} color="#4f46e5" />
    </div>
  );
};

export default Loader;
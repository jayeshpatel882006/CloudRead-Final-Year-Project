import { useRef, useState } from "react";
import { UploadCloud, FileText, X } from "lucide-react";
import API from "../../services/api";
import { toast } from "react-toastify";
import {
  Button,
  Card,
  Input,
  PageHeader,
  Select,
  Textarea,
} from "../ui";
import "./Librarian.css";

const CATEGORY_OPTIONS = [
  "Fiction", "Non-Fiction", "Science", "Mathematics",
  "History", "Biography", "Technology", "Self-Help",
  "Literature", "Philosophy", "Other",
];

export default function LibrarianUpload() {
  const fileRef = useRef(null);
  const [form, setForm] = useState({
    title: "",
    author: "",
    category: "Fiction",
    description: "",
  });
  const [pdfFile, setPdfFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm((s) => ({ ...s, [key]: e.target.value }));

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf") {
      toast.error("Only PDF files are allowed.");
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      toast.error("PDF must be smaller than 50 MB.");
      return;
    }
    setPdfFile(f);
  };

  const clearFile = () => {
    setPdfFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!pdfFile) {
      toast.error("Pick a PDF to upload.");
      return;
    }
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => data.append(k, v));
    data.append("pdf", pdfFile);
    try {
      setLoading(true);
      await API.post("/books", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Book added to the catalog.");
      setForm({ title: "", author: "", category: "Fiction", description: "" });
      clearFile();
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't add the book.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cr-librarian">
      <PageHeader
        eyebrow="Librarian workspace"
        title="Upload a new book"
        description="Add a new title to the catalog. PDF only, max 50 MB."
      />

      <Card padding="lg" className="cr-librarian__upload">
        <form onSubmit={onSubmit} className="cr-librarian__upload-form">
          <div className="cr-librarian__upload-fields">
            <Input
              label="Title"
              name="title"
              placeholder="The Great Adventure"
              value={form.title}
              onChange={set("title")}
              required
            />
            <Input
              label="Author"
              name="author"
              placeholder="Jane Doe"
              value={form.author}
              onChange={set("author")}
              required
            />
            <Select
              label="Category"
              name="category"
              value={form.category}
              onChange={set("category")}
              options={CATEGORY_OPTIONS}
              placeholder="Pick a category"
            />
            <Textarea
              label="Description"
              name="description"
              placeholder="A short synopsis to help readers find this book."
              value={form.description}
              onChange={set("description")}
              rows={3}
            />
          </div>

          <div
            className={`cr-librarian__drop ${pdfFile ? "cr-librarian__drop--filled" : ""}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) {
                const dt = new DataTransfer();
                dt.items.add(f);
                if (fileRef.current) fileRef.current.files = dt.files;
                onFile({ target: { files: [f] } });
              }
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              onChange={onFile}
              hidden
            />
            {pdfFile ? (
              <div className="cr-librarian__file">
                <FileText size={28} />
                <div>
                  <strong>{pdfFile.name}</strong>
                  <span>{(pdfFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
                <button
                  type="button"
                  className="cr-librarian__file-clear"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFile();
                  }}
                  aria-label="Remove file"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <UploadCloud size={36} aria-hidden="true" />
                <strong>Drop a PDF here, or click to browse</strong>
                <span>Max 50 MB. Pages will be rendered server-side.</span>
              </>
            )}
          </div>

          <div className="cr-librarian__upload-actions">
            <Button type="submit" size="lg" loading={loading} leftIcon={<UploadCloud size={18} />}>
              {loading ? "Uploading…" : "Add to catalog"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
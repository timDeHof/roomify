import { UploadIcon, CheckCircle2, ImageIcon } from "lucide-react";
import {
  useState,
  useRef,
  useEffect,
  type DragEvent,
  type ChangeEvent,
} from "react";
import { useOutletContext } from "react-router";
import {
  PROGRESS_INCREMENT,
  PROGRESS_INTERVAL_MS,
  REDIRECT_DELAY_MS,
} from "lib/constants";

interface UploadProps {
  onComplete?: (data: string) => void;
}

const Upload = ({ onComplete }: UploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const progressIntervalRef = useRef<number | null>(null);

  const { isSignedIn } = useOutletContext<AuthContext>();

  const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png"];
  const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png"];

  const isValidFileType = (file: File): boolean => {
    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    return (
      ALLOWED_MIME_TYPES.includes(file.type) ||
      ALLOWED_EXTENSIONS.includes(extension)
    );
  };

  const processFile = (file: File) => {
    if (!isSignedIn) return;
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    const reader = new FileReader();
    reader.onerror = () => {
      console.error("Error reading file");
    };
    reader.onload = () => {
      const base64 = reader.result as string;
      setBase64Data(base64);
      setProgress(0);

      progressIntervalRef.current = window.setInterval(() => {
        setProgress((prev) => Math.min(prev + PROGRESS_INCREMENT, 100));
      }, PROGRESS_INTERVAL_MS);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (progress >= 100) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (onComplete && base64Data) {
        const timeout = setTimeout(() => {
          onComplete(base64Data);
        }, REDIRECT_DELAY_MS);
        return () => clearTimeout(timeout);
      }
    }
  }, [progress, base64Data, onComplete]);

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isSignedIn) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);

    if (!isSignedIn) return;

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (!isValidFileType(droppedFile)) {
        setError("Invalid file type. Please upload a JPG or PNG image.");
        return;
      }
      setFile(droppedFile);
      processFile(droppedFile);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!isValidFileType(selectedFile)) {
        setError("Invalid file type. Please upload a JPG or PNG image.");
        return;
      }
      setFile(selectedFile);
      processFile(selectedFile);
    }
  };

  return (
    <div className="upload">
      {!file ? (
        <div
          className={`dropzone ${isDragging ? "is-dragging" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            className="drop-input"
            accept=".jpg,.jpeg,.png"
            disabled={!isSignedIn}
            onChange={handleChange}
          />
          <div className="drop-content">
            <div className="drop-icon">
              <UploadIcon size={20} />
            </div>
            <p>
              {isSignedIn
                ? "Click to upload or drag and drop"
                : "sign in or sign up with Puter to upload"}
            </p>
            <p className="help">Maximum file size 50MB.</p>
            {error && <p className="error">{error}</p>}
          </div>
        </div>
      ) : (
        <div className="upload-status">
          <div className="status-content">
            <div className="status-icon">
              {progress === 100 ? (
                <CheckCircle2 className="check" />
              ) : (
                <ImageIcon className="image" />
              )}
            </div>
            <h3>{file.name}</h3>
            <div className="progress">
              <div className="bar" style={{ width: `${progress}%` }} />
              <p className="status-text">
                {progress < 100 ? "Analyzing Floor Plan..." : "Redirecting..."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Upload;

"use client";
// The native picker is a transient transport, never the visible source record.
// Clear it after selection (also permits re-selecting the same file). Only the
// filename committed with parsed application state is displayed.
export function SessionFileInput({
  label,
  accept,
  filename,
  onFile,
}: {
  label: string;
  accept: string;
  filename: string | null;
  onFile: (file: File) => void;
}) {
  return (
    <span className="session-file-control">
      <input
        className="session-file-native"
        type="file"
        accept={accept}
        aria-label={label}
        autoComplete="off"
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          e.currentTarget.value = "";
          if (file) onFile(file);
        }}
      />
      <span aria-hidden="true" className="session-file-button">
        Choose file
      </span>
      <span role="status" aria-label={`${label} filename`}>
        {filename ?? "No file selected"}
      </span>
    </span>
  );
}

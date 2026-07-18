import { useState } from 'react';

/**
 * useFileAttachments
 *
 * Feature #10 — multi-file attach via file picker OR drag-and-drop, converting
 * each File to { name, data (base64, no prefix), mimeType, size }.
 *
 * `shapeFile` lets a caller add extra per-file fields — e.g. CreateProjectModal
 * stamps each file with the form's current `accessibility` (Feature #7);
 * CreateTaskModal doesn't, so it can omit this argument.
 *
 * This was previously duplicated near-identically in CreateProjectModel.jsx
 * and CreateTaskModel.jsx.
 */
export default function useFileAttachments(shapeFile = (base) => base) {
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [convertingFiles, setConvertingFiles] = useState(false);

  const convertFiles = async (fileList) => {
    setConvertingFiles(true);
    const picked = Array.from(fileList);
    const converted = await Promise.all(
      picked.map(
        (f) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(shapeFile({
              name:     f.name,
              data:     reader.result.split(',')[1], // base64 only (no prefix)
              mimeType: f.type,
              size:     f.size,
            }));
            reader.onerror = reject;
            reader.readAsDataURL(f);
          })
      )
    );
    setFiles((prev) => [...prev, ...converted]);
    setConvertingFiles(false);
  };

  const handleFiles = async (e) => {
    await convertFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) await convertFiles(e.dataTransfer.files);
  };

  const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const reset = () => setFiles([]);

  return {
    files, setFiles, dragOver, setDragOver, convertingFiles,
    handleFiles, handleDrop, removeFile, reset,
  };
}
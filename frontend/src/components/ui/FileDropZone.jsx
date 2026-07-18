import { useRef } from 'react';
import { formatFileSize } from '../../utils/formatFileSize';
const FileDropZone = ({
  files, dragOver, setDragOver, convertingFiles,
  onFilesPicked, onDrop, onRemoveFile,
  label = 'Attachments (optional)',
}) => {
  const fileRef = useRef();

  return (
    <div className="space-y-2">
      <label className="text-xs text-gray-400 uppercase tracking-wide">{label}</label>

      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`flex items-center justify-center gap-3 w-full h-20 rounded-xl border-2 border-dashed transition cursor-pointer bg-[var(--pms-bg-inset)] ${
          dragOver ? 'border-purple-500 bg-purple-500/5' : 'border-[var(--pms-bg-header)] hover:border-purple-500/60'
        }`}
      >
        <span className="text-2xl">📎</span>
        <div>
          <p className="text-xs text-gray-400 font-medium">{dragOver ? 'Drop files here' : 'Click or drag files to attach'}</p>
          <p className="text-xs text-gray-600">PDF, images, docs — any format, multiple at once</p>
        </div>
      </div>
      <input ref={fileRef} type="file" multiple onChange={onFilesPicked} className="hidden" />
      {convertingFiles && <p className="text-xs text-purple-400 animate-pulse">Processing files…</p>}

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between bg-[var(--pms-bg-surface)] rounded-lg px-3 py-2 border border-white/5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm">📄</span>
                <div className="min-w-0">
                  <p className="text-xs text-white truncate">{f.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(f.size)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemoveFile(i)}
                className="ml-3 text-gray-500 hover:text-red-400 transition text-lg leading-none flex-shrink-0"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileDropZone;
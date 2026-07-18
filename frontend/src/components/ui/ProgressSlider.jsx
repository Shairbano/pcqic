const ProgressSlider = ({ label = 'Progress', progress, onChange }) => {
  const progressColor =
    progress >= 100 ? 'from-green-500 to-emerald-400'
    : progress >= 60 ? 'from-blue-500 to-cyan-400'
    : 'from-purple-600 to-indigo-400';

  return (
    <div>
      <div className="flex justify-between text-xs text-gray-400 mb-2">
        <span className="uppercase tracking-wide">{label}</span>
        <span className={`font-bold ${progress >= 100 ? 'text-green-400' : 'text-purple-400'}`}>
          {progress}%
        </span>
      </div>
      <input
        type="range" min={0} max={100} step={5}
        value={progress}
        onChange={(e) => onChange(Number(e.target.value))}
        onInput={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer accent-purple-500"
        style={{ WebkitAppearance: 'auto' }}
      />
      <div className="h-2.5 rounded-full bg-white/10 overflow-hidden mt-3">
        <div
          className={`h-full bg-gradient-to-r ${progressColor} rounded-full transition-all duration-300`}
          style={{ width: `${progress}%` }}
        />
      </div>
      {progress >= 100 && (
        <p className="text-xs text-green-400 mt-1 font-medium">✓ Task will be marked as completed</p>
      )}
    </div>
  );
};

export default ProgressSlider;
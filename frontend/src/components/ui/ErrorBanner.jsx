const ErrorBanner = ({ message, className = '' }) => {
  if (!message) return null;
  return (
    <div className={`bg-red-500/10 border border-red-500/40 text-red-400 text-sm p-3 rounded-lg ${className}`}>
      {message}
    </div>
  );
};

export default ErrorBanner;
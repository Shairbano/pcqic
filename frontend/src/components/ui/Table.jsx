const Table = ({ children, className = '' }) => (
  <div className={`overflow-x-auto rounded-2xl border border-purple-900/30 shadow-sm ${className}`}>
    <table className="w-full text-sm">{children}</table>
  </div>
);

Table.Head = ({ children }) => (
  <thead>
    <tr className="bg-[var(--pms-bg-header)] text-gray-400 uppercase text-xs">{children}</tr>
  </thead>
);

Table.Th = ({ children, className = '' }) => (
  <th className={`p-3 text-left ${className}`}>{children}</th>
);

Table.Body = ({ children }) => <tbody>{children}</tbody>;

Table.Row = ({ children, className = '', ...props }) => (
  <tr className={`border-t border-white/5 hover:bg-white/3 transition bg-[var(--pms-bg-surface-alt)] ${className}`} {...props}>
    {children}
  </tr>
);

Table.Td = ({ children, className = '' }) => (
  <td className={`p-3 ${className}`}>{children}</td>
);

export default Table;
import { Inbox } from 'lucide-react';
import { isValidElement } from 'react';

const EmptyState = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = '',
}) => {
  const isTextIcon = typeof Icon === 'string';
  const isElementIcon = isValidElement(Icon);

  return (
    <div className={`flex flex-col items-center justify-center py-20 text-center ${className}`}>
      {isTextIcon ? (
        <div className="text-5xl mb-4 opacity-50">{Icon}</div>
      ) : isElementIcon ? (
        Icon
      ) : (
        <Icon size={48} className="text-gray-600 mb-4" />
      )}
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      {description && <p className="text-gray-400 text-sm max-w-xs mb-6">{description}</p>}
      {action}
    </div>
  );
};

export default EmptyState;

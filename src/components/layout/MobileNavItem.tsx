import { Link, useLocation } from 'react-router-dom';

interface MobileNavItemProps {
  to: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

const MobileNavItem: React.FC<MobileNavItemProps> = ({ to, label, icon, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center rounded-lg p-3 text-base font-medium ${
        isActive
          ? 'bg-indigo-50 text-indigo-700'
          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <span className="mr-3 text-xl">{icon}</span>
      <span>{label}</span>
    </Link>
  );
};

export default MobileNavItem;

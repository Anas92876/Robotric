import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../providers/AuthProvider";

interface User {
  id: string;
  email: string;
  role: string;
  name: string;
}

interface UserDropdownProps {
  user: User;
}

export default function UserDropdown({ user }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { logout } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscapeKey);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logout();
      setIsOpen(false);
    } catch (error) {
      console.error("Logout failed:", error);
      // Show error toast notification here if you have a toast system
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
      case "superadmin":
        return "text-red-400";
      case "judge":
        return "text-blue-400";
      case "editor":
        return "text-green-400";
      case "organizer":
        return "text-purple-400";
      default:
        return "text-gray-400";
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === "admin" || role === "superadmin") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-900/20 text-red-400 border border-red-900/30">
          {role === "superadmin" ? "Super Admin" : "Admin"}
        </span>
      );
    }
    return null;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 text-gray-300 hover:text-primary transition-colors duration-300 group"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center border border-primary/30 group-hover:border-primary/50 transition-colors duration-300">
          <span className="text-primary font-semibold">
            {user.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium group-hover:text-primary transition-colors duration-300">
            {user.name}
          </p>
          <p className={`text-xs capitalize ${getRoleColor(user.role)}`}>
            {user.role}
          </p>
        </div>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          } group-hover:text-primary`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-72 bg-surface/95 backdrop-blur-xl border border-gray-700 rounded-2xl shadow-2xl py-2 z-50 animate-fade-in">
          {/* User Info Section */}
          <div className="px-4 py-3 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center border border-primary/30">
                <span className="text-primary font-bold text-lg">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{user.name}</p>
                <p className="text-gray-400 text-sm truncate">{user.email}</p>
                <div className="mt-1">
                  {getRoleBadge(user.role) || (
                    <span
                      className={`text-xs capitalize ${getRoleColor(
                        user.role
                      )}`}
                    >
                      {user.role}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <button
              onClick={handleLogout}
              disabled={isLoading}
              className="w-full text-left px-4 py-3 text-gray-300 hover:bg-gray-700/50 hover:text-red-400 transition-colors duration-200 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-gray-400 border-t-red-400 rounded-full animate-spin"></div>
              ) : (
                <svg
                  className="w-5 h-5 group-hover:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              )}
              <span className="font-medium">
                {isLoading ? "Signing out..." : "Sign out"}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

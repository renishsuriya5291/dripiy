// src/components/layouts/DashboardLayout.jsx
import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  LayoutDashboard,
  Users,
  ListChecks,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Linkedin
} from 'lucide-react';
import { logout, reset } from '../../features/auth/authSlice';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '../ui/sheet';

function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { accounts } = useSelector((state) => state.linkedin);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Check for mobile screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  // Handle logout
  const onLogout = () => {
    dispatch(logout());
    dispatch(reset());
    navigate('/login');
  };

  // Get first name for display
  const getFirstName = () => {
    if (!user || !user.user.name) return user?.email || 'User';
    return user.user.name;
  };

  // Get initials for avatar
  const getInitials = () => {
    if (!user || !user.name) {
      if (user?.email) {
        return user.email.charAt(0).toUpperCase();
      }
      return 'U';
    }
    const nameParts = user.name.split(' ');
    if (nameParts.length === 1) return nameParts[0].charAt(0);
    return `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}`;
  };

  // Navigation items
  const navItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
      exact: true
    },
    {
      name: 'LinkedIn Accounts',
      path: '/dashboard/linkedin-accounts',
      icon: <Linkedin className="h-5 w-5" />,
      exact: false
    },
    {
      name: 'Campaigns',
      path: '/dashboard/campaigns',
      icon: <ListChecks className="h-5 w-5" />,
      exact: false
    },
    {
      name: 'Settings',
      path: '/dashboard/settings',
      icon: <Settings className="h-5 w-5" />,
      exact: false
    },
  ];

  // Custom isActive function to determine if a nav item should be highlighted
  const isItemActive = (path, exact) => {
    if (exact) {
      return location.pathname === path;
    }
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  // Sidebar content
  const SidebarContent = ({ onNavClick }) => (
    <>
      <div className="flex items-center py-6 px-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold gradient-text">prospx</h1>
        </div>
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>
      <div className="space-y-1 px-3 py-2">
        {navItems.map((item) => {
          const active = isItemActive(item.path, item.exact);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-x-3 px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-gray-700 hover:bg-primary/5'
              }`}
              onClick={() => {
                if (isMobile) {
                  setSidebarOpen(false);
                }
                if (onNavClick) onNavClick();
              }}
            >
              {item.icon}
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </div>
      <div className="mt-auto px-3 py-4">
        <div className="rounded-lg bg-gray-50 px-3 py-4">
          <div>
            <p className="text-sm font-medium">Connected Accounts</p>
            <p className="text-xs text-gray-500">{accounts.length} account(s)</p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <div className="w-60 border-r bg-white flex flex-col overflow-y-auto">
          <SidebarContent />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b">
          <div className="flex h-16 items-center px-4">
            {isMobile && (
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-full max-w-[300px]">
                  <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                  <div className="flex flex-col h-full">
                    <SidebarContent onNavClick={() => setSidebarOpen(false)} />
                  </div>
                </SheetContent>
              </Sheet>
            )}
            <div className="ml-auto flex items-center space-x-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-x-2 px-1.5 py-1.5"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-primary text-white">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start text-sm">
                      <span className="font-medium">{getFirstName()}</span>
                    </div>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-64 mt-2 shadow-lg border border-gray-100 rounded-lg bg-white overflow-hidden"
                >
                  <DropdownMenuLabel className="text-gray-700 font-medium text-base py-3 px-4 bg-gray-50">My Account</DropdownMenuLabel>
                  <div className="p-1">
                    <DropdownMenuItem onClick={() => navigate('/dashboard/settings')} className="rounded-md py-3 px-4 flex items-center cursor-pointer hover:bg-gray-50 transition-colors">
                      <Settings className="mr-3 h-5 w-5 text-gray-500" />
                      <span className="text-gray-700">Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onLogout} className="rounded-md py-3 px-4 flex items-center cursor-pointer hover:bg-gray-50 transition-colors">
                      <LogOut className="mr-3 h-5 w-5 text-gray-500" />
                      <span className="text-gray-700">Log out</span>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        {/* Content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
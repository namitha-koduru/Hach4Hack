import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Plus, Menu, X } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { name: 'Teams', href: '/teams' },
    { name: 'Hackathons', href: '/hackathons' },
  ];

  if (user) {
    navLinks.push({ name: 'Dashboard', href: '/dashboard' });
    navLinks.push({ name: 'Requests', href: '/requests' });
    if (user.role === 'ADMIN') {
      navLinks.push({ name: 'Admin', href: '/admin' });
    }
  }

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-[#080a08]/95 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-8">
          {/* Zone 1: Brand Wordmark + Isometric Forge Cube Mark */}
          <Link
            to="/"
            className="flex items-center gap-2.5 text-[#f5f7f2] font-display font-extrabold text-lg tracking-tight whitespace-nowrap shrink-0 group focus-visible:outline-none"
          >
            <span className="w-8 h-8 rounded-lg bg-[#111411] border border-[#d4ff33]/35 flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-6 group-hover:scale-105 group-hover:border-[#d4ff33]">
              <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none" aria-hidden="true">
                <path d="M16 4L27 10L16 16L5 10L16 4Z" fill="#D4FF33" />
                <path d="M5 12L15 17.5V28L5 22.5V12Z" fill="#F5F7F2" fillOpacity="0.9" />
                <path d="M27 12L17 17.5V28L27 22.5V12Z" fill="#181C17" stroke="#D4FF33" strokeWidth="1.5" strokeLinejoin="round" />
                <circle cx="16" cy="10" r="1.6" fill="#080A08" />
              </svg>
            </span>
            <span className="tracking-tight transition-colors duration-300 group-hover:text-[#d4ff33]">
              TEAMFORGE
            </span>
          </Link>

          {/* Zone 2: Navigation Links */}
          <nav aria-label="Primary" className="hidden md:flex items-center gap-7">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.name}
                  to={link.href}
                  className={`relative py-1 text-sm font-medium whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    active ? 'text-[#d4ff33]' : 'text-[#9ca396] hover:text-[#f5f7f2]'
                  }`}
                >
                  {link.name}
                  <span
                    aria-hidden="true"
                    className={`absolute left-0 right-0 -bottom-0.5 h-[2px] bg-[#d4ff33] origin-left transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      active ? 'scale-x-100' : 'scale-x-0'
                    }`}
                  />
                </Link>
              );
            })}
          </nav>

          {/* Zone 3: Primary Action Bar */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            {user ? (
              <>
                <Link
                  to="/profile"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-[#f5f7f2] bg-[#111411] hover:bg-[#161a16] border border-white/10 whitespace-nowrap transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-[#d4ff33]" />
                  <span>{user.name}</span>
                </Link>

                <Link
                  to="/teams/create"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#d4ff33] hover:bg-[#e1ff66] text-[#080a08] whitespace-nowrap transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Create Team</span>
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-[#9ca396] hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors"
                  title="Log out"
                  aria-label="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold text-[#9ca396] hover:text-[#f5f7f2] whitespace-nowrap transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#d4ff33] hover:bg-[#e1ff66] text-[#080a08] whitespace-nowrap transition-colors"
                >
                  Register Now
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg text-[#9ca396] hover:text-[#f5f7f2] hover:bg-[#111411] border border-white/10"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#080a08] border-b border-white/10 px-4 pt-3 pb-6 space-y-4">
          <div className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive(link.href)
                    ? 'bg-[#d4ff33]/10 text-[#d4ff33] border border-[#d4ff33]/30'
                    : 'text-[#9ca396] hover:text-[#f5f7f2] hover:bg-[#111411]'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div className="pt-3 border-t border-white/10 space-y-2.5">
            {user ? (
              <>
                <Link
                  to="/teams/create"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#d4ff33] text-[#080a08]"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  Create Team
                </Link>
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-xs font-medium text-[#f5f7f2] bg-[#111411] border border-white/10"
                >
                  <User className="w-3.5 h-3.5 text-[#d4ff33]" />
                  {user.name}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2 rounded-lg text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20"
                >
                  Log Out
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2.5 rounded-lg text-xs font-semibold text-[#f5f7f2] bg-[#111411] border border-white/10"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#d4ff33] text-[#080a08]"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};



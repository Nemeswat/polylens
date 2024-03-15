// src/components/ui/theme-toggle.tsx
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

export const ThemeToggle = () => {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme) {
      setTheme(storedTheme);
    }
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  return (
    <button
      onClick={toggleTheme}
      className="rounded-full p-2 transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-gray-800"
    >
      {theme === 'dark' ? (
        <SunIcon className="h-6 w-6 text-white" />
      ) : (
        <MoonIcon className="h-6 w-6 text-gray-900" />
      )}
    </button>
  );
};
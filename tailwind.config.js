/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./src/**/*.{js,jsx,ts,tsx}"],
    darkMode: 'class',
    theme: {
      extend: {
        keyframes: {
          'cc-spin': {
            'from': { transform: 'rotate(0deg)' },
            'to': { transform: 'rotate(360deg)' }
          }
        },
        animation: {
          'cc-spin': 'cc-spin 1s linear infinite'
        }
      },
    },
    plugins: [],
    prefix: 'cc-',
    corePlugins: {
      preflight: false,
    },
    safelist: [
      // Basic utility classes
      'cc-opacity-0',
      'cc-opacity-50',
      'cc-opacity-100',
      'cc-transition-opacity',
      'cc-duration-200',
      'cc-duration-300',
      'cc-ease-in-out',
      'cc-animate-spin',
      'cc-w-4',
      'cc-h-4',
      'cc-gap-2',
      'cc-gap-3',
      'cc-items-center',
      'cc-justify-end',
      'cc-flex',
      'cc-flex-col',
      'cc-mt-4',
      'cc-text-xs',
      'cc-text-sm',
      'cc-font-medium',
      'cc-px-4',
      'cc-py-2',
      'cc-rounded-lg',
      
      // Dark mode classes
      'dark:cc-bg-gray-800/50',
      'dark:cc-text-white',
      'dark:cc-text-gray-300',
      'dark:cc-text-gray-400',
      'dark:cc-text-gray-500',
      'dark:hover:cc-bg-gray-800/50',
      'dark:hover:cc-text-gray-300',
      'dark:cc-border-gray-700',
      
      // Background colors
      'cc-bg-gray-100',
      'cc-bg-blue-100',
      'dark:cc-bg-blue-900/50',
      
      // Text colors
      'cc-text-gray-800',
      'cc-text-gray-900',
      'cc-text-gray-600',
      'cc-text-blue-600',
      'cc-text-blue-700',
      'dark:cc-text-blue-200',
      'dark:cc-text-blue-400',
      
      // Hover states
      'hover:cc-bg-gray-100',
      'hover:cc-text-gray-600',
      'hover:cc-text-gray-800',
      'hover:cc-bg-blue-200',
      'dark:hover:cc-bg-blue-800/50',
      'dark:hover:cc-text-blue-300',
      
      // Border colors
      'cc-border-gray-200',
      
      // Component specific classes
      'loading-spinner',
      'loading-spinner-container',
      'cc-animate-spin'
    ]
  };
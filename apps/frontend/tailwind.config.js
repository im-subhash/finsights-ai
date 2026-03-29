/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      boxShadow: {
        glow: "0 0 0 1px rgba(239, 68, 68, 0.25), 0 0 30px rgba(239, 68, 68, 0.12)"
      }
    }
  },
  plugins: []
};


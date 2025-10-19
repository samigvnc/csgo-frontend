/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: { browser: true, es2021: true, node: true },
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  settings: { react: { version: "detect" } },
  plugins: ["react", "react-hooks"],
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    // React 17+ yeni JSX transform: React'ı import etmeden JSX kullanmayı destekler
    "plugin:react/jsx-runtime",
    "plugin:react-hooks/recommended",
  ],
  rules: {
    // Build'i kıran kuralları kapatalım / yumuşatalım
    "react/no-unescaped-entities": "off",   // ' işaretini JSX içinde escape istemesin
    "react/react-in-jsx-scope": "off",      // JSX için React import zorunlu olmasın
    "no-unused-vars": "warn",               // kullanılmayan import/var'lar uyarı olsun
    "react-hooks/exhaustive-deps": "off",   // dependency uyarılarını kapat
    // Bazı ortamlar "react-hooks/purity" vb. kurallar da ekleyebiliyor; kapatalım:
    "react-hooks/purity": "off",
    "react-hooks/set-state-in-effect": "off",
  },
};

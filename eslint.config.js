import grailwind from "@grailwind/eslint-plugin";
import html from "@html-eslint/parser";

export default [
  {
    files: ["**/*.{js,mjs}"],
    rules: {
      curly: ["error", "all"],
    },
  },
  {
    files: ["docs/**/*.html"],
    languageOptions: { parser: html },
    ...grailwind.configs.recommended,
  },
];

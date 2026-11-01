import grailwind from "@grailwind/eslint-plugin";
import html from "@html-eslint/parser";

export default [
  {
    files: ["docs/**/*.html"],
    languageOptions: { parser: html },
    ...grailwind.configs.recommended,
  },
];

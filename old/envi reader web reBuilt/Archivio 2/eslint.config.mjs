import globals from "globals";
import pluginJs from "@eslint/js";

export default [
  {
    languageOptions: { globals: globals.browser },
  },
  pluginJs.configs.recommended,
  {
    rules: {
      "no-undef": "error",  // Assicurati che questa regola sia presente e impostata su "error"
    },
  },
];
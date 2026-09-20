import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/out/**",
      "**/build/**",
      "**/android/**",
      "**/mini-services/**",
      "**/stitch_mobile_navigation_component_suite*/**",
      "**/examples/**",
      "**/skills/**",
      "**/public/**",
      "**/scratch/**",
      "**/scripts/**",
      "**/tests/**",
      "**/.zscripts/**",
      "**/*.log",
      "next-env.d.ts",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // TypeScript rules
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/prefer-as-const": "off",
      
      // React rules (warning level for React 19 transitions)
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react/no-unescaped-entities": "off",
      "react/display-name": "off",
      
      // Next.js rules
      "@next/next/no-img-element": "off",
      "@next/next/no-html-link-for-pages": "off",
      
      // General JavaScript rules
      "prefer-const": "warn",
      "no-console": "off",
      "no-debugger": "warn",
      "no-empty": "warn",
      "no-irregular-whitespace": "off",
      "no-case-declarations": "off",
      "no-fallthrough": "off",
      "no-undef": "off",
    },
  },
];

export default eslintConfig;

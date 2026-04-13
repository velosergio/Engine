import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

// Workaround ESLint 10: evita settings react "detect" (usa getFilename, removido en v10).
// Contexto: https://github.com/vercel/next.js/issues/89764
/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    name: "engine/react-version-eslint-10",
    settings: {
      react: {
        version: "19.2",
      },
    },
  },
];

export default eslintConfig;

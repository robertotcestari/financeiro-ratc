import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const eslintConfig = [
  // Ignore generated Prisma client output
  { ignores: ["app/generated/prisma/**", "tests/**"] },
  ...nextCoreWebVitals,
  ...nextTypeScript,
];

export default eslintConfig;

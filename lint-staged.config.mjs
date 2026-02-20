export default {
  '*.(css|js|json|jsx|md|mjs|mts|ts|tsx|yml|yaml)': ['prettier --write'],
  '*.(js|jsx|mjs|mts|ts|tsx)': ['eslint --fix --max-warnings 0'],
};

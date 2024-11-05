export default {
  '*': ['prettier --ignore-unknown --write'],
  '*.(cjs|js|jsx|mjs|mts|ts|tsx)': ['eslint --fix --max-warnings 0'],
};

export default {
  '*': ['prettier --write --ignore-unknown'],
  '*.(js|jsx|mjs|mts|ts|tsx)': [
    'eslint --fix --max-warnings 0 --no-warn-ignored',
  ],
};

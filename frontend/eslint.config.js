import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import pluginVue from 'eslint-plugin-vue';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.{js,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['**/*.vue'],
    rules: {
      // 核心规则无法识别 <script setup> 中仅被模板引用的绑定，避免误报。
      'no-useless-assignment': 'off',
    },
  },
  {
    files: ['vite.config.js', 'eslint.config.js', '**/*.spec.js'],
    languageOptions: { globals: { ...globals.node } },
  },
  prettier,
];

import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // La CSP (style-src 'self') bloque les attributs style : tout passe par les feuilles CSS.
      'no-restricted-syntax': [
        'error',
        { selector: "JSXAttribute[name.name='style']", message: 'Pas de style en ligne : la CSP le bloque. Utilisez une classe CSS.' },
      ],
    },
  },
)

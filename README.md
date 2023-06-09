<h1 align="center">🔺 Add PostCSS to Svelte</h1>

[![GitHub issues by-label](https://img.shields.io/github/issues/svelte-add/svelte-add/confirmed%20bug?color=%23DC2626)](https://github.com/svelte-add/svelte-add/issues?q=is%3Aopen+is%3Aissue+label%3A%22confirmed+bug%22)
[![GitHub issues by-label](https://img.shields.io/github/issues/svelte-add/svelte-add/support%20question?color=%23FACC15)](https://github.com/svelte-add/svelte-add/issues?q=is%3Aopen+is%3Aissue+label%3A%22support+question%22)

This is an adder for `svelte-add`; you should [read its `README`](https://github.com/svelte-add/svelte-add#readme) before continuing here.

## ➕ Adding PostCSS

This adder's codename is `postcss`, and can be used like so:

```sh
npx svelte-add@latest postcss
```

### 🏞 Supported environments

This adder supports SvelteKit and Vite-powered Svelte apps (all the environments `svelte-add` currently supports).

### ⚙️ Options

- `autoprefixer` (default `true`): whether or not to install and set up [Autoprefixer](https://github.com/postcss/autoprefixer).

```sh
npx svelte-add@latest postcss --postcss-autoprefixer
```

## 🛠 Using PostCSS

After the adder runs,

- You can write PostCSS syntax in the `style lang="postcss"` blocks in Svelte files.

- You can write PostCSS syntax in the `src/app.postcss` file.

  This is your global stylesheet because it will be active on every page of your site.

- You can install more [PostCSS plugins](https://github.com/postcss/postcss/blob/main/docs/plugins.md) and configure them in the `postcss.config.cjs` file.

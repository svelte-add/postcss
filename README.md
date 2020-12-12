<h1 align="center">🔺 Add PostCSS to Svelte</h1>

## ❓ What is this?
This is an **experimental** command to run to add PostCSS to your SvelteKit project.

## 🛠 Usage
You must start with a fresh copy of the official SvelteKit template, which is currently created by running this command:
```sh
npm init svelte@next
# By the way, please listen to its warnings that SvelteKit is an alpha project
# https://svelte.dev/blog/whats-the-deal-with-sveltekit#When_can_I_start_using_it
```

Once that is set up, run this command in your project directory to set up PostCSS:
```sh
npx use-preset babichjacob/svelte-add-postcss --no-ssh
```

After the preset runs,
* You can write PostCSS syntax in the `style` blocks in Svelte files.

* You can write PostCSS syntax in the `src/routes/_global.pcss` file.
  
  This is your global stylesheet because it will be active on every page of your site.

* All your CSS will be minified for production with CSSNano.

* You can apply *another* [Svelte Adder](https://github.com/babichjacob/svelte-adders) to your project for more functionality. Specifically, check out [svelte-add-tailwindcss](https://github.com/babichjacob/svelte-add-tailwindcss)

## 😵 Help! I have a question
[Create an issue](https://github.com/babichjacob/svelte-add-postcss/issues/new) and I'll try to help.

## 😡 Fix! There is something that needs improvement
[Create an issue](https://github.com/babichjacob/svelte-add-postcss/issues/new) or [pull request](https://github.com/babichjacob/svelte-add-postcss/pulls) and I'll try to fix.

These are new tools, so there are likely to be problems in this project. Thank you for bringing them to my attention or fixing them for me.

## 📄 License
MIT

---

*Repository preview image generated with [GitHub Social Preview](https://social-preview.pqt.dev/)*

_This README was generated with ❤️ by [readme-md-generator](https://github.com/kefranabg/readme-md-generator)_

# Contributing to EnviReader

Thanks for taking the time. EnviReader is a research and teaching tool from the School of Architecture and Design Eduardo Vittoria, University of Camerino, and reports from people who use ENVI-met are the most useful contribution.

## Reporting a problem

Open an issue and include:

- the browser and its version;
- the ENVI-met version that produced the output, if you know it;
- which view and dataset you were looking at, and what you expected to see;
- a screenshot, if it helps.

Please do not attach simulation files you are not allowed to share. If a file is needed to reproduce the problem, say so in the issue and we will find a way.

## Questions and ideas

Open an issue for questions about how to use the app and for feature ideas.

## Code

```bash
npm install
npm run dev
npm run lint
npm run build && npm run audit:privacy
```

- Keep pull requests small, one change each.
- User-facing text goes through the translations in `public/translations.json` (five languages: en, it, es, fr, de). If you can't translate a string, add the English text and say so in the pull request.
- The app must not contact any host or store any key that the privacy notice (`src/data/privacyText.js`) does not declare. `npm run audit:privacy` checks this after a build.
- Issues labelled [good first issue](https://github.com/grazianoEnzoMarchesani/EnviReader/labels/good%20first%20issue) are a good place to start.

## License

By contributing you agree that your contribution is released under the GNU General Public License v3.0 or later, like the rest of the project.

# Joseph Amal’s Notebook

A portfolio in the form of a black notebook on a dark desk. Click the cover and the notebook opens; its pages are the portfolio, two at a time (left and right), like a real open book. On phones and narrow windows it shows one page at a time, and the left page's content is placed on the right page instead. Plain HTML, CSS and classic scripts. There is no build step and nothing to install.

## Open it

- **Quickest:** double-click `index.html`. It works straight from the file system.
- **Local server** (closer to how it runs once hosted):
  ```sh
  python -m http.server 5173
  ```
  Run this inside the `site/` folder, then open <http://localhost:5173/>.

Links to a single spread work: `index.html#/projects`, `#/certificates`, `#/contact` and so on open the notebook there and skip the desk.

## The spreads

| Spread | Left page | Right page |
| --- | --- | --- |
| About | Inside the front cover: the “If found” plate and the business card (phone, email, LinkedIn, résumé download) | About: name, photo, summary, the roles sought, what is current |
| Education | The degree in full | School, languages, learning beyond the classroom |
| Skills | The skills index (first half of the groups), with the project pages each skill was used on | The rest of the index, what was studied through certification, soft skills |
| Projects: contents | The list of projects: number, title and description; a title opens the project | The list, continued |
| Project, spread 1 | Starts here: “Back to all projects”, title, **Live demo / GitHub** buttons, summary, purpose, how it works | The screenshot or photo (touch it to open it large) and the key numbers |
| Project, spread 2 | Results: tables, paper, code | Problems solved, technologies, team, evidence; “End of P-0N” |
| Experience | The experience log | The work log, dated |
| Achievements | The conference paper, with its certificate | Prizes, hackathons and roles |
| Certificates | The register | The register, continued |
| Contact | Contact details and the roles sought | **Ask this notebook**: visitors type a question about Joseph and get an answer written from these pages, with the page to turn to |

“Ask this notebook” (`js/ui/ask.js`) runs entirely in the visitor's browser. It matches the question to a topic (a named project or skill first, then education, skills, experience and so on) and writes the answer from `js/data/`. Nothing typed is sent anywhere. For a technology the notebook does not mention, it says so and gives the email address instead of guessing. To make it answer about a new kind of question, add words to `TOPICS` (or a skill to `SKILL_WORDS`) in that file.

## Where the content lives

Every fact on the site comes from `js/data/`. Change the data, not the page scripts.

| File | What it holds |
| --- | --- |
| `js/data/profile.js` | Name, headline, summary, photo, languages, contact details, **cover quote** |
| `js/data/education.js` | Qualifications |
| `js/data/experience.js` | Experience (`Notebook.data.experience`) and recognition (`Notebook.data.recognition`) |
| `js/data/projects.js` | Projects: one object per project, in the order they appear |
| `js/data/skills.js` | Skill groups, where each skill was used, what was studied, soft skills |
| `js/data/certificates.js` | Certificate groups and their files |
| `js/data/blogs.js` | Notes / articles (empty for now; the Notes page shows an empty state) |
| `js/data/site.js` | Section order (the order of spreads and tabs) and the inside-cover “If found” note |

Images live in `assets/img/`, and certificates in `assets/certificates/` (`<id>.webp`, `<id>-thumb.webp`, and the original PDF in `pdf/<id>.pdf`).

A field set to `null` or `[]` is simply not shown.

## Common edits

**Change the cover title.** In `js/data/profile.js`, edit `cover.quote` (it is set in gold capitals on two balanced lines, without the closing full stop). The name on the cover is `cover.name`.

**Change the page papers.** Every page is printed on one of the aged sheets in `assets/img/pages` (9:16, one faded drawing in a corner). They are used in the order listed in `SHEETS` in `js/ui/eras.js` and repeat when there are more pages than sheets. For each sheet, `box` is where its drawing sits (fractions of the sheet), `x`/`y` say which corner to keep when a screen crops the sheet, and `paper` is the paper's tone. Wherever a line of writing crosses the drawing, the drawing is rubbed back softly under it; how far is `.is-erased > .leaf__erase { opacity }` in `css/paper.css`. Left and right pages are numbered like a book (right pages odd), and each page keeps its sheet.

**Fonts.** Headings are Cinzel, text is Alegreya (labels and data in Alegreya SC), code excerpts are Courier Prime. They are set in `css/tokens.css` (`--font-display`, `--font-serif`, `--font-sans`, `--font-mono`, `--font-code`) and loaded in `index.html`.

**Replace the desk photo.** Put the new photo at `assets/img/desk/desk-photo.webp`. If its proportions are not 1672 × 941, update `PHOTO_AR` in `js/scene/desk.js` and `--photo-ar` in `css/scene.css`. The closed book rests at `REST` (fractions of the photo) and the candle glow is placed at 77% / 5% in `.desk__glow`; move them if the new photo's clear area or candle sit elsewhere.

**Add a project.** In `js/data/projects.js`, copy an existing project object and change the fields. Give it a unique `id` and the next `number` (`'04'`). It is listed on the contents spread (`#/projects`) and gets its own spread at `#/projects/<id>`: the entry on the right, and its workings (sketch, photos, team, code, comparison) on the left. Leave anything you have no source for as `null` or `[]`.

**Add a certificate.**
1. Put the files in `assets/certificates/`: `<id>.webp` (about 1400 px wide), `<id>-thumb.webp` (about 360 px wide) and `pdf/<id>.pdf`.
2. In `js/data/certificates.js`, add an entry to the right group. For Coursera, use the `coursera('<id>', { ... })` helper, which fills in the file paths.

**Add a note / article.** In `js/data/blogs.js`, add an object at the top of the list (newest first). The format is in the comment at the top of that file:
```js
{ id: 'my-first-note', title: '…', date: { iso: '2026-10-01', label: '1 Oct 2026' }, summary: '…', url: 'https://…', tags: ['…'] }
```

**Reorder, rename or remove a tab.** In `js/data/site.js`, edit `sections`. The order there is the order of the pages and the tabs, and `tab` is the label. Remove an entry to drop that section.

**Add a whole new section (tab).**
1. Add `{ id: 'talks', tab: 'Talks' }` to `sections` in `js/data/site.js`.
2. Create `js/pages/talks.js`. It registers one or more spreads, built from the shared primitives in `js/ui/paper.js`. `build` is the right page; `facing` (optional) is the left page:
   ```js
   window.Notebook = window.Notebook || {};
   (function (N) {
     N.pages.register('talks', function (data, ui) {
       return [{
         slug: 'talks', title: 'Talks', running: 'Talks', facingRunning: 'Talks',
         facing: function () {
           return N.h('section', null, ui.pageHeader({ eyebrow: 'Section', title: 'Talks', opener: true }));
         },
         build: function () {
           return N.h('section', null,
             ui.prose(['…']));
         }
       }];
     });
   })(window.Notebook);
   ```
3. In `index.html`, add `<script defer src="js/pages/talks.js"></script>` next to the other page scripts, **before** `js/core/notebook.js`. If the section needs its own styles, add `css/pages/talks.css` as well.

Page numbers, running heads, tabs and cross-references (“see p. 9”) are all calculated, so nothing needs renumbering.

## How it is put together

- `css/tokens.css`: colours, type, motion and page geometry
- `css/base.css`, `css/paper.css`, `css/notebook.css`: reset, page primitives, the notebook frame and page turn (two-page spreads: a turned leaf comes to rest on the left, and its back is the new left page)
- `js/ui/eras.js`: dresses each page in its paper and rubs a drawing back where writing crosses it
- `css/scene.css`, `js/scene/*`: the desk photograph and candle glow, the closed leather book (textures, gold tooling, title), and the opening animation
- `js/core/notebook.js`: spread assembly, numbering, page turns, tabs, keyboard, swipe, hash routing
- `js/ui/ask.js` + `css/pages/ask.css`: the “Ask this notebook” page
- `js/ui/fit.js`: no page scrolls. Side by side, each page's writing is scaled (74–110%) to fill its page and spare room is shared out between its blocks; one page at a time (phones), a page is split into screen-sized columns that Next / Previous step through. Only the question page scrolls. Limits are `ZMIN`, `ZMAX` and `GAP_MAX` at the top of the file.
- `js/pages/*.js` + `css/pages/*.css`: one module per section
- `js/main.js`: boot order

Keyboard: ← → or PageUp / PageDown turn pages, and Home / End jump to the first / last spread. On touch screens, swipe sideways. Motion is reduced automatically when the visitor’s system asks for it.

## Deploy

The `site/` folder is the whole website. All paths are relative, so it works from any sub-folder.

- **GitHub Pages:** push the repository, then go to *Settings → Pages* and serve from the branch. Choose the `/site` folder if it is offered; otherwise move the contents of `site/` to the repository root or into `/docs`.
- **Netlify:** drag the `site/` folder onto <https://app.netlify.com/drop>, or connect the repository with *Publish directory* = `site` and no build command.
- **Vercel:** import the repository, set *Root Directory* = `site`, *Framework* = “Other”, and leave the build command empty.

The only external request is Google Fonts. If it fails to load, the site falls back to system fonts.

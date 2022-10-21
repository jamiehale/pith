# Pith

Pith is a very simple and super opinionated static website generator. It is in the very early stages. Expect frequent changes.

Folders must look like this:

    /journal
    /journal/2022/10/12
    ...
    /pages
    /static
    /templates

Files under `journal` must be named `YYYY-MM-DD.md` for now and be located in the corresponding `YYYY/MM` subfolder.

Files under `pages` can be `.md` or `.html`, are copied once rendered (Markdown and templates) and can have Jekyll-style front matter sections like:

    ---
    layout: default
    title: About
    ---

Files under `static` are copied verbatim after `journal` and `pages` are built.

Files under `templates` are used when you specify `layout: ...` in the front matter.

## Usage

    $> yarn install
    $> PITH_ROOT=/path/to/root yarn build

# Stationary (WIP)

Stationary is a dead simple tool to generate a static blog from markdown files. Its aims are to be;
- Simple to configure
- Simple to style

## Config

```
properties:
  author:
    name: Amman Vedi
    links:
      main: https://github.com/ammanvedi
  stylesheets:
    markdown: styles/markdown.scss
  markdown:
    source: mock-markdown
  output:
    directory: _generated/
```

## Developing

`npm install` - To install packages

`npm run build` - To build the package

`npm run mock` - to run the generator on some mock blog posts

`npm run serve-test` - to start a server on port 6003 to view mock output
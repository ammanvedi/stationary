# Stationary (WIP)

Stationary is a dead simple tool to generate a static blog from markdown files. Its aims are to be;
- Simple to configure
- Simple to style

## Config

```yaml
properties:
  author:
    name: Amman Vedi
    links:
      main: https://github.com/ammanvedi
  stylesheets:
    post: styles/post.scss
    index: styles/index.scss
  markdown:
    source: mock-markdown
  templates:
    index: templates/index.html
    post: templates/post.html
  output:
    directory: _generated/
  extra:
    - template: templates/extra.html
      stylesheet: styles/extra.scss
      slug: test-extra
```

## Markdown
Markdown is parsed and generated into html with [Marked](https://www.npmjs.com/package/marked), so if it works [here](https://marked.js.org/demo/) then it will be fine when passed through this generator

Markdown source directory should contain a set of markdown files and associated yaml metadata file

```text
my-post.md
my-post.yaml
```

The yaml file should contain metadata, here is an example

```yaml
publishDate: "2020-06-16T18:00:28+0000"
tags:
  - flow
  - javascript
  - type-theory
title: flow's type inference quirk
slug: flow-type-inference-quirk-vs-typescript
imageUrl: ''
```
this config will be passed to you in your templates

## Templates
A template should be provided for the index page and the posts page. Both of these use [handlebars](https://github.blog/2020-04-15-npm-has-joined-github/) syntax. 

Index templates are passed the following model

```typescript
export type IndexModel = {
    styles: string,
    config: Config, // the stationary.config.yaml as json
    posts: Array<PostMetadata & {link: string}> // post metadata yaml as json
}
```

Post templates are passed;

```typescript
export type PostModel = {
    styles: string,
    metadata: PostMetadata,
    content: string,
    nextPost: PostMetadata | null,
    previousPost: PostMetadata | null
}
```

## Examples

You can see a complete example usage in the `test/` folder

## Developing

`npm install` - To install packages

`npm run build` - To build the package

`npm run mock` - to run the generator on some mock blog posts

`npm run serve-test` - to start a server on port 6003 to view mock output
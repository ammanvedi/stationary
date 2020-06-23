export type Config = {
    properties: {
        author: {
            name: string,
            links: {
                main: string
            }
        },
        stylesheets: {
            post: string,
            index: string,
        },
        markdown: {
            source: string,
        },
        output: {
            directory: string,
        },
        templates: {
            index: string,
            post: string,
        }
    }
}

export type PostMetadata = {
    publishDate: string,
    tags: Array<string>,
    title: string,
    slug: string,
    imageUrl: string,
}

export type IndexModel = {
    styles: string,
    config: Config,
    posts: Array<PostMetadata & {link: string}>
}

export type PostModel = {
    styles: string,
    metadata: PostMetadata,
    content: string,
    nextPost: PostMetadata | null,
    previousPost: PostMetadata | null
}

export type HtmlString = string;

export type PostPageDefinition = {
    metadata: PostMetadata
    html: HtmlString,
}
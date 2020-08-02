export type ExtraPageDef = {
    template: string,
    stylesheet: string,
    slug: string,
}

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
            partials: {[key: string]: string}
        },
        extra?: Array<ExtraPageDef>
    }
}

export type PostMetadata = {
    publishDate: string,
    tags: Array<string>,
    title: string,
    slug: string,
    imageUrl: string,
    imageUrl2x: string,
    color: string,
}

export type ExtendedPostMetadata = PostMetadata & {link: string, formattedDate: string};

export type IndexModel = {
    styles: string,
    config: Config,
    posts: Array<ExtendedPostMetadata>
}

export type PostModel = {
    styles: string,
    metadata: PostMetadata,
    content: string,
    nextPost: ExtendedPostMetadata | null,
    previousPost: ExtendedPostMetadata | null
}

export type HtmlString = string;

export type PostPageDefinition = {
    metadata: PostMetadata
    html: HtmlString,
}
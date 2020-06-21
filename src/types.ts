export type Config = {
    properties: {
        author: {
            name: string,
            links: {
                main: string
            }
        },
        stylesheets: {
            markdown: string,
        },
        markdown: {
            source: string,
        },
        output: {
            directory: string,
        }
    }
}

export type HtmlString = string;

export type PageDefinition = {
    name: string,
    html: HtmlString,
}
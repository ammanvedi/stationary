import path from 'path';
import yaml from 'js-yaml';
import marked from 'marked';
import fs from 'fs';
import {Config, ExtendedPostMetadata, IndexModel, PostMetadata, PostModel, PostPageDefinition} from "./types";
import Prism from 'prismjs'
import Handlebars from 'handlebars';
// @ts-ignore
import loadLanguages from 'prismjs/components/';
import {compileSass} from "./helpers";
loadLanguages(['graphql', 'typescript', 'javascript', 'jsx', 'tsx', 'json'])

const writeError = (e: Error) => {
    const errorPath = path.join(process.cwd(), '.stationary.log');
    fs.writeFileSync(errorPath, e.toString());
}

const getAllMarkdownFileNames = (pathName: string): Array<string> => {
    const entries = fs.readdirSync(pathName);
    const markdownFiles: Array<string> = [];

    for(let i = 0; i < entries.length; i++) {
        const entryName = entries[i];
        const isMarkdownFile = /[^\.]+\.md$/.test(entryName);
        if(isMarkdownFile) {
            markdownFiles.push(path.join(pathName, entryName));
        }
    }

    return markdownFiles;

}

const overrideRenderers =  {
    code(code: string, language: string | undefined, isEscaped: boolean): string {
        if (language) {
            const highlighted = Prism.highlight(code, Prism.languages[language], language);
            return `<pre class="code-block language-${language}"><code class="language-${language}">${highlighted}</code></pre>`
        }
        return 'Snippet needs language added!!!!'
    }
}

const generatePage = (
    markdownFileContent: string,
    currentMetadata: PostMetadata,
    nextMetadata: PostMetadata,
    previousMetadata: PostMetadata,
    config: Config,
    cwd = process.cwd()
): PostPageDefinition => {
    const pageTemplatePath = path.join(cwd, config.properties.templates.post);
    const pageTemplate = fs.readFileSync(pageTemplatePath).toString();

    const stylesPath = path.join(cwd, config.properties.stylesheets.post);

    // @ts-ignore
    marked.use({renderer: overrideRenderers});

    const postModel: PostModel = {
        styles: compileSass(stylesPath),
        content: marked(markdownFileContent),
        metadata: currentMetadata,
        nextPost: getExtraMetaDataProps(nextMetadata),
        previousPost: getExtraMetaDataProps(previousMetadata),
    }
    const template = Handlebars.compile(pageTemplate);
    const html = template(postModel)

    return {
        metadata: currentMetadata,
        html,
    }
}

const generatePosts = (config: Config, cwd: string = process.cwd()): Array<PostMetadata> => {
    const markdownDirectory = path.join(cwd, config.properties.markdown.source);
    const markdownFiles = getAllMarkdownFileNames(markdownDirectory);

    const postMetadata: Array<PostMetadata> = markdownFiles.map(markdownPath => {
        const metadataPath = `${markdownPath.split('.')[0]}.yaml`;
        let metadata: PostMetadata;
        try {
            metadata = yaml.safeLoad(fs.readFileSync(metadataPath, 'utf-8'))
        } catch {
            throw new Error(`Expected to find metadata file ${metadataPath}`)
        }
        return metadata;
    });

    const pages = markdownFiles.map((markdownPath, ix) => {
        const fileContents = fs.readFileSync(markdownPath).toString();
        return generatePage(
            fileContents,
            postMetadata[ix],
            postMetadata[ix + 1] || null,
            postMetadata[ix - 1] || null,
            config
        )
    });

    const outPath = path.resolve(cwd, config.properties.output.directory);

    if (!fs.existsSync(outPath)) {
        fs.mkdirSync(outPath);
    }

    pages.forEach(p => {
        const outFile = path.join(outPath, `${p.metadata.slug}.html`)
        fs.writeFileSync(outFile, p.html);
    });

    return postMetadata;
}

const getExtraMetaDataProps = (meta?: PostMetadata): ExtendedPostMetadata | null => {
    if (!meta) {
        return null;
    }
    return {
        ...meta,
        link: `/${meta.slug}.html`,
        formattedDate: new Date(meta.publishDate).toLocaleDateString('en-US', {year: 'numeric', month: 'short', day: 'numeric'})
    }
}

const generateIndex = (config: Config, posts: Array<PostMetadata>, cwd = process.cwd()) => {

    const indexTemplatePath = path.join(cwd, config.properties.templates.index);
    const indexTemplate = fs.readFileSync(indexTemplatePath).toString();
    const compiledIndex = Handlebars.compile(indexTemplate);

    const stylesPath = path.join(cwd, config.properties.stylesheets.index);

    const model: IndexModel = {
        config,
        styles: compileSass(stylesPath),
        posts: posts.map(p => ({
            link: '/404.html',
            formattedDate: '',
            ...p,
            ...getExtraMetaDataProps(p)
        }))
    }

    const html = compiledIndex(model);
    const outPath = path.resolve(cwd, config.properties.output.directory, 'index.html');

    fs.writeFileSync(outPath, html);
}

try {
    const configPath = path.join(process.cwd(), 'stationary.config.yaml');
    const cfg = yaml.safeLoad(fs.readFileSync(configPath, 'utf-8')) as Config;

    Object.keys(cfg.properties.templates.partials).forEach(partial => {
        const partialPath = cfg.properties.templates.partials[partial];
        const partialFullPath = path.join(process.cwd(), partialPath);
        const partialContent = fs.readFileSync(partialFullPath, 'utf-8');
        Handlebars.registerPartial(partial, partialContent);
    })

    const metadata = generatePosts(cfg).sort(({publishDate: aPub}, {publishDate: bPub}) => {
        const aPubDate = new Date(aPub).getTime();
        const bPubDate = new Date(bPub).getTime();

        return bPubDate - aPubDate;
    });
    generateIndex(cfg, metadata)

} catch (e) {
    console.log('Something went wrong take a look at .stationary.log for more detail');
    writeError(e);
}


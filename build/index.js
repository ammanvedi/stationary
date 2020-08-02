#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const marked_1 = __importDefault(require("marked"));
const fs_1 = __importDefault(require("fs"));
const prismjs_1 = __importDefault(require("prismjs"));
const handlebars_1 = __importDefault(require("handlebars"));
// @ts-ignore
const components_1 = __importDefault(require("prismjs/components/"));
const helpers_1 = require("./helpers");
components_1.default(['graphql', 'typescript', 'javascript', 'jsx', 'tsx', 'json']);
const writeError = (e) => {
    const errorPath = path_1.default.join(process.cwd(), '.stationary.log');
    fs_1.default.writeFileSync(errorPath, e.toString());
};
const getAllMarkdownFileNames = (pathName) => {
    const entries = fs_1.default.readdirSync(pathName);
    const markdownFiles = [];
    for (let i = 0; i < entries.length; i++) {
        const entryName = entries[i];
        const isMarkdownFile = /[^\.]+\.md$/.test(entryName);
        if (isMarkdownFile) {
            markdownFiles.push(path_1.default.join(pathName, entryName));
        }
    }
    return markdownFiles;
};
const overrideRenderers = {
    code(code, language, isEscaped) {
        if (language) {
            const highlighted = prismjs_1.default.highlight(code, prismjs_1.default.languages[language], language);
            return `<pre class="code-block language-${language}"><code class="language-${language}">${highlighted}</code></pre>`;
        }
        return 'Snippet needs language added!!!!';
    }
};
const generatePage = (markdownFileContent, currentMetadata, nextMetadata, previousMetadata, config, cwd = process.cwd()) => {
    const pageTemplatePath = path_1.default.join(cwd, config.properties.templates.post);
    const pageTemplate = fs_1.default.readFileSync(pageTemplatePath).toString();
    const stylesPath = path_1.default.join(cwd, config.properties.stylesheets.post);
    // @ts-ignore
    marked_1.default.use({ renderer: overrideRenderers });
    const postModel = {
        styles: helpers_1.compileSass(stylesPath),
        content: marked_1.default(markdownFileContent),
        metadata: currentMetadata,
        nextPost: getExtraMetaDataProps(nextMetadata),
        previousPost: getExtraMetaDataProps(previousMetadata),
    };
    const template = handlebars_1.default.compile(pageTemplate);
    const html = template(postModel);
    return {
        metadata: currentMetadata,
        html,
    };
};
const generatePosts = (config, cwd = process.cwd()) => {
    const markdownDirectory = path_1.default.join(cwd, config.properties.markdown.source);
    const markdownFiles = getAllMarkdownFileNames(markdownDirectory);
    const postMetadata = markdownFiles.map(markdownPath => {
        const metadataPath = `${markdownPath.split('.')[0]}.yaml`;
        let metadata;
        try {
            metadata = js_yaml_1.default.safeLoad(fs_1.default.readFileSync(metadataPath, 'utf-8'));
        }
        catch (_a) {
            throw new Error(`Expected to find metadata file ${metadataPath}`);
        }
        return metadata;
    });
    const pages = markdownFiles.map((markdownPath, ix) => {
        const fileContents = fs_1.default.readFileSync(markdownPath).toString();
        return generatePage(fileContents, postMetadata[ix], postMetadata[ix + 1] || null, postMetadata[ix - 1] || null, config);
    });
    const outPath = path_1.default.resolve(cwd, config.properties.output.directory);
    if (!fs_1.default.existsSync(outPath)) {
        fs_1.default.mkdirSync(outPath);
    }
    pages.forEach(p => {
        const outFile = path_1.default.join(outPath, `${p.metadata.slug}.html`);
        fs_1.default.writeFileSync(outFile, p.html);
    });
    return postMetadata;
};
const getExtraMetaDataProps = (meta) => {
    if (!meta) {
        return null;
    }
    return {
        ...meta,
        link: `/${meta.slug}.html`,
        formattedDate: new Date(meta.publishDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    };
};
const generateExtraPages = (config, pages, cwd = process.cwd()) => {
    pages.forEach(pageConf => {
        const indexTemplatePath = path_1.default.join(cwd, pageConf.template);
        const indexTemplate = fs_1.default.readFileSync(indexTemplatePath).toString();
        const compiledIndex = handlebars_1.default.compile(indexTemplate);
        const stylesPath = path_1.default.join(cwd, pageConf.stylesheet);
        const model = {
            styles: helpers_1.compileSass(stylesPath),
        };
        const html = compiledIndex(model);
        const outPath = path_1.default.resolve(cwd, config.properties.output.directory, `${pageConf.slug}.html`);
        fs_1.default.writeFileSync(outPath, html);
    });
};
const generateIndex = (config, posts, cwd = process.cwd()) => {
    const indexTemplatePath = path_1.default.join(cwd, config.properties.templates.index);
    const indexTemplate = fs_1.default.readFileSync(indexTemplatePath).toString();
    const compiledIndex = handlebars_1.default.compile(indexTemplate);
    const stylesPath = path_1.default.join(cwd, config.properties.stylesheets.index);
    const model = {
        config,
        styles: helpers_1.compileSass(stylesPath),
        posts: posts.map(p => ({
            link: '/404.html',
            formattedDate: '',
            ...p,
            ...getExtraMetaDataProps(p)
        }))
    };
    const html = compiledIndex(model);
    const outPath = path_1.default.resolve(cwd, config.properties.output.directory, 'index.html');
    fs_1.default.writeFileSync(outPath, html);
};
try {
    const configPath = path_1.default.join(process.cwd(), 'stationary.config.yaml');
    const cfg = js_yaml_1.default.safeLoad(fs_1.default.readFileSync(configPath, 'utf-8'));
    Object.keys(cfg.properties.templates.partials).forEach(partial => {
        const partialPath = cfg.properties.templates.partials[partial];
        const partialFullPath = path_1.default.join(process.cwd(), partialPath);
        const partialContent = fs_1.default.readFileSync(partialFullPath, 'utf-8');
        handlebars_1.default.registerPartial(partial, partialContent);
    });
    const metadata = generatePosts(cfg).sort(({ publishDate: aPub }, { publishDate: bPub }) => {
        const aPubDate = new Date(aPub).getTime();
        const bPubDate = new Date(bPub).getTime();
        return bPubDate - aPubDate;
    });
    generateIndex(cfg, metadata);
    if (cfg.properties.extra) {
        generateExtraPages(cfg, cfg.properties.extra);
    }
}
catch (e) {
    console.log('Something went wrong take a look at .stationary.log for more detail');
    writeError(e);
}

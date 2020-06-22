import path from 'path';
import yaml from 'js-yaml';
import marked, {Renderer} from 'marked';
import fs from 'fs';
import {Config, HtmlString, PageDefinition} from "./types";
import {removeMdExtension} from "./helpers";
import Prism from 'prismjs'
// @ts-ignore
import loadLanguages from 'prismjs/components/';
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
            return `<pre class="language-${language}"><code class="language-${language}">${highlighted}</code></pre>`
        }
        return 'Snippet needs language added!!!!'
    }
}

const generatePage = (markdownPath: string, config: Config): PageDefinition => {
    const fileContents = fs.readFileSync(markdownPath);
    // @ts-ignore
    marked.use({renderer: overrideRenderers});
    const html = `
        <link rel="stylesheet" href="https://rawgit.com/PrismJS/prism-themes/master/themes/prism-synthwave84.css" />
        ${marked(fileContents.toString())}
    `;

    return {
        name: removeMdExtension(path.basename(markdownPath)),
        html
    }
}

const generate = async (config: Config, cwd: string = process.cwd()) => {
    const markdownDirectory = path.join(cwd, config.properties.markdown.source);
    const markdownFiles = getAllMarkdownFileNames(markdownDirectory);
    const pages = markdownFiles.map(markdownPath => generatePage(markdownPath, config));
    const outPath = path.resolve(cwd, config.properties.output.directory);

    if (!fs.existsSync(outPath)) {
        fs.mkdirSync(outPath);
    }

    pages.forEach(p => {

        const outFile = path.join(outPath, `${p.name}.html`)
        fs.writeFileSync(outFile, p.html);
    })
}

try {
    const configPath = path.join(process.cwd(), 'stationary.config.yaml');
    const cfg = yaml.safeLoad(fs.readFileSync(configPath, 'utf-8'));
    generate(cfg).then(() => {
        console.log('Generation Complete!')
    })
} catch (e) {
    console.log('Something went wrong take a look at .stationary.log for more detail');
    writeError(e);
}


import sass from 'node-sass';
import fs from 'fs';

export const compileSass = (filePath: string): string => {
    const fileContent = fs.readFileSync(filePath).toString();
    return sass.renderSync({
        data: fileContent
    }).css.toString();
}
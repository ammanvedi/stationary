"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_sass_1 = __importDefault(require("node-sass"));
const fs_1 = __importDefault(require("fs"));
exports.compileSass = (filePath) => {
    const fileContent = fs_1.default.readFileSync(filePath).toString();
    return node_sass_1.default.renderSync({
        data: fileContent
    }).css.toString();
};

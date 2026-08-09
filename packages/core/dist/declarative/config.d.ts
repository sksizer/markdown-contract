import type { CorpusConfig } from "../runner/index.js";
/** Compile a declarative YAML config (text) into a `CorpusConfig`. `baseDir` anchors contract-ref paths. */
export declare function loadConfig(yamlText: string, baseDir: string): CorpusConfig;
/** Read a YAML config file and compile it; contract refs resolve relative to the file's directory. */
export declare function loadConfigFile(path: string): CorpusConfig;
//# sourceMappingURL=config.d.ts.map
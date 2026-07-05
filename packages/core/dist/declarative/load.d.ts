import type { Contract } from "../core/types.js";
/** Compile a declarative YAML contract (text) into a runtime `Contract`. */
export declare function loadContract(yamlText: string): Contract;
/** Read a `*.contract.yaml` file and compile it into a runtime `Contract`. */
export declare function loadContractFile(path: string): Contract;
/** Build a `Contract` from a raw `{ frontmatter?, body? }` object (no envelope needed — used by inline config contracts). */
export declare function compileContractObject(raw: Record<string, unknown>): Contract;
//# sourceMappingURL=load.d.ts.map
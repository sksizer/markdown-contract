/**
 * The declarative front-end's authoring error — thrown by the YAML loader/compiler when a
 * declarative document is malformed or uses a feature outside the v1 DSL (an unsupported
 * `mcVersion`, a bad `kind`, a non-reducible schema, the deferred `$ref` code escape hatch).
 *
 * Distinct from `ContractError` (a document-time strict-door failure carrying findings) and
 * `ContractBuildError` (a combinator build-time guard). A `DeclarativeError` means the YAML
 * itself could not be compiled into a contract.
 */
export declare class DeclarativeError extends Error {
    constructor(message: string);
}
//# sourceMappingURL=errors.d.ts.map
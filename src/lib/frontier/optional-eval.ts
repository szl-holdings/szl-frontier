/** Optional evaluation. Opt-in does not lift HOLD and cannot execute HANDOFF. */

export const OPTIONAL_EVAL_SCHEMA = "szl.frontier.optional-evaluation/v1";
export const OPTIONAL_EVAL_KEY = OPTIONAL_EVAL_SCHEMA;

export type ExecutionScope = "THIS_ORGAN" | "HANDOFF";

export class OptionalEvalError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.name = "OptionalEvalError";
    this.code = code;
  }
}

export type OptionalEvaluation = {
  schema: typeof OPTIONAL_EVAL_SCHEMA;
  optedIn: boolean;
  productionAuthorization: false;
  promotionEffect: "NONE";
  admittedScopes: ExecutionScope[];
  note: string;
};

export function defaultOptionalEvaluation(): OptionalEvaluation {
  return {
    schema: OPTIONAL_EVAL_SCHEMA,
    optedIn: false,
    productionAuthorization: false,
    promotionEffect: "NONE",
    admittedScopes: [],
    note: "Evaluation is opt-in. Opting in does not lift HOLD.",
  };
}

export function admitOptionalEvaluation(optedIn: boolean): OptionalEvaluation {
  return {
    ...defaultOptionalEvaluation(),
    optedIn,
    admittedScopes: optedIn ? ["THIS_ORGAN"] : [],
  };
}

export function canEvaluate(optedIn: boolean, scope: ExecutionScope): boolean {
  return optedIn === true && scope === "THIS_ORGAN";
}

export function refuseUnauthorizedCompose(optedIn: boolean): void {
  if (!optedIn) throw new OptionalEvalError("OPTIONAL_EVALUATION_REQUIRED");
}

export function refuseHandoffFromThisOrgan(scope: ExecutionScope): void {
  if (scope === "HANDOFF") throw new OptionalEvalError("HANDOFF_NOT_EXECUTABLE_HERE");
}

export function parseStoredOptionalEval(raw: string | null): boolean {
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as { optedIn?: unknown; productionAuthorization?: unknown };
    if (parsed.productionAuthorization === true) return false;
    return parsed.optedIn === true;
  } catch {
    return false;
  }
}

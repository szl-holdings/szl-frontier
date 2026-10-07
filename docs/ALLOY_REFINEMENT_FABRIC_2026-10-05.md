# Alloy Refinement Fabric

**State:** SOURCE PROPOSAL / QUALIFICATION REQUIRED
**Owner:** `szl-holdings/szl-frontier`
**Downstream qualification:** `szl-holdings/szl-forge`
**Memory projection:** `szl-holdings/szl-second-brain`
**Read-only anatomy projection:** `szl-holdings/anatomy`

## Source correction

The primary paper is **“Refining Over Resampling: Test-Time Self-Correction for LLM Reasoning”**, arXiv:2608.05643v1, submitted 6 August 2026. It is a multi-institution paper with authors from the University of Oklahoma, Stanford University, Universitat Pompeu Fabra, and Air University.

The paper does **not** describe GPT-6 Astra paired with Claude Opus 5.5. Its method uses the same base model under role-conditioned generator, critic, and corrector prompts. It samples `N` initial rollouts, performs `D` rounds of continuation, critique, and correction, then selects the final answer by plurality vote without an external verifier or process reward model.

The reported Qwen2.5-1.5B results include MATH500 `26.2` greedy, `29.6` RM@8, and `58.0` for the proposed method; AMC moves from `25.0` greedy/RM@8 to `32.5`. The social-post figures `91.2% recovery`, `<1.8% regressions`, and the named proprietary model pair are not treated as paper claims because they are not present in v1.

Primary source: <https://arxiv.org/abs/2608.05643>

## Fashion-method lineage

We study the useful system primitives, preserve attribution, and rebuild an original SZL implementation rather than copying prompts, code, interfaces, or unverified marketing claims.

| Prior work | Useful primitive | SZL adaptation |
|---|---|---|
| Self-Consistency (arXiv:2203.11171) | diverse sampling plus answer aggregation | bounded breadth with semantic saturation detection and exact receipt accounting |
| Self-Refine (arXiv:2303.17651) | feedback and iterative revision without training | provider-neutral auditor/repairer protocol with no hidden-reasoning persistence |
| Tree of Thoughts (arXiv:2305.10601) | explicit search over intermediate states | public verifiable step DAG rather than opaque chain-of-thought |
| LLMs Cannot Self-Correct Reasoning Yet (arXiv:2310.01798) | self-correction can regress | mandatory unchanged-step hash guard and separate recovery/regression metrics |
| Compute-Optimal Test-Time Scaling (arXiv:2408.03314) | adapt compute to problem difficulty | branch saturation stop, bounded calls, and utility stop |
| MAgICoRe (arXiv:2409.12147) | solver/reviewer/refiner separation and error localization | optional heterogeneous explorer and auditor/repairer, local patch verification, dependent-step re-audit |
| Socratic Self-Refine (arXiv:2511.10621) | fine-grained step confidence and precise refinement | step-bound findings, confidence floor, local patch contract, and handles-only failure memory |
| Refining Over Resampling (arXiv:2608.05643) | breadth plus depth and verifier-free vote | diversity-aware breadth, local depth, model-pair receipts, governance, memory, and proof-chain integration |

## Original SZL contract

The fabric accepts two provider-neutral roles:

1. `EXPLORER` creates bounded candidate branches at nonzero temperature.
2. `AUDITOR_REPAIRER` audits public verifiable steps at a low or deterministic temperature, proposes a replacement for one failed step, and re-audits the replacement plus every dependent step.

The roles may use the same model, as in the primary paper, or different models. Heterogeneous pairing is a qualification hypothesis, not an assumed gain. A pair is promoted only if Forge reproduces better quality or efficiency under exact model, revision, runtime, dataset, and hardware identity.

### Public step graph

A branch is a topologically ordered directed acyclic graph of concise, externally checkable steps:

```text
step_id
summary
previous-step dependencies
evidence references
SHA-256
```

The system neither requests nor stores hidden chain-of-thought. Provider prompts, raw completions, credentials, private graph nodes, and hidden reasoning are excluded from public receipts and Second Brain memory.

### Diversity-aware breadth

For cluster masses `p_j(N)` over `N` candidate branches:

```text
H(N) = - Σ_j p_j(N) log2 p_j(N)
novelty(N) = |C(N)| / N
dominant_mass(N) = max_j p_j(N)
```

The branch budget is a ceiling. Exploration can stop before the ceiling when the recent saturation window adds no new semantic cluster and answer agreement exceeds the policy threshold. This directly prevents blind repetition from consuming the entire budget.

The initial implementation uses deterministic token-set Jaccard clustering as an auditable no-dependency baseline. Forge may qualify embedding-based clustering later, but a new embedding model cannot silently change historical cluster identities.

### Local repair invariant

For a patch to failed step `i`, and descendants `D(i)`, every unrelated step must retain its exact digest:

```text
∀ j ∉ ({i} ∪ D(i)): SHA256(s'_j) = SHA256(s_j)
```

The patch cannot rewrite step dependencies. The replacement step is immediately re-audited. Descendants are re-audited because a locally correct replacement can invalidate downstream calculations. Any unrelated mutation is a hard boundary failure, not a warning.

### Consensus

For normalized terminal answers `a_1 … a_n`:

```text
â = argmax_a Σ_i 1[normalize(a_i) = a]
agreement = votes(â) / n
margin = (votes(â) - votes(runner_up)) / n
```

A plurality result remains a proposal. It is not correctness proof, execution authority, or production authorization.

### Bounded depth and compute

The implementation records every model call and refuses to exceed `max_calls`. A branch stops when no failed step remains, the depth ceiling is reached, the call budget is exhausted, or the residual-error/cost utility falls below policy.

The exact utility is policy-owned and versioned. It cannot be changed silently to make a benchmark look better.

### Heterogeneous complementarity

A different explorer and auditor can help only when their error sets are meaningfully different. Forge should measure pair complementarity on a frozen benchmark:

```text
complementarity(E, A) = 1 - |E ∩ A| / |E ∪ A|
```

where `E` and `A` are normalized error-pattern sets observed under independently bound roles. This metric is diagnostic only. It cannot substitute for task accuracy, recovery, regression, latency, or cost.

## Evidence receipt

Each run emits `szl.refinement.receipt/v1` with:

- task digest, never the raw task in the public receipt;
- exact explorer and auditor provider/model/revision/role/temperature;
- policy and call budget;
- actual branch count, early-stop reason, cluster count, entropy, novelty, and dominant-cluster mass;
- step-bound findings and patch digests;
- unchanged-step regression guard;
- plurality agreement and margin;
- unresolved error codes;
- explicit `NONE` authority for execution, training, promotion, and merge;
- privacy assertion that hidden chain-of-thought and raw prompts were not requested or persisted.

## Qualification report

`szl.refinement.evaluation/v1` separates:

```text
baseline accuracy
refined accuracy
absolute gain
recovery rate = corrected initially-wrong cases / initially-wrong cases
regression rate = broken initially-correct cases / initially-correct cases
mean/min/max model calls
accuracy gain per extra call
HOLD count
```

Public evaluation records contain case handles and digests rather than raw prompts or gold answers.

## Second Brain integration

Second Brain admits only validated run receipts and aggregates compact patterns keyed by:

```text
error_code × model_pair_digest
```

A public pattern handle can expose attempt count, verified repair rate, regression rate, and mean audit confidence. It cannot expose task text, public-step content, prompts, completions, private graph material, or hidden reasoning. All entries remain `REVIEW_REQUIRED` and carry no training, promotion, or execution authority.

## Living Anatomy integration

The Anatomy surface is a read-only observatory. It reports:

- exact Second Brain source revision;
- state and state digest;
- pattern handles and aggregate metrics;
- source availability or fail-closed unavailability;
- no provider dispatch, repair execution, training, promotion, or private hydration.

The frontend is an observability instrument, not an agent control panel.

## Qualification matrix

Before any production route is enabled, Forge must compare at least:

1. greedy baseline;
2. fixed-width self-consistency;
3. same-model breadth-depth refinement;
4. heterogeneous model-pair refinement;
5. local repair disabled;
6. adaptive breadth disabled;
7. dependent-step re-audit disabled as a negative control.

Minimum evidence dimensions:

```text
benchmark revision
case IDs and digests
model and tokenizer revisions
provider/runtime revision
temperature and seeds
hardware
call and token counts
latency and cost
accuracy
recovery and regression
cluster entropy and dominant mass
error taxonomy
receipt replay
```

MATH500 and AMC may reproduce the paper, but SZL promotion also requires domain suites for code, retrieval/citation recovery, agent tool contracts, legal deadline reasoning, maritime operations, observability incident diagnosis, and cybersecurity analysis. High-stakes domains remain advisory and human-reviewed.

## Admission order

```text
szl-frontier source and offline tests
→ protected source admission
→ szl-forge frozen qualification
→ independent witness / exact receipt readback
→ szl-second-brain handles-only pattern projection
→ anatomy read-only observatory
→ optional A11oy product candidate
→ a11oy.net proof and limitations
```

No source PR in this wave claims benchmark reproduction, provider availability, deployed runtime health, or production readiness.

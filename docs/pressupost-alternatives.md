# Budget alternatives

Aurora Desktop stores alternatives inside a single budget. Existing budgets keep their original structure until the user creates their first alternative; no migration is needed.

## User workflow

1. Create the budget and select its client.
2. Use **Crear alternativa a partir d’aquesta** to duplicate its details, costs, tasks and notes. The new option starts as a draft with independent lines and no inherited PDF documents or project links.
3. Name the options and switch between them with **Alternativa**. The client stays common to the proposal; each option can have different scope, quantities, prices and terms.
4. Export the current option with **PDF**, or all options with **PDF de totes les alternatives**. Each option has its own reference, e.g. `PRE-00001_A` and `PRE-00001_B`. The combined document gives each option a separate section and total; it does not add their amounts together.
5. Mark an option as **Enviat** when it has been sent. Its content is then read-only; create a new alternative to change the scope.
6. Use **Acceptar aquesta alternativa** (or the status selector) for the client's choice. The other options appear as **No escollida**, retaining their original data and status. The proposal becomes read-only, and only the chosen option can create a project.

The list contains one row per proposal, with a price range before acceptance and the accepted amount afterwards. Excel exports individual options, including their names and whether they were chosen. A draft option can be removed while the proposal is unaccepted; deleting the whole proposal requires every option to be an unlinked draft.

## Data and integration

`alternatives` contains nonrecursive snapshots. `alternativaId` identifies the top-level option; `alternativaAcceptadaId` records the client's choice. `pressupostPerGuardar` projects the chosen option (or the first option while undecided) to the existing top-level budget fields so existing project, invoice and reporting consumers keep their contract. Switching the editor to an unchosen option never replaces that canonical choice.

Generated PDFs belong to their option. The document registry traverses every option and updates references in both the snapshots and the canonical fields. Options and document references are preserved in existing JSON backups.

Sent and accepted options do not support revision editing in this initial implementation. Sending email and accepting through a customer portal are outside this feature.

## Verification

`node scripts/test-pressupost-alternatives.mjs` exercises legacy compatibility, independent copies, switching with pending edits, exclusive acceptance, project links, JSON round trips, real PDF generation and project creation using isolated storage. It is also included in `npm run test:critical`.

---
description: Create or update the feature specification from a natural language feature description.
handoffs: 
  - label: Build Technical Plan
    agent: speckit.plan
    prompt: Create a plan for the spec. I am building with...
  - label: Clarify Spec Requirements
    agent: speckit.clarify
    prompt: Clarify specification requirements
    send: true
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

The text the user typed after `/speckit.specify` in the triggering message **is** the feature description. Assume you always have it available in this conversation even if `$ARGUMENTS` appears literally below. Do not ask the user to repeat it unless they provided an empty command.

Given that feature description, do this:

1. **Generate a concise short name** (2-4 words) for the branch:
   - Analyze the feature description and extract the most meaningful keywords
   - Create a 2-4 word short name that captures the essence of the feature
   - Use action-noun format when possible (e.g., "add-user-auth", "fix-payment-bug")
   - Preserve technical terms and acronyms (OAuth2, API, JWT, etc.)
   - Keep it concise but descriptive enough to understand the feature at a glance
   - Examples:
     - "I want to add user authentication" → "user-auth"
     - "Implement OAuth2 integration for the API" → "oauth2-api-integration"
     - "Create a dashboard for analytics" → "analytics-dashboard"
     - "Fix payment processing timeout bug" → "fix-payment-timeout"

2. **Check for existing branches before creating new one**:

   a. First, fetch all remote branches to ensure we have the latest information:

      ```bash
      git fetch --all --prune
      ```

   b. Find the highest feature number across all sources for the short-name:
      - Remote branches: `git ls-remote --heads origin | grep -E 'refs/heads/[0-9]+-<short-name>$'`
      - Local branches: `git branch | grep -E '^[* ]*[0-9]+-<short-name>$'`
      - Specs directories: Check for directories matching `specs/[0-9]+-<short-name>`

   c. Determine the next available number:
      - Extract all numbers from all three sources
      - Find the highest number N
      - Use N+1 for the new branch number

   d. Run the script `.specify/scripts/bash/create-new-feature.sh --json "$ARGUMENTS"` with the calculated number and short-name:
      - Pass `--number N+1` and `--short-name "your-short-name"` along with the feature description
      - Bash example: `.specify/scripts/bash/create-new-feature.sh --json "$ARGUMENTS" --json --number 5 --short-name "user-auth" "Add user authentication"`
      - PowerShell example: `.specify/scripts/bash/create-new-feature.sh --json "$ARGUMENTS" -Json -Number 5 -ShortName "user-auth" "Add user authentication"`

   **IMPORTANT**:
   - Check all three sources (remote branches, local branches, specs directories) to find the highest number
   - Only match branches/directories with the exact short-name pattern
   - If no existing branches/directories found with this short-name, start with number 1
   - You must only ever run this script once per feature
   - The JSON is provided in the terminal as output - always refer to it to get the actual content you're looking for
   - The JSON output will contain BRANCH_NAME and SPEC_FILE paths
   - For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot")

3. Load `.specify/templates/spec-template.md` to understand required sections.

4. Follow this execution flow:

    1. Parse input description
       If empty: ERROR "No description provided"
    2. Extract core "Domain Logic":
       Instead of jumping into UI, identify the fundamental data flow, state changes, and logic gates.
    3. For unclear aspects:
       - Make informed guesses based on domain context (E-commerce, AI, Fintech, etc.).
       - Only mark with [NEEDS CLARIFICATION] if it blocks the core architecture.
       - **LIMIT: Maximum 3 [NEEDS CLARIFICATION] markers total**
    4. Fill "Context & Objectives":
       Define the "First Principles" of why this exists.
    5. Fill "Functional Scenarios":
       Support both User Stories (for GUI) and System Flows (for API/Logic/Backend).
    6. Define "System Boundaries & Constraints":
       Explicitly define what is internal logic vs. external integration.
       Include Non-Functional Requirements (Performance, Security, Reliability).
    7. Generate "Domain Entities":
       Define the conceptual model.
    8. Return: SUCCESS (spec ready for planning)

5. Write the specification to SPEC_FILE using the template structure, replacing placeholders with concrete details while preserving section order and headings.

6. **Specification Quality Validation**: After writing the initial spec, validate it against quality criteria:

   a. **Create Spec Quality Checklist**: Generate a checklist file at `FEATURE_DIR/checklists/requirements.md` using the checklist template structure with these validation items:

      ```markdown
      # Specification Quality Checklist: [FEATURE NAME]
      
      **Purpose**: Validate specification completeness and quality before proceeding to planning
      **Created**: [DATE]
      **Feature**: [Link to spec.md]
      
      ## Domain Rigor
      
      - [ ] No implementation details (languages, frameworks, APIs)
      - [ ] Focuses on "Logic and Data Contracts" over "UI Implementation"
      - [ ] System boundaries are clearly defined (What's in/out)
      
      ## Requirement Completeness
      
      - [ ] No [NEEDS CLARIFICATION] markers remain
      - [ ] Acceptance criteria are verifiable
      - [ ] Success criteria are measurable and technology-agnostic
      - [ ] Non-functional requirements (Security, Perf) are identified
      - [ ] Edge cases (data corruption, race conditions) are considered
      
      ## Strategic Alignment
      
      - [ ] Core goals align with the project Constitution
      - [ ] Non-goals are clearly defined to prevent scope creep
      ```

   b. **Run Validation Check**: Review the spec against each checklist item.
   c. **Handle Validation Results**: (Same as original flow, ensuring iterations fix the spec).

7. Report completion with branch name, spec file path, and readiness for the next phase.

## General Guidelines

### Principles of Universal Specification
- **Technology Independence**: The spec should describe a solution that could be implemented in ANY language or framework.
- **System Thinking**: Consider side effects, data longevity, and external failures.
- **Scenarios/Roles**: If it's a backend feature, "Users" might be "API Consumers" or "System Schedulers".

### Success Criteria Guidelines
Success criteria must be:
1. **Measurable**: Include specific metrics (time, percentage, count, rate)
2. **Technology-agnostic**: No mention of frameworks, languages, databases, or tools
3. **Outcome-focused**: Describe the end result, not the step.

**Good examples**:
- "Financial transactions are atomic and never result in double-spending"
- "Search results return in < 500ms even with 1M records"
- "User identity is verified via zero-knowledge proof principles"

**Bad examples**:
- "API returns a 200 OK" (too technical)
- "The database uses an index" (implementation detail)

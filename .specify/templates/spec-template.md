# Feature Specification: [FEATURE NAME]

**Feature Branch**: `[###-feature-name]`  
**Created**: [DATE]  
**Status**: Draft  
**Input**: User description: "$ARGUMENTS"

## 1. Context & Objectives *(The "Why")*

<!-- 
  Define the motivation. Why are we building this? 
  What is the core problem we are solving regardless of technology?
-->

- **Core Goal**: [Describe the primary objective]
- **Business/User Value**: [Why does this matter?]
- **Non-Goals**: [What are we NOT trying to do in this feature?]

## 2. Functional Scenarios *(Specific Journeys)*

<!--
  Priority-based journeys. These can be User Stories (for UI) 
  or System Flows (for backend/automation).
  
  P1: Critical/MVP | P2: Important | P3: Nice-to-have
-->

### Scenario 1 - [Brief Title] (Priority: P1)

[Describe the flow/logic in plain language]

- **Independent Logic**: [How this logic stands alone]
- **Acceptance Criteria**:
  1. **Given** [state], **When** [trigger], **Then** [expected result]
  2. **Given** [state], **When** [trigger], **Then** [expected result]

---

### Scenario 2 - [Brief Title] (Priority: P2)

[Describe the flow/logic in plain language]

- **Acceptance Criteria**:
  1. **Given** [state], **When** [trigger], **Then** [expected result]

---

## 3. System Boundaries & Constraints *(The "Rules")*

### System Boundaries
- **In-Scope**: [Explicit boundaries of the system/logic]
- **Out-of-Scope/Integrations**: [What external systems/events are involved but not modified?]

### Non-Functional Requirements
- **Performance**: [e.g., Latency, throughput requirements]
- **Security & Privacy**: [e.g., Data encryption, auth level, compliance]
- **Reliability/Error Handling**: [e.g., Retry logic, fallback states, idempotent operations]

### Logic Edge Cases
- What happens when data is [missing/malformed]?
- How does the system handle [concurrency/race conditions]?

## 4. Domain Entities *(Conceptual Model)*

<!-- 
  Define the "What" - the core concepts involved in this feature.
  Technology-agnostic names (e.g., "Transaction" instead of "SQL Row").
-->

- **[Entity 1]**: [What it is, key attributes, lifecycle]
- **[Entity 2]**: [Relationships and constraints]

## 5. Success Criteria *(Measurable Outcomes)*

<!-- 
  Measurable, technology-agnostic outcomes to validate the solution.
-->

- **SC-001**: [Metric 1, e.g., "Process completes in under 500ms"]
- **SC-002**: [Metric 2, e.g., "Zero data loss under network failure"]
- **SC-003**: [Metric 3, e.g., "95% successful mapping rate"]

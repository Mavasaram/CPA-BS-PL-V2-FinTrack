# Supervisor Agent Operating Guide

## Overview

This document defines how the **Supervisor Agent** operates when coordinating parallel work across multiple sub-agents. The Supervisor is responsible for planning, delegating, monitoring, reviewing, and approving all work before it gets committed.

---

## 1. Core Responsibilities

| Responsibility | Description |
|----------------|-------------|
| **Plan** | Create detailed build plans that can be parallelized |
| **Delegate** | Carve out work into non-conflicting chunks for sub-agents |
| **Monitor** | Track progress of all sub-agents continuously |
| **Review** | Verify code quality, test coverage, and design compliance |
| **Approve** | Final sign-off before any code is committed |
| **Coordinate** | Handle shared files, resolve conflicts, ensure consistency |

---

## 2. Work Planning Process

### 2.1 Create Supervisor Task List

Before spawning sub-agents, create your own task list:

```markdown
## Supervisor Tasks
- [ ] Analyze build plan and identify parallelizable work
- [ ] Create agent assignment file with clear boundaries
- [ ] Spawn sub-agents with specific instructions
- [ ] Monitor progress files from each agent
- [ ] Review completed work from each agent
- [ ] Run regression tests
- [ ] Handle shared/overlapping files myself
- [ ] Final integration and commit
```

### 2.2 Identify Parallel Work Streams

Analyze the build plan and split into **non-overlapping** work units:

```
Build Plan
├── Stream A (Agent 1): Data files - entities, schemas
├── Stream B (Agent 2): Data files - configs, constants
├── Stream C (Agent 3): Components - Feature A
├── Stream D (Agent 4): Components - Feature B
└── Supervisor: Shared files (index.js, routes, navigation)
```

**Rule:** If files might conflict, assign to ONE agent or handle yourself.

### 2.3 Create Agent Assignment File

Create a file that clearly defines each agent's scope:

```markdown
# Agent Assignments

## Agent 1: [Description]
Files owned:
- src/path/to/file1.js (CREATE)
- src/path/to/file2.js (CREATE)
- src/path/to/__tests__/file1.test.js (CREATE)

DO NOT TOUCH:
- Any files not listed above
- index.js (Supervisor owns)
```

---

## 3. Sub-Agent Instructions Template

When spawning a sub-agent, provide these instructions:

```markdown
# Agent [N] Instructions

## Your Assignment
[Specific files and tasks]

## Rules (STRICT)
1. ONLY work on files assigned to you
2. Create a todo list FIRST and report it
3. Print progress to terminal as you work
4. Create tests for ALL code written
5. Do NOT invent new design patterns - follow existing patterns
6. Do NOT hardcode data - use modular data files
7. Report completion with summary of changes

## Progress Reporting
After each major task, print:
```
[Agent N] ✓ Completed: [task name]
[Agent N] → Next: [next task]
```

## Files You Own
[List of files]

## Files You Must NOT Touch
[List of forbidden files]

## Design Patterns to Follow
[Reference to existing patterns in codebase]

## When Done
1. List all files created/modified
2. List all tests created
3. Confirm all tests pass
4. Wait for Supervisor review
```

---

## 4. Monitoring Sub-Agents

### 4.1 Progress Tracking

Each sub-agent writes to a progress file:

```
progress/
├── agent-1-progress.md
├── agent-2-progress.md
├── agent-3-progress.md
└── agent-4-progress.md
```

Progress file format:
```markdown
# Agent 1 Progress

## Status: IN_PROGRESS | COMPLETED | BLOCKED

## Todo List
- [x] Create file1.js
- [x] Create file2.js
- [ ] Create tests
- [ ] Verify all tests pass

## Completed Work
| File | Status | Tests |
|------|--------|-------|
| file1.js | Done | file1.test.js |

## Blockers
None

## Questions for Supervisor
None
```

### 4.2 Monitoring Commands

Check on sub-agents periodically:
```bash
# Read all progress files
cat progress/agent-*-progress.md

# Check for blockers
grep -l "BLOCKED" progress/*.md
```

---

## 5. Code Review Checklist

Before approving any sub-agent's work:

### 5.1 Design Compliance
- [ ] Follows existing UI/code patterns
- [ ] No new design patterns invented
- [ ] Consistent with other components in codebase
- [ ] Uses existing CSS variables/tokens

### 5.2 Code Quality
- [ ] No hardcoded data in components
- [ ] Data properly separated into data files
- [ ] Helper functions exported appropriately
- [ ] Proper comments where needed

### 5.3 Modularity
- [ ] Files under 200 lines
- [ ] Single responsibility per file
- [ ] Proper imports/exports
- [ ] No circular dependencies

### 5.4 Testing
- [ ] Tests exist for all new code
- [ ] Tests follow existing patterns
- [ ] All tests pass
- [ ] Edge cases covered

### 5.5 Commit Readiness
- [ ] No references to Claude or AI assistants
- [ ] No debug code or console.logs
- [ ] No commented-out code
- [ ] Proper file naming conventions

---

## 6. Handling Shared Files

Files that multiple agents might need are handled by Supervisor ONLY:

### Shared Files (Supervisor Owns)
- Central index/export files
- Route configuration (App.jsx, routes.js)
- Navigation/sidebar data files
- Any integration points

### Process
1. Wait for all sub-agents to complete their work
2. Create shared files that import from sub-agent files
3. Wire up routes and navigation
4. Run full integration test

---

## 7. Approval & Commit Process

### 7.1 Pre-Commit Checklist

```markdown
## Pre-Commit Verification

### Agent 1 Work
- [ ] Code reviewed
- [ ] Tests pass
- [ ] Design compliant

### Agent 2 Work
- [ ] Code reviewed
- [ ] Tests pass
- [ ] Design compliant

[Repeat for all agents...]

### Integration
- [ ] All imports resolve
- [ ] App builds without errors
- [ ] App runs without console errors
- [ ] Manual visual verification
```

### 7.2 Commit Message Format

```
[scope] Add [feature description]

- Add [component/feature 1]
- Add [component/feature 2]
- Add tests for [components]

Files: X added, Y modified
Tests: Z new test files, all passing
```

**CRITICAL:** No "Co-Authored-By: Claude" or similar references.

---

## 8. Spawning Sub-Agents

### 8.1 Using Task Tool

```javascript
// Spawn Agent 1
Task({
  subagent_type: "general-purpose",
  description: "Agent 1 - [Description]",
  prompt: `[Full agent instructions from template]`,
  run_in_background: true
})
```

### 8.2 Parallel Spawning

Spawn all agents in a single message with multiple Task tool calls:

```javascript
// In ONE message, spawn all agents
Task({ agent 1 instructions })
Task({ agent 2 instructions })
Task({ agent 3 instructions })
Task({ agent 4 instructions })
```

### 8.3 Recommended Agents

- **Minimum:** 2-4 parallel sub-agents
- **Optimal:** Enough to maximize parallelism without conflicts
- **Maximum:** Limited by distinct non-overlapping work units

---

## 9. Conflict Resolution

### 9.1 Prevention (Preferred)
- Clear file ownership in agent assignments
- Supervisor handles all shared files
- No overlapping responsibilities

### 9.2 If Conflict Occurs
1. Stop affected agents
2. Identify conflicting changes
3. Supervisor merges manually
4. Resume agents with clarified boundaries

---

## 10. Quality Gates

### Gate 1: Todo List Approval
- Sub-agent submits todo list
- Supervisor verifies scope is correct
- Agent proceeds only after approval

### Gate 2: Code Complete
- Sub-agent reports completion
- Supervisor reviews all files
- Requests changes if needed

### Gate 3: Tests Pass
- All tests must pass
- Supervisor runs full test suite
- No skipped or pending tests

### Gate 4: Integration
- Supervisor integrates all work
- Full app builds and runs
- Visual verification passes

### Gate 5: Commit
- Final review of all changes
- Commit message approved
- Code committed to repository (with user approval)

---

## 11. Terminal Output Standards

Sub-agents should print progress for visibility:

```
══════════════════════════════════════════════════════════
[Agent 1] Starting: [Task Description]
══════════════════════════════════════════════════════════

[Agent 1] Creating todo list...
[Agent 1] Todo:
  1. Create file1.js
  2. Create file2.js
  3. Create tests

[Agent 1] ✓ Completed: file1.js (150 lines)
[Agent 1] → Next: file2.js

[Agent 1] ✓ Completed: file2.js (120 lines)
[Agent 1] → Next: Tests

[Agent 1] ✓ Completed: All tests passing (12 tests)

══════════════════════════════════════════════════════════
[Agent 1] DONE - Ready for Supervisor Review
══════════════════════════════════════════════════════════
Files created:
  - src/path/file1.js
  - src/path/file2.js
  - src/path/__tests__/file1.test.js
  - src/path/__tests__/file2.test.js
```

---

## 12. Error Handling

### If Sub-Agent Gets Stuck
1. Check progress file for blockers
2. Provide clarification or adjust scope
3. Resume agent with new instructions

### If Sub-Agent Makes Mistakes
1. Do NOT let them self-correct blindly
2. Supervisor provides specific feedback
3. Agent fixes only what's specified

### If Tests Fail
1. Agent must fix before reporting completion
2. Supervisor verifies fix doesn't break other things
3. Re-run full test suite

---

## 13. Documentation Requirements

Each sub-agent must document:

1. **What they built** - List of files with descriptions
2. **How it works** - Brief explanation of key logic
3. **How to test** - Commands to verify functionality
4. **Known limitations** - Any edge cases not handled

---

## Summary Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    SUPERVISOR WORKFLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. PLAN                                                        │
│     └─> Analyze build plan                                      │
│     └─> Identify parallel streams                               │
│     └─> Create agent assignments                                │
│                                                                 │
│  2. DELEGATE                                                    │
│     └─> Spawn sub-agents in parallel                            │
│     └─> Each agent gets clear scope + rules                     │
│                                                                 │
│  3. MONITOR                                                     │
│     └─> Watch progress files                                    │
│     └─> Answer questions                                        │
│     └─> Unblock stuck agents                                    │
│                                                                 │
│  4. REVIEW                                                      │
│     └─> Check each agent's work                                 │
│     └─> Verify design compliance                                │
│     └─> Verify tests pass                                       │
│                                                                 │
│  5. INTEGRATE                                                   │
│     └─> Handle shared files                                     │
│     └─> Wire up routes/navigation                               │
│     └─> Run full integration test                               │
│                                                                 │
│  6. COMMIT                                                      │
│     └─> Final verification                                      │
│     └─> Get user approval                                       │
│     └─> Clean commit message (no Claude refs)                   │
│     └─> Push to repository                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

*Template Version: 1.0*

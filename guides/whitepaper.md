# WorkflowBuilder

> **Human-Agent Collaborative Workflow System (HACWS) — Enabling real-time collaboration between humans and AI agents with dynamic plan modification, action stacking, and adaptive recommendations.**

## 1. Executive Summary

WorkflowBuilder is a **Human-Agent Collaborative Workflow System (HACWS)** that enables true collaboration between humans and AI agents through shared workflow state, real-time modifications, and adaptive recommendations. The framework combines static procedure enforcement with dynamic learning to deliver context-aware guidance while maintaining full human oversight.

**Core Architecture:**
- **ProceduralGraph**: Static, deterministic graph encoding all valid workflow steps and transitions
- **RecommendationGraph**: Dynamic overlay tracking frequency, recency, and actor-specific weights
- **WorkflowOrchestrator**: Runtime engine coordinating human-agent collaboration

**Key Innovations:**
- **Shared Workflow State**: Both human and agent see and modify the same plan
- **Action Stacking**: Humans queue modifications while agents execute
- **Check-Back Loop**: Agents verify plan state before each action
- **Plan Visibility**: Agents expose intentions, humans review before execution
- **Actor Attribution**: Every action tagged with who did it and when

**Business Value:**
- **True Collaboration**: Humans and agents work as partners, not in isolation
- **Proactive Control**: Humans guide agents without waiting for mistakes
- **Maintained Compliance**: Recommendations never violate ProceduralGraph rules
- **Full Auditability**: Complete trail of who did what and why
- **Adaptive Learning**: Workflows improve as collaboration patterns emerge

**Installation:**
```bash
npm install @mikesaintsg/workflowbuilder
```

---

## 2. Introduction & Motivation

Human-AI collaboration is fundamentally broken. Today's systems force a choice between:

- **Full Autonomy**: Agents execute independently while humans wait and hope
- **Full Control**: Humans micromanage every step, negating agent value
- **Turn-Based Interaction**: Human asks, agent responds, human asks again

None of these models enable true collaboration. WorkflowBuilder introduces a new paradigm: **Collaborative Workflows** where humans and agents share a common plan, modify it in real-time, and work together toward shared goals.

### The Collaboration Gap

| Problem | Impact |
|---------|--------|
| **No Shared View** | Humans can't see what agents plan to do |
| **Waiting Game** | Humans must wait for agent completion before correcting |
| **No Proactive Control** | Humans can't queue changes while agents work |
| **One-Way Communication** | Agents execute without checking back |
| **Lost Context** | Interjections break agent understanding |
| **No Audit Trail** | Difficult to track who did what |

### The WorkflowBuilder Solution

WorkflowBuilder addresses these challenges through:

1. **Shared Workflow State** — Both actors see the same plan
2. **Action Queue** — Humans stack modifications while agents execute
3. **Plan Proposals** — Agents show intentions before acting
4. **Check-Back Loop** — Agents verify plan state before each action
5. **Actor Attribution** — Every action tagged with origin
6. **Recommendation Graph** — Learns from both human and agent patterns

---

## 3. Architectural Overview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SHARED WORKFLOW STATE                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Current Step: design │ Progress: 40% │ Queue: 3 actions pending    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   HUMAN                                    AGENT                            │
│   ┌─────────────┐                         ┌─────────────┐                  │
│   │ • View plan │                         │ • View plan │                  │
│   │ • Queue     │◄───── Sync ─────────►  │ • Propose   │                  │
│   │ • Modify    │                         │ • Execute   │                  │
│   │ • Interject │                         │ • Check back│                  │
│   └─────────────┘                         └─────────────┘                  │
│         │                                       │                          │
│         ▼                                       ▼                          │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                      ACTION QUEUE                                    │  │
│   │  [human:review_patterns] → [agent:create_outline] → [agent:impl]    │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Package Contents:**

| Export | Purpose |
|--------|---------|
| `createProceduralGraph` | Factory for static workflow structure |
| `createRecommendationGraph` | Factory for dynamic weight overlays |
| `createWorkflowOrchestrator` | Runtime collaboration engine |
| `createWorkflowContextFormatter` | Context generation for agents |

---

## 4. Theoretical Foundations

WorkflowBuilder is built on several key theoretical foundations:

### Two-Graph Architecture

Every workflow is modeled as two complementary graphs:

1. **ProceduralGraph**: Static definition of valid steps and transitions
2. **RecommendationGraph**: Dynamic overlay of learned weights

This separation ensures:
- **Correctness**: Recommendations never violate defined procedures
- **Adaptability**: Weights evolve based on actual usage patterns
- **Predictability**: Static structure is always knowable

### Actor-Based Collaboration

Every action is attributed to an actor:

| Actor | Description | Capabilities |
|-------|-------------|--------------|
| `human` | Human user | View, queue, modify, interject, override |
| `agent` | AI agent (LLM) | View, propose, execute, check-back |
| `system` | Automated system | Trigger guards, timeouts, auto-transitions |

### The Check-Back Loop

The agent always checks back before acting:

```text
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│AGENT PROPOSES│────▶│ HUMAN SEES  │────▶│ HUMAN MAY   │────▶│AGENT CHECKS │
│    plan      │     │    plan     │     │   MODIFY    │     │    BACK     │
└─────────────┘     └─────────────┘     └─────────────┘     └──────┬──────┘
                                                                   │
       ┌───────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│AGENT EXECUTES│────▶│   RECORD    │────▶│  RECOMMEND  │───▶ (loop)
│  (modified)  │     │   result    │     │    next     │
└─────────────┘     └─────────────┘     └─────────────┘
```

This ensures human modifications are always incorporated before agent action.

### Comparison to Other Models

| Model | Similarity | Difference |
|-------|------------|------------|
| Finite-State Machines | Deterministic transitions | Add actor-specific weights and collaboration |
| Markov Chains | Historical counts | Preserve strict determinism; actor attribution |
| Process Mining | Derive workflow graphs | Focus on real-time collaboration, not analysis |
| Human-in-the-Loop | Human oversight | True collaboration, not just validation gates |

---

## 5. Agentic Tooling Landscape

WorkflowBuilder is designed to address challenges observed in current agentic tools and provide a framework suitable for professional and financial applications beyond coding.

### Current Agentic Tools Analysis

#### Claude Code (Anthropic)

Claude Code operates in an agentic loop with tool use:

| Characteristic     | Description                                        | WorkflowBuilder Alignment                       |
|--------------------|----------------------------------------------------|-------------------------------------------------|
| **Agentic Loop**   | Iterates through think → act → observe cycle       | Check-back loop provides structured iteration   |
| **Tool Calling**   | Executes tools (file read, write, terminal)        | Actions within steps map to tool calls          |
| **Context Window** | Manages conversation history within context limits | WorkflowContextFormatter provides compact state |
| **Human Approval** | Can require confirmation for sensitive actions     | Guardrails with `agentRequiresApproval`         |
| **Session State**  | Maintains state within session                     | Execution state persists with audit trail       |

**Key Insight**: Claude Code's agentic behavior is request-based where each iteration is a new API call. WorkflowBuilder structures these iterations as steps with check-back points.

#### GitHub Copilot (Agent Mode)

Copilot's agent mode similarly operates in iterations:

| Characteristic         | Description                        | WorkflowBuilder Alignment                   |
|------------------------|------------------------------------|---------------------------------------------|
| **Plan Generation**    | Generates multi-step plans         | ProceduralGraph defines valid plans         |
| **Step Execution**     | Executes steps with file edits     | Actions within steps                        |
| **Human Intervention** | User can accept/reject suggestions | Action queue allows preemptive modification |
| **Context Gathering**  | Reads workspace for context        | Integrates with ContextBuilder              |

**Key Insight**: Copilot allows limited intervention (accept/reject) but lacks proactive queuing. WorkflowBuilder enables humans to stack modifications ahead.

#### Comparison Table

| Feature                                | Claude Code | GitHub Copilot | WorkflowBuilder           |
|----------------------------------------|-------------|----------------|---------------------------|
| Human sees plan before execution       | Partial     | Yes            | Yes (proposePlan)         |
| Human can modify plan mid-execution    | Limited     | Limited        | Yes (queueAction)         |
| Human can queue actions ahead          | No          | No             | Yes                       |
| Agent checks for changes before acting | No          | No             | Yes (checkBack)           |
| Per-action attribution                 | No          | No             | Yes (Actor)               |
| Structured step transitions            | No          | Partial        | Yes (ProceduralGraph)     |
| Adaptive recommendations               | No          | No             | Yes (RecommendationGraph) |

### Workflow Design for Efficient Model Interaction

WorkflowBuilder's architecture is designed to work efficiently with API-based models through workflow structure, not tracking overhead.

#### The Problem with Unstructured Agentic Loops

Traditional agentic patterns suffer from:

1. **Context Bloat** — Each iteration adds to conversation history
2. **Lost State** — Human modifications require full context restart
3. **Redundant Information** — Same instructions repeated every call
4. **No Delta Updates** — Cannot communicate "what changed" efficiently

#### WorkflowBuilder's Structural Solutions

**1. Compact Workflow State (Not Conversation History)**

```typescript
// Traditional: Full conversation history grows unbounded
messages: [
  { role: 'user', content: 'Original task...' },
  { role: 'assistant', content: 'Step 1 complete...' },
  { role: 'user', content: 'Step 2...' },
  // ... history grows with each interaction
]

// WorkflowBuilder: Compact current state
const context = formatter.format(orchestrator.getState())
// => "Step 2/4: Design | Progress: 50% | Queue: [security_review, implement]"
// Fixed size regardless of workflow length
```

**2. Delta-Based Check-Backs (Not Full Re-sync)**

```typescript
const checkBack = orchestrator.checkBack('agent')

// Only what changed since last check-back
checkBack.modifications // [{ type: 'added', actionId: 'review', by: 'human' }]
checkBack.isModified    // true - agent knows to adapt

// No need to re-transmit entire workflow history
```

**3. Structured Step Boundaries (Not Open-Ended Loops)**

```typescript
// ProceduralGraph defines valid transitions
// Agent cannot wander into unbounded exploration
const procedural = createProceduralGraph({
  steps: [...],
  transitions: [...], // Finite, known paths
})

// Each step has clear entry/exit criteria
orchestrator.completeStep(stepId, { output: result })
```

**4. Action Queue (Not Interrupt-and-Restart)**

```typescript
// Human queues modification without interrupting agent
orchestrator.queueAction({
  stepId: 'implement',
  actionId: 'add_tests',
  actor: 'human',
  position: 'first',
})

// Agent picks up change at next check-back
// No context restart, no lost progress
```

### Model Behavior Under Workflow Changes

Different models exhibit varying behaviors when workflow state changes mid-execution. WorkflowBuilder's check-back mechanism addresses these challenges.

#### Challenge: Context Continuity

When humans modify the plan, agents may:
1. **Lose track of goals** — Original objective forgotten
2. **Repeat completed work** — No awareness of progress
3. **Ignore modifications** — Continue with stale plan
4. **Conflict with human actions** — No coordination

#### WorkflowBuilder Solution: Structured Check-Back

```typescript
// Agent always receives current state
const checkBack = orchestrator.checkBack('agent')

// Check-back provides:
// 1. Current step (where we are)
// 2. Pending actions (what's queued)
// 3. Modifications since last check (what changed)
// 4. Interjections (human priorities)

if (checkBack.isModified) {
  // Acknowledge human changes before proceeding
  for (const mod of checkBack.modifications) {
    console.log(`Human ${mod.type}: ${mod.actionId}`)
  }
}
```

#### Model-Specific Workflow Patterns

| Provider             | Context Handling             | WorkflowBuilder Strategy                    |
|----------------------|------------------------------|---------------------------------------------|
| **Anthropic Claude** | Strong instruction following | Use clear system prompt with workflow state |
| **OpenAI GPT-4**     | Good at structured tasks     | Provide step-by-step instructions           |
| **OpenAI o1**        | Reasoning-focused            | Batch multiple actions per call             |
| **Ollama (Local)**   | Varies by model              | Use simpler workflow contexts               |

#### Prompt Engineering for Workflow Awareness

```typescript
// System prompt template for workflow-aware agents
const systemPrompt = `
You are an AI agent working in a collaborative workflow.

## Current State
${formatter.format(orchestrator.getState()).naturalLanguage}

## Your Responsibilities
1. ALWAYS check the Current State before acting
2. If there are pending actions from humans, address them FIRST
3. If modifications occurred, acknowledge them in your response
4. Propose your plan before executing (use proposePlan)
5. After each action, wait for check-back before continuing

## Human Collaboration
- Humans may modify the plan at any time
- Humans may interject with priority actions
- Humans may override your decisions
- Always respect human modifications
`
```

### Provider Integration Patterns

#### Anthropic (Claude) Integration

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { createWorkflowOrchestrator, createWorkflowContextFormatter } from '@mikesaintsg/workflowbuilder'

const client = new Anthropic()
const orchestrator = createWorkflowOrchestrator(procedural, recommendation)
const formatter = createWorkflowContextFormatter({ verbosity: 'standard' })

async function runWithClaude(task: string) {
  orchestrator.start({ taskId: task })
  
  while (!orchestrator.isComplete()) {
    const checkBack = orchestrator.checkBack('agent')
    const context = formatter.format(orchestrator.getState())
    
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: context.naturalLanguage,
      messages: [{ role: 'user', content: task }],
    })
    
    // Process response and record actions
    orchestrator.recordAction({
      stepId: checkBack.stepId,
      actionId: 'generate_response',
      actor: 'agent',
      success: true,
      output: response.content,
    })
    
    orchestrator.completeStep(checkBack.stepId, {
      output: response.content,
      actor: 'agent',
    })
  }
}
```

#### OpenAI Integration

```typescript
import OpenAI from 'openai'

const openai = new OpenAI()

async function runWithOpenAI(task: string) {
  orchestrator.start({ taskId: task })
  
  while (!orchestrator.isComplete()) {
    const checkBack = orchestrator.checkBack('agent')
    const context = formatter.format(orchestrator.getState())
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: context.naturalLanguage },
        { role: 'user', content: task },
      ],
    })
    
    // Process and record...
  }
}
```

#### Ollama (Local) Integration

```typescript
import { createEngine } from '@mikesaintsg/inference'
import { createOllamaProviderAdapter } from '@mikesaintsg/adapters'

const provider = createOllamaProviderAdapter({
  model: 'llama3.2',
  baseUrl: 'http://localhost:11434',
})

const engine = createEngine(provider)

async function runWithOllama(task: string) {
  orchestrator.start({ taskId: task })
  
  while (!orchestrator.isComplete()) {
    const checkBack = orchestrator.checkBack('agent')
    const context = formatter.format(orchestrator.getState())
    
    // Local model - unlimited iterations, no API cost
    const response = await engine.generate({
      messages: [
        { role: 'system', content: context.naturalLanguage },
        { role: 'user', content: task },
      ],
    })
    
    // Process and record...
  }
}
```

### Beyond Coding: Professional & Financial Applications

WorkflowBuilder is designed for professional workflows beyond software development.

#### Financial Document Processing

```typescript
const financialWorkflow = createProceduralGraph({
  steps: [
    { id: 'ingest', label: 'Document Ingestion', order: 1,
      actions: ['parse_pdf', 'extract_tables', 'identify_entities'] },
    { id: 'validate', label: 'Data Validation', order: 2,
      actions: ['verify_totals', 'check_compliance', 'flag_anomalies'] },
    { id: 'analyze', label: 'Financial Analysis', order: 3,
      actions: ['calculate_ratios', 'compare_benchmarks', 'generate_insights'] },
    { id: 'report', label: 'Report Generation', order: 4,
      actions: ['draft_summary', 'create_charts', 'compile_report'] },
  ],
  transitions: [
    { from: 'ingest', to: 'validate', weight: 1 },
    { from: 'validate', to: 'analyze', weight: 1 },
    { from: 'validate', to: 'ingest', weight: 0.3 }, // Re-ingest if invalid
    { from: 'analyze', to: 'report', weight: 1 },
  ],
})

// Human oversight for financial decisions
const orchestrator = createWorkflowOrchestrator(financialWorkflow, recommendation, {
  guardrails: {
    agentRequiresApproval: ['flag_anomalies', 'generate_insights'],
    humanCanOverride: true,
    customGuards: [
      {
        id: 'material_threshold',
        description: 'Require human approval for material findings',
        check: (action, state) => {
          if (action.actionId === 'generate_insights' && 
              state.outputs?.materialFindings > 0) {
            return { allowed: false, reason: 'Material findings require review' }
          }
          return { allowed: true }
        },
      },
    ],
  },
})
```

#### Legal Document Review

```typescript
const legalWorkflow = createProceduralGraph({
  steps: [
    { id: 'extract', label: 'Clause Extraction', order: 1,
      actions: ['identify_clauses', 'categorize', 'extract_terms'] },
    { id: 'compare', label: 'Comparison Analysis', order: 2,
      actions: ['compare_standard', 'identify_deviations', 'risk_score'] },
    { id: 'review', label: 'Attorney Review', order: 3,
      actions: ['human_review', 'annotate', 'approve'] },
    { id: 'finalize', label: 'Finalization', order: 4,
      actions: ['generate_summary', 'create_redlines', 'export'] },
  ],
  // ...
})

// Mandatory human review step
orchestrator.queueAction({
  stepId: 'review',
  actionId: 'human_review',
  actor: 'human',
  priority: 'critical',
  blocking: true, // Cannot proceed until human completes
})
```

#### Audit & Compliance Workflows

```typescript
const auditWorkflow = createProceduralGraph({
  steps: [
    { id: 'scope', label: 'Define Scope', order: 1 },
    { id: 'gather', label: 'Evidence Gathering', order: 2 },
    { id: 'test', label: 'Control Testing', order: 3 },
    { id: 'findings', label: 'Document Findings', order: 4 },
    { id: 'remediate', label: 'Remediation Tracking', order: 5 },
  ],
  // ...
})

// Full audit trail for regulatory compliance
orchestrator.onActionPerformed((action, state) => {
  auditLog.record({
    timestamp: Date.now(),
    actor: action.actor,
    action: action.actionId,
    step: state.currentStep?.id,
    workflowId: state.execution?.id,
    attestation: action.actor === 'human' ? action.metadata?.signature : 'automated',
  })
})
```

### Workflow Efficiency Through Design

WorkflowBuilder's architecture inherently reduces API overhead through structural design:

| Design Principle    | Traditional Agentic   | WorkflowBuilder            |
|---------------------|-----------------------|----------------------------|
| **Context Size**    | Grows with history    | Fixed workflow state       |
| **Modifications**   | Require restart       | Delta-based check-back     |
| **Step Boundaries** | Unbounded exploration | Finite ProceduralGraph     |
| **Human Input**     | Interrupt-and-restart | Queue without interruption |

**Architectural Benefits**:
1. **Compact state** — WorkflowContextFormatter produces fixed-size context regardless of workflow length
2. **Delta updates** — Check-back returns only modifications, not full history
3. **Structured steps** — ProceduralGraph bounds exploration to valid paths
4. **Non-blocking queue** — Human modifications don't interrupt agent execution

---

## 6. ProceduralGraph

The ProceduralGraph defines all valid workflow steps and transitions.

### Type Definitions

```typescript
interface Step {
  readonly id: string
  readonly label: string
  readonly order: number
  readonly description?: string
  readonly actions?: readonly string[]
  readonly requiredOutputs?: readonly string[]
  readonly estimatedDuration?: number
  readonly metadata?: Readonly<Record<string, unknown>>
}

interface StepTransition {
  readonly from: string
  readonly to: string
  readonly weight: number
  readonly guard?: string
  readonly description?: string
}
```

### API

```typescript
import { createProceduralGraph } from '@mikesaintsg/workflowbuilder'

const procedural = createProceduralGraph({
  steps: [
    { id: 'analyze', label: 'Analyze Requirements', order: 1 },
    { id: 'design', label: 'Design Solution', order: 2 },
    { id: 'implement', label: 'Implement Code', order: 3 },
    { id: 'test', label: 'Write Tests', order: 4 },
  ],
  transitions: [
    { from: 'analyze', to: 'design', weight: 1 },
    { from: 'design', to: 'implement', weight: 1 },
    { from: 'implement', to: 'test', weight: 1 },
    { from: 'test', to: 'implement', weight: 0.5 }, // Loop back if tests fail
  ],
  validateOnCreate: true,
})
```

### Design Guidelines

1. **Steps**: Define discrete units of work with clear outputs
2. **Transitions**: Annotate with base weights and guard conditions
3. **Actions**: List valid actions within each step
4. **Required Outputs**: Specify what must be produced before completion

---

## 7. RecommendationGraph

The RecommendationGraph learns from execution patterns while respecting ProceduralGraph constraints.

### Characteristics

- **Per-Actor Weights**: Track patterns separately for human and agent
- **Frequency Learning**: Higher weight for commonly taken paths
- **Recency Weighting**: Recent patterns weighted more heavily
- **Success Tracking**: Successful transitions boost confidence
- **Decay Rules**: Stale patterns fade via configurable half-life

### API

```typescript
import { createRecommendationGraph } from '@mikesaintsg/workflowbuilder'

const recommendation = createRecommendationGraph(procedural, {
  learningRate: 0.1,
  decayFactor: 0.9,
  minConfidence: 0.1,
  maxConfidence: 0.99,
  coldStart: {
    strategy: 'procedural-weight',
    warmupThreshold: 10,
  },
})

// Record transition result
recommendation.recordTransition('design', 'implement', {
  success: true,
  duration: 5000,
  context: { taskType: 'feature' },
})

// Get recommendations
const recommendations = recommendation.getRecommendations('design')
// => [{ stepId: 'implement', confidence: 0.92, reasoning: '...' }]
```

### Confidence Scoring

Each recommendation includes a confidence score combining:

1. **Procedural Weight** — Base weight from transition definition
2. **Frequency Weight** — How often this path is taken
3. **Recency Weight** — How recently this path was taken
4. **Success Weight** — Success rate of this path
5. **Context Weight** — Similarity to current context

---

## 8. HACWS Runtime Cycle

The Human-Agent Collaborative Workflow System runs a continuous cycle:

```text
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  AGENT   │────▶│  HUMAN   │────▶│  AGENT   │────▶│  EXECUTE │
│ PROPOSES │     │ MODIFIES │     │ CHECKS   │     │   WITH   │
│          │     │(optional)│     │   BACK   │     │  UPDATES │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     ▲                                                   │
     │           ┌──────────┐     ┌──────────┐          │
     └───────────│  RECORD  │◀────│ RECOMMEND│◀─────────┘
                 │  RESULT  │     │   NEXT   │
                 └──────────┘     └──────────┘
```

1. **Agent Proposes**: Agent submits intended plan (visible to human)
2. **Human Modifies**: Human may add, remove, or reorder actions
3. **Agent Checks Back**: Agent queries for latest plan state
4. **Execute with Updates**: Agent executes (possibly modified) plan
5. **Record Result**: Outcome recorded with actor attribution
6. **Recommend Next**: RecommendationGraph suggests next step

### Key Properties

- Human modifications are always respected
- Agent never acts on stale plan state
- Full attribution of who did what
- Recommendations incorporate both actors' patterns

---

## 9. WorkflowOrchestrator

The WorkflowOrchestrator coordinates human-agent collaboration.

### Core API

```typescript
import { createWorkflowOrchestrator } from '@mikesaintsg/workflowbuilder'

const orchestrator = createWorkflowOrchestrator(procedural, recommendation, {
  checkBackBeforeStep: true,
  guardrails: {
    enforceOrder: true,
    agentRequiresApproval: ['delete_file', 'deploy'],
    humanCanOverride: true,
  },
  onStepComplete: (step, result, actor) => {
    console.log(`${actor} completed: ${step.label}`)
  },
})

// Start execution
const execution = orchestrator.start({
  taskId: 'feature-123',
  initiator: 'human',
})
```

### Collaboration Methods

```typescript
// Agent proposes a plan
orchestrator.proposePlan([
  { stepId: 'analyze', actions: ['read_requirements', 'ask_questions'] },
  { stepId: 'design', actions: ['create_outline', 'identify_components'] },
], 'agent')

// Human queues an action
orchestrator.queueAction({
  stepId: 'design',
  actionId: 'security_review',
  actor: 'human',
  priority: 'high',
  position: 'first',
})

// Agent checks back before acting
const plan = orchestrator.checkBack('agent')
// Returns latest plan with human modifications

// Human interjects mid-execution
orchestrator.interject({
  type: 'add_action',
  stepId: 'implement',
  action: { actionId: 'stop_and_review', priority: 'critical' },
  actor: 'human',
  reason: 'Noticed security issue',
})
```

### Approval Workflow

Sensitive agent actions can require human approval:

```typescript
// Agent requests approval
orchestrator.requestApproval({
  stepId: 'deploy',
  actionId: 'deploy_production',
  actor: 'agent',
  context: { environment: 'production' },
})

// Human responds
orchestrator.respondToApproval({
  requestId: 'req-123',
  decision: 'approve',
  actor: 'human',
  notes: 'Reviewed changes, looks good',
})
```

---

## 10. Action Queue

The action queue enables proactive human guidance.

### Queue Structure

```typescript
interface ActionQueue {
  readonly currentStep: string
  readonly pending: readonly QueuedAction[]
  readonly executing: QueuedAction | undefined
  readonly completed: readonly ActionRecord[]
}

interface QueuedAction {
  readonly stepId: string
  readonly actionId: string
  readonly actor: Actor
  readonly priority: ActionPriority
  readonly queuedAt: number
  readonly blocking?: boolean
}
```

### Priority Levels

| Priority | Description |
|----------|-------------|
| `critical` | Execute immediately, blocks other actions |
| `high` | Execute before normal priority |
| `normal` | Standard priority |
| `low` | Execute after normal priority |
| `background` | Execute when nothing else pending |

### Queue Positions

| Position | Description |
|----------|-------------|
| `'first'` | Add to front of queue |
| `'last'` | Add to end of queue |
| `'before:{actionId}'` | Insert before specific action |
| `'after:{actionId}'` | Insert after specific action |
| `'immediate'` | Execute next (after current) |

### Usage

```typescript
// Human queues actions while agent works
orchestrator.queueAction({
  stepId: 'implement',
  actionId: 'write_tests_first',
  actor: 'human',
  priority: 'high',
  position: 'first',
})

// Human removes an agent's planned action
orchestrator.dequeueAction({
  stepId: 'implement',
  actionId: 'generate_boilerplate',
  actor: 'human',
  reason: 'Will use existing template',
})

// Human reorders actions
orchestrator.reorderActions({
  stepId: 'implement',
  order: ['write_tests_first', 'implement_logic', 'refactor'],
  actor: 'human',
})
```

---

## 11. Guardrails & Human Override

Guardrails enforce constraints with human override capability.

### Configuration

```typescript
const orchestrator = createWorkflowOrchestrator(procedural, recommendation, {
  guardrails: {
    // Step constraints
    maxStepDuration: 60000,
    maxStepRetries: 3,
    
    // Transition constraints
    enforceOrder: true,
    allowSkip: false,
    allowBacktrack: true,
    
    // Actor constraints
    agentCanMutate: false,
    agentRequiresApproval: ['delete_file', 'deploy', 'send_email'],
    humanCanOverride: true,
    humanOverrideRequiresReason: true,
    
    // Custom guards
    customGuards: [
      {
        id: 'no_deploy_on_friday',
        description: 'Cannot deploy on Fridays',
        appliesTo: ['agent'],
        check: (action, state, actor) => {
          if (action.actionId === 'deploy' && new Date().getDay() === 5) {
            return { allowed: false, reason: 'No Friday deploys' }
          }
          return { allowed: true }
        },
      },
    ],
  },
})
```

### Human Override

```typescript
// Agent action blocked by guardrail
try {
  orchestrator.recordAction({
    stepId: 'deploy',
    actionId: 'deploy_production',
    actor: 'agent',
  })
} catch (error) {
  // GUARDRAIL_VIOLATION
}

// Human overrides the guardrail
orchestrator.overrideGuardrail({
  guardrailId: 'no_deploy_on_friday',
  action: {
    stepId: 'deploy',
    actionId: 'deploy_production',
    actor: 'agent',
  },
  reason: 'Critical hotfix required',
  overriddenBy: 'human',
})
```

---

## 12. Context Formatter

The context formatter generates agent-ready workflow descriptions.

### API

```typescript
import { createWorkflowContextFormatter } from '@mikesaintsg/workflowbuilder'

const formatter = createWorkflowContextFormatter({
  includeHistory: true,
  maxHistoryItems: 5,
  includeRecommendations: true,
  verbosity: 'detailed',
})

const context = formatter.format(orchestrator.getState())

console.log(context.naturalLanguage)
// => ## Current Workflow State
//
// **Progress:** Step 2 of 4 (50%)
// **Current Step:** Design Solution
// **Current Actor:** agent
//
// ### Pending Actions (Queue)
// 1. [human] security_review (high priority)
// 2. [agent] create_outline
//
// ### Recommendations
// 1. Implement Code (92% confidence)
```

### Verbosity Levels

| Level | Includes |
|-------|----------|
| `minimal` | Current step, next recommendation |
| `standard` | + queue, basic history |
| `detailed` | + outputs, guardrails, full history |
| `custom` | Configurable components |

---

## 13. Ecosystem Integration

WorkflowBuilder integrates with other `@mikesaintsg` packages.

### With @mikesaintsg/inference

```typescript
import { createEngine } from '@mikesaintsg/inference'
import { createWorkflowOrchestrator, createWorkflowContextFormatter } from '@mikesaintsg/workflowbuilder'

const engine = createEngine(provider)
const orchestrator = createWorkflowOrchestrator(procedural, recommendation)
const formatter = createWorkflowContextFormatter()

async function executeWithAgent(userRequest: string) {
  orchestrator.start({ taskId: userRequest })
  
  while (!orchestrator.isComplete()) {
    // Agent checks back for latest plan
    const plan = orchestrator.checkBack('agent')
    
    // Generate context for agent
    const context = formatter.format(orchestrator.getState())
    
    // Agent executes with workflow awareness
    const response = await engine.generate({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: context.naturalLanguage },
        { role: 'user', content: userRequest },
      ],
    })
    
    // Record actions and complete step
    orchestrator.recordAction({ ... })
    orchestrator.completeStep(plan.stepId, { output: response, actor: 'agent' })
  }
}
```

### With @mikesaintsg/contextbuilder

WorkflowBuilder and ContextBuilder integrate through loose coupling. The workflow state is formatted as text and added as a section, benefiting from ContextBuilder's token budgeting and deduplication.

```typescript
import { createContextManager } from '@mikesaintsg/contextbuilder'
import { 
  createWorkflowOrchestrator, 
  createWorkflowContextFormatter,
} from '@mikesaintsg/workflowbuilder'
import { createModelTokenAdapter } from '@mikesaintsg/adapters'

const tokenAdapter = createModelTokenAdapter({ model: 'gpt-4o' })
const context = createContextManager(tokenAdapter, {
  budget: { maxTokens: 8000, reservedTokens: 2000 },
})

const orchestrator = createWorkflowOrchestrator(procedural, recommendation)
const formatter = createWorkflowContextFormatter({ verbosity: 'standard' })

// Bridge function: Sync workflow state to context section
function syncWorkflowToContext() {
  const state = orchestrator.getState()
  const formatted = formatter.format(state)
  
  context.sections.setSection({
    id: 'workflow-state',
    name: 'Current Workflow',
    content: formatted.naturalLanguage,
    metadata: { pinned: true }, // Always include
  })
}

// Initial sync
syncWorkflowToContext()

// Update on workflow changes
orchestrator.onStepComplete(() => syncWorkflowToContext())
orchestrator.onActionPerformed(() => syncWorkflowToContext())

// Build context with workflow state included
context.sections.select(['workflow-state', 'system-prompt'])
const built = context.buildFromSelection()
```

#### Key Benefits of Loose Coupling

| Benefit               | Description                                              |
|-----------------------|----------------------------------------------------------|
| **Independence**      | Each package works without the other                     |
| **Token Budget**      | Workflow state respects ContextBuilder's limits          |
| **Verbosity Control** | Use minimal formatting for tight budgets                 |
| **No Tight Coupling** | WorkflowBuilder outputs text, ContextBuilder consumes it |
```

---

## 14. TypeScript Implementation Example

```typescript
import {
  createProceduralGraph,
  createRecommendationGraph,
  createWorkflowOrchestrator,
  type Actor,
  type Step,
} from '@mikesaintsg/workflowbuilder'

// Define workflow
const steps: readonly Step[] = [
  { id: 'analyze', label: 'Analyze', order: 1, actions: ['read', 'ask'] },
  { id: 'design', label: 'Design', order: 2, actions: ['outline', 'plan'] },
  { id: 'implement', label: 'Implement', order: 3, actions: ['code', 'test'] },
]

const transitions = [
  { from: 'analyze', to: 'design', weight: 1 },
  { from: 'design', to: 'implement', weight: 1 },
]

// Build system
const procedural = createProceduralGraph({ steps, transitions })
const recommendation = createRecommendationGraph(procedural)
const orchestrator = createWorkflowOrchestrator(procedural, recommendation, {
  checkBackBeforeStep: true,
})

// Start workflow
orchestrator.start({ taskId: 'task-1' })

// Agent proposes plan
orchestrator.proposePlan([
  { stepId: 'analyze', actions: ['read', 'ask'] },
  { stepId: 'design', actions: ['outline', 'plan'] },
], 'agent')

// Human adds action
orchestrator.queueAction({
  stepId: 'design',
  actionId: 'security_check',
  actor: 'human',
  priority: 'high',
})

// Agent checks back (sees human's addition)
const plan = orchestrator.checkBack('agent')
console.log(plan.isModified) // true
console.log(plan.modifications) // [{ type: 'added', actionId: 'security_check', by: 'human' }]

// Execute with awareness of human modifications
for (const action of plan.actions) {
  orchestrator.recordAction({
    stepId: plan.stepId,
    actionId: action.actionId,
    actor: 'agent',
    success: true,
  })
}

// Complete step
orchestrator.completeStep('analyze', {
  output: { requirements: ['...'] },
  actor: 'agent',
})

// Get recommendations for next step
const recommendations = orchestrator.getRecommendations()
console.log(recommendations)
// => [{ stepId: 'design', confidence: 0.95, reasoning: '...' }]
```

---

## 15. Audit Trail & History

WorkflowBuilder maintains complete audit trails.

### History Entry Types

| Type | Description |
|------|-------------|
| `execution_started` | Workflow execution began |
| `step_started` | Step execution began |
| `step_completed` | Step completed successfully |
| `step_failed` | Step failed |
| `action_performed` | Action recorded |
| `action_queued` | Action added to queue |
| `action_dequeued` | Action removed from queue |
| `plan_proposed` | Agent proposed plan |
| `plan_modified` | Human modified plan |
| `interjection` | Human interjected |
| `handoff` | Actor handoff occurred |
| `guardrail_violated` | Guardrail blocked action |
| `guardrail_overridden` | Human overrode guardrail |
| `approval_requested` | Approval requested |
| `approval_responded` | Approval response given |

### Audit Trail API

```typescript
const audit = orchestrator.getAuditTrail()
console.log(audit)
// => {
//   executionId: 'exec-123',
//   taskId: 'task-456',
//   startedAt: 1705672800000,
//   duration: 600000,
//   status: 'completed',
//   stepsSummary: [...],
//   mutations: [...],
//   guardrailViolations: [...],
// }
```

---

## 16. Restrictions & Constraints

- **Zero External Dependencies**: Pure TypeScript ES modules
- **Cross-Platform**: Browser and Node.js without polyfills
- **Actor Attribution**: Every action must have an actor
- **Deterministic Structure**: Recommendations never violate ProceduralGraph
- **Human Supremacy**: Humans can always override agent actions
- **Check-Back Required**: Agents must check back before steps (configurable)

---

## 17. Development Guidelines

### TypeScript Standards

- Use `readonly` for parameters and return types
- Avoid `any` and non-null assertions
- Write user-defined type guards with `is` prefix
- Validate at edges (accept `unknown`, narrow, then use)
- Named exports only; no default exports

### Naming Conventions

| Category | Prefixes |
|----------|----------|
| Accessors | `get`, `has`, `is`, `can` |
| Mutators | `set`, `add`, `remove`, `clear`, `queue`, `dequeue` |
| Collaboration | `propose`, `checkBack`, `interject`, `handoff` |
| Lifecycle | `start`, `pause`, `resume`, `cancel`, `destroy` |
| Events | `on` (return `Unsubscribe` function) |

### Quality Gates

```bash
npm run check      # Zero TypeScript errors
npm run format     # Code formatted
npm run build      # Build library
npm test           # All tests pass
```

---

## 18. Roadmap

- **Multi-Agent Collaboration**: Multiple agents with role-based permissions
- **Conflict Resolution**: Handle simultaneous human-agent modifications
- **Branching Workflows**: Fork execution paths for exploration
- **Rollback Support**: Undo sequences of actions
- **Observability Dashboard**: Real-time visualization of collaboration
- **Template Library**: Pre-built workflow templates for common scenarios

---

## 19. Glossary

| Term | Definition |
|------|------------|
| **HACWS** | Human-Agent Collaborative Workflow System |
| **ProceduralGraph** | Static map of valid steps and transitions |
| **RecommendationGraph** | Dynamic overlay of per-transition weights |
| **WorkflowOrchestrator** | Runtime engine for human-agent collaboration |
| **Actor** | Entity performing action: `human`, `agent`, or `system` |
| **Check-Back** | Agent querying for latest plan before acting |
| **Interjection** | Human inserting action while agent works |
| **Action Queue** | Pending actions from both actors |
| **Plan Proposal** | Agent's intended actions, visible before execution |
| **Guardrail** | Constraint on workflow execution |
| **Override** | Human bypassing a guardrail |

---

## 20. Conclusion

WorkflowBuilder represents a paradigm shift in human-AI collaboration. By introducing shared workflow state, action stacking, and the check-back loop, it enables humans and agents to work together as true partners rather than in isolated turns.

The framework ensures:
- **Humans retain control** through visibility, queuing, and override capabilities
- **Agents remain effective** through clear structure and adaptive recommendations
- **Collaboration is auditable** through complete actor attribution

**Getting Started:**
1. Install `@mikesaintsg/workflowbuilder`
2. Define your ProceduralGraph with steps and transitions
3. Create the RecommendationGraph for adaptive learning
4. Initialize the WorkflowOrchestrator with collaboration options
5. Have agents propose plans and check back before acting
6. Let humans queue, modify, and interject as needed
7. Review the audit trail to understand collaboration patterns

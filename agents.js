// ─── North Platform (Center Hub) ─────────────────────────────────────────────
export const NORTH_DATA = {
  id: 'north',
  name: 'North',
  subtitle: 'AI Platform',
  description: 'North is Cohere\'s agentic AI platform purpose-built for the security and governance demands of industrial operations. It orchestrates specialized agents across every factory function — from real-time monitoring to cross-system workflow automation — with progressive trust escalation and full audit trails.',
  capabilities: [
    'Custom agents per factory function with configurable instructions grounded in OEM documentation',
    'MCP connectors for secure integration with SCADA, MES, ERP, CMMS, QMS',
    'Python sandbox for sensor data analysis, SPC computation, and failure prediction',
    'AI-powered generation of work orders, NCRs, and shift handover summaries',
    'Visual graph-based workflow builder for multi-agent automation pipelines',
  ],
  governance: [
    'Human-in-the-Loop: tool action approvals enforce engineer sign-off for shutdowns and dispatches',
    'Complete Audit Trail: every agent action logged with reasoning, evidence, and source attribution',
    'RBAC: fine-grained role-based access for features, tools, agents, and automations',
    'Encryption: column-level at rest, TLS in transit, SOC 2 compliance',
    'On-Premises: full deployment in plant data centers for air-gapped environments',
  ],
  trustLevels: [
    { step: 'SEE', role: 'Observer', description: 'Read-only sensor & equipment data' },
    { step: 'DOCUMENT', role: 'Scribe', description: 'Write journal entries + status updates' },
    { step: 'PLAN', role: 'Planner', description: 'Create devices, tags, work orders' },
    { step: 'MEASURE', role: 'Analyst', description: 'Read from live quality telemetry' },
    { step: 'MANAGE', role: 'Operator', description: 'Create work orders, assign teams' },
  ],
  tourCaption: 'North orchestrates 20 specialized agents across 5 factory functions with full audit trails.',
};

// ─── Pentagon positions (radius 18, center at origin) ────────────────────────
const R = 18;
const pentagonPos = (i) => {
  const angle = (i * 72 - 90) * Math.PI / 180;
  return { x: R * Math.cos(angle), z: R * Math.sin(angle) };
};

// ─── 5 Transformation Areas ─────────────────────────────────────────────────
export const AREAS = [
  {
    id: 'knowledge-hub',
    name: 'Manufacturing Knowledge Hub',
    shortName: 'Knowledge Hub',
    index: 0,
    color: 0x355146,     // CG-500
    accentHex: '#355146',
    ...pentagonPos(0),   // top of pentagon
    agents: [
      { name: 'SOP Search', desc: 'Instant search across all plant documentation with cited answers' },
      { name: 'Maintenance Manual Q&A', desc: 'Natural-language Q&A over equipment manuals and OEM docs' },
      { name: 'Cross-Plant Knowledge Agent', desc: 'Surfaces best practices and lessons learned across facilities' },
      { name: 'Regulatory Compliance Base', desc: 'Monitors regulatory changes and maps them to plant SOPs' },
    ],
    today: 'Critical procedures buried in binders, tribal knowledge lost to attrition, and weeks of new-hire ramp-up.',
    withNorth: 'One search across all plant documentation with cited answers, cutting onboarding time and reducing errors.',
    kpis: [
      { label: 'Onboarding Time', before: '4-6 weeks', after: '<1 week' },
      { label: 'Knowledge Retrieval', before: 'Hours of searching', after: 'Seconds with citations' },
    ],
    tourCaption: 'One search across all plant documentation — onboarding drops from weeks to days.',
  },
  {
    id: 'production-ops',
    name: 'Production Operations',
    shortName: 'Production Ops',
    index: 1,
    color: 0xFF7759,     // SC-500
    accentHex: '#FF7759',
    ...pentagonPos(1),   // right-back
    agents: [
      { name: 'Work Order Agent', desc: 'Auto-generates and routes work orders from detection events' },
      { name: 'Quality Inspection Processor', desc: 'Automates visual and dimensional inspection workflows' },
      { name: 'Shift Handover Summarizer', desc: 'Generates end-of-shift summaries from logs and events' },
      { name: 'NCR Triage Agent', desc: 'Auto-classifies non-conformance reports and routes to owners' },
    ],
    today: 'Paper-based work orders, manual inspection logs, and shift handovers lost in translation between crews.',
    withNorth: 'Agents that manage work orders end-to-end, auto-classify defects, and generate shift summaries instantly.',
    kpis: [
      { label: 'Work Order Cycle', before: '4-8 hours', after: '<30 minutes' },
      { label: 'Shift Handover', before: '45 min manual', after: 'Auto-generated' },
    ],
    tourCaption: 'Work orders go from 4-8 hours to under 30 minutes. Shift handovers are auto-generated.',
  },
  {
    id: 'analytics-oee',
    name: 'Production Analytics & OEE',
    shortName: 'Analytics & OEE',
    index: 2,
    color: 0x4C6EE6,     // AB-500
    accentHex: '#4C6EE6',
    ...pentagonPos(2),   // right-front
    agents: [
      { name: 'OEE Dashboard Analyzer', desc: 'Natural-language queries over live OEE and availability data' },
      { name: 'Yield Trend Agent', desc: 'Detects yield degradation patterns before batch-level impact' },
      { name: 'Downtime Root Cause Analyzer', desc: 'Correlates downtime events with equipment and process data' },
      { name: 'Quality KPI Reporter', desc: 'Auto-generates Pareto charts and SPC alerts from live data' },
    ],
    today: 'Spreadsheet reporting, delayed OEE calculations, and root cause analysis that starts days after events.',
    withNorth: 'Natural-language queries over live MES and SCADA data with auto-generated Pareto charts and alerts.',
    kpis: [
      { label: 'MTTR', before: '6-10 hours', after: '45-90 minutes' },
      { label: 'Defect Escape Rate', before: '25-35%', after: '<8%' },
      { label: 'OEE Visibility', before: 'Next-day reports', after: 'Real-time dashboards' },
    ],
    tourCaption: 'Defect escape rate drops from 35% to under 8%. MTTR cut by 85%.',
  },
  {
    id: 'supply-chain',
    name: 'Supply Chain Intelligence',
    shortName: 'Supply Chain',
    index: 3,
    color: 0xFFA18C,     // SC-300
    accentHex: '#FFA18C',
    ...pentagonPos(3),   // left-front
    agents: [
      { name: 'Demand Forecast Agent', desc: 'Predicts demand shifts using sales, production, and market signals' },
      { name: 'Supplier Risk Monitor', desc: 'Monitors global supplier networks for disruption signals' },
      { name: 'Logistics Optimizer', desc: 'Optimizes shipping routes, carrier selection, and delivery timing' },
      { name: 'Inventory Rebalancing Agent', desc: 'Rebalances stock across plants based on real-time demand' },
    ],
    today: 'Disconnected ERP systems, reactive supplier management, and forecasts based on last quarter\'s data.',
    withNorth: 'AI agents monitoring supplier risk in real time, optimizing inventory, and predicting demand shifts.',
    kpis: [
      { label: 'Forecast Accuracy', before: '60-70%', after: '>90%' },
      { label: 'Stockout Events', before: 'Weekly', after: 'Near-zero' },
    ],
    tourCaption: 'Forecast accuracy jumps from 60% to over 90%. Stockouts nearly eliminated.',
  },
  {
    id: 'continuous-improvement',
    name: 'Continuous Improvement',
    shortName: 'Continuous Improvement',
    index: 4,
    color: 0xD9A6E5,     // SQ-500
    accentHex: '#D9A6E5',
    ...pentagonPos(4),   // left-back
    agents: [
      { name: 'Root Cause Analyzer', desc: 'Automated 5-Why and fishbone analysis from incident data' },
      { name: 'Predictive Maintenance Builder', desc: 'No-code builder for custom predictive maintenance agents' },
      { name: 'Safety Incident Reporter', desc: 'Auto-generates safety reports from sensor and incident data' },
      { name: '5-Why Agent', desc: 'Guides structured root cause investigations with evidence chains' },
    ],
    today: 'Improvement ideas stuck in suggestion boxes, months-long IT queues, and Kaizen limited by data silos.',
    withNorth: 'Engineers build custom quality and safety agents in hours using no-code builders, accelerating PDCA.',
    kpis: [
      { label: 'Agent Build Time', before: 'Months (IT queue)', after: 'Hours (no-code)' },
      { label: 'Unplanned Downtime', before: 'Baseline', after: '50-65% reduction' },
      { label: 'Factory OPEX', before: 'Baseline', after: '18-25% reduction' },
    ],
    tourCaption: 'Engineers build custom agents in hours, not months. Unplanned downtime cut 50-65%.',
  },
];

// ─── Live Scenario Definitions ───────────────────────────────────────────────
export const SCENARIOS = [
  {
    id: 'hydraulic-press',
    name: 'Hydraulic Press Seal Failure',
    description: 'A hydraulic press shows early signs of seal degradation. Watch North\'s agents detect the anomaly, diagnose the root cause, plan preventive maintenance, and dispatch a repair — all before a failure occurs.',
    steps: [
      {
        phase: 'SEE', role: 'Observer', areaId: 'production-ops',
        title: 'Anomaly Detected',
        description: 'The equipment health monitor spots abnormal pressure fluctuations in a hydraulic press — a pattern that typically precedes seal failure.',
        label: 'Hydraulic press #4 showing unusual pressure swings, 18% above normal',
      },
      {
        phase: 'MEASURE', role: 'Analyst', areaId: 'north',
        title: 'Root Cause Diagnosed',
        description: 'North compares the pressure data against maintenance history and past failures. It identifies a pump seal that is slowly leaking under heavy use.',
        label: 'Identified: pump seal starting to leak under load — 89% confidence',
      },
      {
        phase: 'PLAN', role: 'Planner', areaId: 'continuous-improvement',
        title: 'Maintenance Planned',
        description: 'The system predicts the seal will fail within 36-48 hours and quality will be affected within 72 hours. It prepares a repair plan with the right parts and procedures.',
        label: 'Seal failure expected in 36-48 hours — repair plan ready with parts staged',
      },
      {
        phase: 'MANAGE', role: 'Operator', areaId: 'north',
        title: 'Repair Dispatched',
        description: 'North creates a preventive maintenance work order, assigns a technician, and attaches all diagnostic evidence so the team arrives prepared.',
        label: 'Preventive repair scheduled — technician assigned with full context',
      },
    ],
  },
  {
    id: 'supplier-disruption',
    name: 'Supplier Disruption Cascade',
    description: 'A key supplier announces a 3-week shipping delay on critical material. Follow the cascade as North assesses the impact, finds alternatives, adjusts the production schedule, and keeps deliveries on track.',
    steps: [
      {
        phase: 'SEE', role: 'Observer', areaId: 'supply-chain',
        title: 'Disruption Detected',
        description: 'The supplier risk monitor picks up an alert: a primary material supplier is delayed 3 weeks due to an unexpected disruption.',
        label: 'Key material supplier reporting 3-week shipping delay',
      },
      {
        phase: 'DOCUMENT', role: 'Scribe', areaId: 'north',
        title: 'Impact Assessed',
        description: 'North maps the delay against current production orders and finds 12 jobs across 3 production lines that will be affected within 10 days.',
        label: '12 production orders at risk across 3 lines — 10-day window',
      },
      {
        phase: 'PLAN', role: 'Planner', areaId: 'knowledge-hub',
        title: 'Alternatives Found',
        description: 'The knowledge hub searches procurement records and finds two pre-approved backup suppliers that can deliver the same material in 5 days.',
        label: '2 approved backup suppliers found — material available in 5 days',
      },
      {
        phase: 'MANAGE', role: 'Operator', areaId: 'production-ops',
        title: 'Schedule Adjusted',
        description: 'The production agent reshuffles the schedule — pulling forward jobs that use materials already in stock while the replacement shipment is in transit.',
        label: '3 lines rescheduled to avoid downtime while backup material ships',
      },
      {
        phase: 'MEASURE', role: 'Analyst', areaId: 'analytics-oee',
        title: 'Delivery Confirmed',
        description: 'The analytics dashboard recalculates throughput forecasts and confirms the adjusted schedule still meets all customer delivery commitments.',
        label: 'Delivery forecast updated — 98.5% on-time delivery maintained',
      },
    ],
  },
  {
    id: 'quality-escape',
    name: 'Quality Escape Detection',
    description: 'Machined parts start drifting out of specification. See how North traces the issue to a recent tooling change, retrieves the correct specification, isolates the root cause, and issues a corrective action — stopping defective parts from reaching customers.',
    steps: [
      {
        phase: 'MEASURE', role: 'Analyst', areaId: 'analytics-oee',
        title: 'Quality Drift Detected',
        description: 'The quality monitor flags a batch of machined housings: bore diameters are trending outside acceptable limits — 4 measurements in a row drifting high.',
        label: 'Machined housings drifting out of spec — 4 consecutive readings off target',
      },
      {
        phase: 'DOCUMENT', role: 'Scribe', areaId: 'north',
        title: 'Cause Identified',
        description: 'North cross-references the quality drift with recent changes and finds a correlation: a cutting tool was replaced 6 hours ago with a part from a different vendor.',
        label: 'Linked to a tool replacement 6 hours ago — wrong vendor part used',
      },
      {
        phase: 'SEE', role: 'Observer', areaId: 'knowledge-hub',
        title: 'Specification Retrieved',
        description: 'The knowledge hub pulls up the approved tool specification and the original qualification report, confirming the substitute part is outside the required tolerance.',
        label: 'Approved spec retrieved — substitute tool confirmed out of tolerance',
      },
      {
        phase: 'PLAN', role: 'Planner', areaId: 'continuous-improvement',
        title: 'Root Cause Traced',
        description: 'The investigation agent traces the full chain: purchasing substituted the part, it was not checked on arrival, and went straight to the machine. Three corrective actions created.',
        label: 'Full chain traced — 3 corrective actions to prevent recurrence',
      },
      {
        phase: 'MANAGE', role: 'Operator', areaId: 'production-ops',
        title: 'Batch Quarantined',
        description: 'The affected batch is quarantined for rework. A corrective work order is issued and downstream assembly is notified to hold until re-inspection is complete.',
        label: 'Defective batch quarantined — rework order issued, assembly notified',
      },
    ],
  },
  {
    id: 'new-product',
    name: 'New Product Line Onboarding',
    description: 'A new EV motor housing line is being brought online. Watch North ingest all the technical documentation, set up specialized agents, verify the supply chain, build equipment monitors, create work templates, and set performance targets — in hours, not months.',
    steps: [
      {
        phase: 'DOCUMENT', role: 'Scribe', areaId: 'knowledge-hub',
        title: 'Documentation Ingested',
        description: 'The knowledge hub processes 140 pages of assembly manuals, safety sheets, and quality plans for the new EV motor housing line — making them instantly searchable.',
        label: '140 pages of technical docs processed — 23 procedures ready to search',
      },
      {
        phase: 'PLAN', role: 'Planner', areaId: 'north',
        title: 'Agents Created',
        description: 'North automatically creates 4 specialized agents for the new line: an equipment monitor, quality inspector, work order manager, and shift summarizer — each trained on the new documentation.',
        label: '4 specialized agents created — each grounded in the new product docs',
      },
      {
        phase: 'SEE', role: 'Observer', areaId: 'supply-chain',
        title: 'Supply Chain Verified',
        description: 'The supply chain agent checks all 14 new materials needed for the product, confirms supplier lead times, and verifies there is enough safety stock for the ramp-up period.',
        label: 'All 14 required materials verified — stock confirmed through ramp-up',
      },
      {
        phase: 'PLAN', role: 'Planner', areaId: 'continuous-improvement',
        title: 'Equipment Monitoring Live',
        description: 'Predictive maintenance agents are set up for the new mill and press — monitoring vibration and temperature from day one, using no-code configuration.',
        label: '2 equipment monitors live — tracking vibration and temperature baselines',
      },
      {
        phase: 'MANAGE', role: 'Operator', areaId: 'production-ops',
        title: 'Work Templates Ready',
        description: 'Standard work order templates and inspection checklists are generated for the new line, pre-linked to the relevant procedures from the documentation.',
        label: '8 work order templates and 12 inspection checklists ready to use',
      },
      {
        phase: 'MEASURE', role: 'Analyst', areaId: 'analytics-oee',
        title: 'Performance Targets Set',
        description: 'Dashboards are configured with ramp-up targets: starting efficiency at 55%, goal of 78% within 90 days, with automated alerts if performance dips.',
        label: 'Starting at 55% efficiency — targeting 78% within 90 days',
      },
    ],
  },
  {
    id: 'safety-incident',
    name: 'Safety Near-Miss Investigation',
    description: 'A conveyor safety sensor triggers a near-miss alert. Watch North retrieve the relevant safety procedure, piece together what happened, generate a full investigation report, and dispatch corrective actions — all within minutes.',
    steps: [
      {
        phase: 'SEE', role: 'Observer', areaId: 'production-ops',
        title: 'Near-Miss Detected',
        description: 'A conveyor safety sensor detects a worker too close to moving equipment and triggers an automatic emergency stop.',
        label: 'Conveyor #2 emergency stop — worker detected in restricted zone',
      },
      {
        phase: 'DOCUMENT', role: 'Scribe', areaId: 'knowledge-hub',
        title: 'Safety Procedure Retrieved',
        description: 'The knowledge hub pulls up the relevant safety procedure and the conveyor risk assessment, confirming the safety zone boundaries and required response steps.',
        label: 'Safety procedure retrieved — restricted zone boundary: 1.2 meters confirmed',
      },
      {
        phase: 'MEASURE', role: 'Analyst', areaId: 'analytics-oee',
        title: 'Timeline Reconstructed',
        description: 'The analytics agent pieces together what happened by cross-referencing the sensor event with the shift schedule, door access logs, and recent maintenance activity.',
        label: 'Timeline built — maintenance access during active production shift identified',
      },
      {
        phase: 'PLAN', role: 'Planner', areaId: 'continuous-improvement',
        title: 'Investigation Complete',
        description: 'A structured near-miss report is auto-generated with a root cause analysis, contributing factors, and three recommended corrective actions.',
        label: 'Near-miss report generated — 3 corrective actions recommended',
      },
      {
        phase: 'MANAGE', role: 'Operator', areaId: 'north',
        title: 'Corrections Dispatched',
        description: 'North creates three work orders: update the restricted zone signage, add a safety check to shift handovers, and schedule a sensor recalibration.',
        label: '3 corrective actions dispatched — safety dashboard updated',
      },
    ],
  },
];

export const INCIDENT_STEPS = SCENARIOS[0].steps;

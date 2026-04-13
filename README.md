# North — Manufacturing AI Digital Twin

Interactive 3D showcase demonstrating how [Cohere's North](https://cohere.com) platform transforms manufacturing operations with agentic AI.

**[Launch Demo →](https://scaling-waddle-7per9zw.pages.github.io/)**

## Overview

A browser-based digital twin of a manufacturing plant, built with Three.js. Five factory areas orbit a central North AI platform, connected by animated data conduits. Each area represents a key transformation zone where specialized AI agents automate and augment factory operations.

### Areas

| Area | Agents | Key Outcome |
|------|--------|-------------|
| **Knowledge Hub** | SOP Search, Maintenance Manual Q&A, Cross-Plant Knowledge, Regulatory Compliance | Onboarding: weeks → days |
| **Production Ops** | Work Order, Quality Inspection, Shift Handover, NCR Triage | Work orders: hours → minutes |
| **Analytics & OEE** | OEE Dashboard, Yield Trend, Downtime Root Cause, Quality KPI Reporter | Defect escapes: 35% → <8% |
| **Supply Chain** | Demand Forecast, Supplier Risk, Logistics Optimizer, Inventory Rebalancing | Forecast accuracy: >90% |
| **Continuous Improvement** | Root Cause Analyzer, Predictive Maintenance, Safety Incident Reporter, 5-Why | Downtime: −50–65% |

### Features

- **Live Scenarios** — 5 animated incident cascades that walk through multi-agent workflows step by step (e.g., hydraulic press failure, supplier disruption, quality escape)
- **Auto-Pilot Tour** — Guided walkthrough of all platforms with narration captions
- **Detail Modals** — Click any platform to see agents, KPIs, and before/after transformation data
- **Keyboard Navigation** — `0`–`5` to jump to platforms, `Esc` to return, `F` for fullscreen

## Tech Stack

- **Three.js** — 3D scene, post-processing (bloom), CSS2D labels
- **GSAP** — Camera transitions, object animations, incident cascade timing
- **Vanilla HTML/CSS/JS** — No build step, no dependencies to install

## Running Locally

```bash
npx serve .
```

Open `http://localhost:3000` in a browser.

## Deployment

Deployed automatically to GitHub Pages on every push to `main`.

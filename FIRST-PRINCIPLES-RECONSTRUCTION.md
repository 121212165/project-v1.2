# First-Principles Reconstruction: project-v1.2

> Applied Elon Musk's first-principles thinking: break to fundamental truths, rebuild from zero.

## Core Problem

A cosmetics company needs to check whether marketing content complies with Chinese advertising regulations.

## First Principles Breakdown

1. ~6,000+ lines of backend for what is fundamentally a ~50-line operation.
2. Factory/adapter/interface pattern for a single AI provider.
3. API key hardcoded in source code across 3 files.

## Reconstruction Blueprint

Single Next.js app in ~15 files / ~1,500 lines.

## Musk\'s Razor

Cut factory pattern. Cut monitoring services. Cut dead SMS/WeChat. Remove hardcoded API keys. The product is: prompt in, compliant rewrite out.

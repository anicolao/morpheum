---
layout: page
title: Multi-Identity Matrix Bots Design Proposal
permalink: /proposals/multi-identity-matrix-bots/
---

# Multi-Identity Matrix Bots Design Proposal

**Status**: Draft  
**Type**: Feature Enhancement  
**Date**: {{ site.time | date: "%Y-%m-%d" }}

## Quick Summary

This proposal generalizes the Matrix bot to support multiple identities with distinct prompts and optional LLM configurations. Delegation happens in the main room via @mentions, with prompts governing whether bots accept or reject requests.

## Problem Statement

The current bot runs as a single Matrix identity with a single prompt and configuration. This limits specialization, persona isolation, and inter-bot collaboration.

## Proposed Solution

Introduce a multi-identity `BotManager`, per-bot prompt and LLM configuration, and a shared-room delegation convention driven by @mentions.

## Full Design Document

{% include MULTI_IDENTITY_MATRIX_BOTS.md %}

---

Feedback welcome via Matrix discussions or GitHub issues.

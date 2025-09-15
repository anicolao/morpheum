---
layout: page
title: Task Dashboard
permalink: /status/tasks/
---

# Task Dashboard

This page tracks all current and completed tasks for the Morpheum project with enhanced search and filtering capabilities.

<!-- Task Statistics -->
<div class="task-stats">
  <div class="stat-card">
    <h3>{{ site.tasks | where: "status", "open" | size }}</h3>
    <p>Open Tasks</p>
  </div>
  <div class="stat-card">
    <h3>{{ site.tasks | where: "status", "completed" | size }}</h3>
    <p>Completed Tasks</p>
  </div>
  <div class="stat-card">
    <h3>{{ site.tasks | group_by: "phase" | size }}</h3>
    <p>Active Phases</p>
  </div>
</div>

<!-- Search and Filter Interface -->
<div class="task-controls">
  <input type="text" id="task-search" placeholder="Search tasks..." />
  <select id="status-filter">
    <option value="">All Statuses</option>
    <option value="open">Open</option>
    <option value="completed">Completed</option>
  </select>
  <select id="phase-filter">
    <option value="">All Phases</option>
    {% assign phases = site.tasks | group_by: "phase" %}
    {% for phase in phases %}
    <option value="{{ phase.name }}">{{ phase.name }}</option>
    {% endfor %}
  </select>
</div>

<!-- Task Listing with JavaScript-enabled filtering -->
<div id="task-container">
  {% assign sorted_tasks = site.tasks | sort: 'order' %}
  {% for task in sorted_tasks %}
  <div class="task-card" data-status="{{ task.status }}" data-phase="{{ task.phase }}" data-category="{{ task.category }}">
    <h3>{{ task.title }}</h3>
    <div class="task-meta">
      <span class="status-badge status-{{ task.status }}">{{ task.status }}</span>
      {% if task.phase %}<span class="phase-badge">{{ task.phase }}</span>{% endif %}
      {% if task.category %}<span class="category-badge">{{ task.category }}</span>{% endif %}
    </div>
    <div class="task-content">{{ task.content | strip_html | truncatewords: 30 }}</div>
    <a href="{{ task.url }}" class="task-link">View Details</a>
  </div>
  {% endfor %}
</div>

<!-- Include JavaScript for search functionality -->
<script src="{{ '/assets/js/task-search.js' | relative_url }}"></script>

## Contributing Tasks

To add a new task:

1. Create a new file in `docs/_tasks/` with the naming convention `task-{number}-{short-description}.md`
2. Include front matter with `title`, `order`, and `status` fields
3. Write the task description in markdown
4. This page will automatically include your new task

For more information, see our [contributing guide](/documentation/contributing/).
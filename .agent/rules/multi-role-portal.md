---
trigger: always_on
---

---
name: multi-role-portal
description: Implements a scalable multi-role dashboard architecture with a central layout switcher and role-specific sidebars.
---

# Multi-Role Portal Skill

This skill allows Antigravity to implement or extend a multi-role dashboard system. It follows a 3-layer pattern:
1. **Auth Context**: Provides `user` and `role` state.
2. **Main Layout Switcher**: Redirects users to the correct layout based on their role.
3. **Role-Specific Layouts**: Each role gets its own Sidebar, Header, and Route Protection logic.

## Usage Instructions

### 1. Structure Analysis
When asked to implement or fix a multi-role system, first ensure the `AuthContext` provides a `role` field.
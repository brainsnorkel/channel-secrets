# Agent Instructions

This project uses **bd** (beads) for issue tracking.
Run `bd prime` for full workflow context (after compaction, clear, or new session).

## Core Rules

- Track strategic work in beads (multi-session, dependencies, discovered work)
- Use `bd create` for issues, TodoWrite for simple single-session execution
- When in doubt, prefer bd—persistence you don't need beats lost context
- Priority: 0-4 or P0-P4 (0=critical, 2=medium, 4=backlog). NOT "high"/"medium"/"low"
- **WARNING**: Do NOT use `bd edit` - it opens $EDITOR which blocks agents

## Essential Commands

### Finding Work
```bash
bd ready                    # Show unblocked work
bd list --status=open       # All open issues
bd list --status=in_progress # Your active work
bd show <id>                # Detailed view with dependencies
```

### Creating & Updating
```bash
bd create --title="..." --type=task|bug|feature --priority=2
bd update <id> --status=in_progress  # Claim work
bd close <id>               # Mark complete
bd close <id1> <id2> ...    # Close multiple at once
```

### Dependencies
```bash
bd dep add <issue> <depends-on>  # Add dependency
bd blocked                       # Show blocked issues
```

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds


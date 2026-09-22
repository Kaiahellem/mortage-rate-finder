@AGENTS.md

# Project preferences

This started as a take-home coding exercise for a job interview. It's now
kept as a portfolio project. See `README.md` for the project and
`DECISIONS.md` for the reasoning behind choices.

## Language

- Code, filenames, comments and commit messages: English.
- Documentation (`README.md`, `DECISIONS.md`, `TODO.md`): English, no em
  dashes (use a regular hyphen or comma instead).

## Working method

- Work one GitHub issue at a time. Small commits with clear messages that
  reference the issue number, e.g. `Add RateSource interface (#2)`.
- After each issue: stop, briefly summarize what was done and why, and
  wait for a go-ahead before the next issue. Don't dump the whole solution
  at once.
- Before a non-trivial choice (sources, architecture, libraries): explain
  the alternatives and trade-offs, let the user decide.
- Update `DECISIONS.md` for important choices, with an "AI or me" column
  noting who drove the choice.
- Mock data must always be clearly flagged in code and output (never
  presented as real data). Assumptions should be stated explicitly, not
  hidden.
- Keep the solution small. Don't gold-plate. "With more time I would..."
  points are collected continuously in the README under "Further work", or
  in `TODO.md` as a working list along the way.

# Codex Movie Workflow

For requests to create, revise, approve, render, or share a script-driven diagram video, use the repository skill at `skill/movie-create` after it has been installed as `$movie-create`.

- Do not use `OPENAI_API_KEY` or the OpenAI API for the Codex-local workflow.
- Read `leran_rule/approved/` before each job. Treat `candidates/` as unapproved.
- Keep generated images and original MP4 files inside ignored `export/` folders.
- To share a finished video on GitHub, run `npm.cmd run codex:share -- <project-id>`. This copies only the MP4 and a review note into `shared-videos/`; Git LFS manages the MP4.
- Members must not create, edit, or promote learning rules. They may only add a non-rule note in the video's `review-request.md`; the repository owner manually decides whether to make a rule change.
- Share only approved rules, success metadata, and intentionally shared video deliverables through Git. Show changed learning files and obtain explicit owner approval before any commit or push that includes them.

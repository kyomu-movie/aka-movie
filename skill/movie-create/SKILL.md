---
name: movie-create
description: Create a reviewed Japanese step-animation MP4 from a script in the movie_create repository without using the OpenAI API. Use when a Codex user asks to create, revise, approve, render, or share a script-driven diagram video, including GitHub-shared learning rules and success examples.
---

# Codex Local Movie Create

Use the repository's `reference/`, `leran_rule/approved/`, and `skill/` folders as the shared source of truth. Do not call the OpenAI API or ask for an API key.

## Workflow

1. Run `skill/movie-create/scripts/validate-learning.ps1 -RepoRoot <repository-root>`, then read every approved rule in `leran_rule/approved/` and the base style in `skill/style-base/SKILL.md`.
2. Create a numbered output folder with `npm.cmd run codex:new -- --script "<台本>"`. This returns to local `main`, then automatically creates and switches to `video/<project-id>`; confirm the returned `branch` value before continuing.
3. Create one 16:9-safe-area diagram using the native image-generation capability when it is available in the Codex session. Use all images in `reference/` only as style references. If native image generation is unavailable, ask the user to attach or place the approved diagram at the path reported by `codex:new`.
4. Save the diagram as `generated-image.png`. Present it to the user and wait for an explicit `OK`. Treat any other response as a correction.
5. Convert the approved image into `structure.json` and `animation.json` using the schema in [references/project-format.md](references/project-format.md). Use title → relation → node → annotation order by default; allow the user to change order, motion, and timing.
6. Wait for `OK`, then render with `npm.cmd run codex:render -- <project-id>`. Verify that the output is a 1920×1080, 30fps, silent H.264 MP4. Present the finished MP4 and wait for one final explicit `OK`.
7. Treat that final video `OK` as authorization to automatically run `npm.cmd run codex:share -- <project-id>`, then `npm.cmd run codex:push-video -- <project-id>`. Create a draft pull request for the `video/<project-id>` branch and report its link. If GitHub authentication or an execution permission is required, pause only for the user to approve it, then continue. Do not wait for a separate sharing request.

## Learning and GitHub Sharing

- Members must not create, modify, or promote files in `leran_rule/`. They must not turn corrections into rules.
- A member's final video `OK` automatically prepares and publishes that video's `shared-videos/<project-id>/` folder. `review-request.md` remains a factual non-rule note; do not add a rule on the member's behalf. The publish command refuses to include anything outside that finished video's folder.
- The review note is not a rule. The repository owner alone decides whether to create a candidate or promote an approved rule after reviewing the shared video.
- Store only a short success summary and file metadata in `leran_rule/successes/`; do not commit source scripts or private images. The user has explicitly authorized committing intentionally shared MP4s in `shared-videos/` through Git LFS.
- Before using shared learning, pull the repository's latest approved rules. The owner alone runs `npm.cmd run codex:publish-learning` to show the allowed files, and only after explicit approval runs `npm.cmd run codex:publish-learning -- --confirm`. Candidates are never published by this command.

## Required Visual Rules

- Use Noto Sans JP Black for main text and Noto Sans JP Bold for supporting text.
- Use only #f9f9f9, #030303, #C00000, #EE6E4A, #EAEAEA, and #999999.
- Keep important content within the center 16:9 safe area even when the source image is generated at 1536×1024.

## Failure Handling

- Do not fabricate an image, structure, or rendered MP4 after a tool failure.
- If the local image-generation capability is unavailable, pause at image review and ask the user for the image; continue with the local renderer after it is supplied.

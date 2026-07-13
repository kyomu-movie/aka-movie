---
name: movie-create
description: Create a reviewed Japanese step-animation MP4 from a script in the movie_create repository without using the OpenAI API. Use when a Codex user asks to create, revise, approve, render, or share a script-driven diagram video, including adaptive keyframe motion, GitHub-shared learning rules, and success examples.
---

# Codex Local Movie Create

Use the repository's `reference/`, `leran_rule/approved/`, and `skill/` folders as the shared source of truth. Do not call the OpenAI API or ask for an API key.

## Workflow

1. Run `skill/movie-create/scripts/validate-learning.ps1 -RepoRoot <repository-root>`, then read every approved rule in `leran_rule/approved/` and the base style in `skill/style-base/SKILL.md`. Treat approved rules as quality constraints and examples, not as a template menu.
2. Create a numbered output folder with `npm.cmd run codex:new -- --script "<台本>"`. This returns to local `main`, then automatically creates and switches to `video/<project-id>`; confirm the returned `branch` value before continuing.
3. Create one 16:9-safe-area diagram using the native image-generation capability when it is available in the Codex session. Use all images in `reference/` only as style references. If native image generation is unavailable, ask the user to attach or place the approved diagram at the path reported by `codex:new`.
4. Save the diagram as `generated-image.png`. Present it to the user and wait for an explicit `OK`. Treat any other response as a correction.
5. Analyze the approved script and image into semantic beats. Create `structure.json` and adaptive `animation.json` using [references/project-format.md](references/project-format.md). Do not choose a named animation pattern. Compose opacity, movement, scale, restrained rotation, reveal progress, easing, and timing to match the meaning of each beat. Use calm motion by default and stronger emphasis only where it clarifies the script.
6. For each new relation line, add a normalized `relationPath` so arbitrary straight or curved arrows can draw along their own route. Keep all animation items within the documented safety ranges and return every element to the exact completed-image state in its final keyframe.
7. Run `npm.cmd run codex:validate-animation -- <project-id>`. Present its Japanese timeline instead of raw JSON and wait for an explicit `OK`. Treat corrections as instructions to revise the structure or keyframes and validate again.
8. Render with `npm.cmd run codex:render -- <project-id>`. Verify that the output is a 1920×1080, 30fps, silent H.264 MP4. Present the finished MP4 and wait for one final explicit `OK`.
9. Treat that final video `OK` as authorization to automatically run `npm.cmd run codex:share -- <project-id>`, then `npm.cmd run codex:push-video -- <project-id>`. Create a draft pull request for the `video/<project-id>` branch and report its link. If GitHub authentication or an execution permission is required, pause only for the user to approve it, then continue. Do not wait for a separate sharing request.

## Adaptive Motion Rules

- Design motion from the script's semantic beats; do not select from a fixed catalog.
- Combine only the safe properties supported by the keyframe schema. Never generate per-video TypeScript or executable animation code.
- Use 2–8 keyframes per element. Intermediate keyframes may add a small pulse, directional movement, or emphasis; the final keyframe must match the completed still image.
- Coordinate simultaneous ideas with equal delays, show dependent ideas in reading order, and reserve path reveal for a relation with a valid `relationPath`.
- Keep the complete motion timeline within 18.2 seconds so the final image remains visible for at least 1.8 seconds in a maximum 20-second video.

## Learning and GitHub Sharing

- Members must not create, modify, or promote files in `leran_rule/`. They must not turn corrections into rules.
- A member's final video `OK` automatically prepares and publishes that video's `shared-videos/<project-id>/` folder. It contains the MP4, file metadata, a sanitized `animation-summary.json`, and `review-request.md`. The summary contains motion facts only, never the source script, labels, or generated image.
- The review note and animation summary are not learning rules. The repository owner alone decides whether to create or approve learning after reviewing the shared video.
- When the owner approves a video, inspect its MP4, review note, and animation summary, then show a concise proposed learning change in chat. Do not write any learning file until the owner explicitly approves that proposal.
- After explicit owner approval, write only the approved reusable rule and short success metadata to `leran_rule/approved/` and `leran_rule/successes/`. Do not store source scripts or private images.
- Before using shared learning, pull the repository's latest approved rules. The owner alone runs `npm.cmd run codex:publish-learning` to preview the allowed files, and only after a separate explicit approval runs `npm.cmd run codex:publish-learning -- --confirm`. Candidates are never published by this command.

## Required Visual Rules

- Use Noto Sans JP Black for main text and Noto Sans JP Bold for supporting text.
- Use only #f9f9f9, #030303, #C00000, #EE6E4A, #EAEAEA, and #999999.
- Keep important content within the center 16:9 safe area even when the source image is generated at 1536×1024.

## Failure Handling

- Do not fabricate an image, structure, timeline, or rendered MP4 after a tool failure.
- If animation validation fails, fix the reported structure, timing, path, or keyframe value before presenting the timeline.
- If the local image-generation capability is unavailable, pause at image review and ask the user for the image; continue with the local renderer after it is supplied.
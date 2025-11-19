# Builder

This repository contains the Builder project. The repository currently needs reorganization: some files are in the root, and there may be duplicates.

Quick start
1. Clone:
   git clone https://github.com/NonstopAgent/Builder.git
2. Run inventory & reorg suggestion:
   ./scripts/repo_inventory.sh
   ./scripts/generate_reorg_moves.sh > proposed_moves.sh
3. Inspect proposed_moves.sh, edit as needed, then:
   git checkout -b reorg/proposed
   bash proposed_moves.sh   # or review and run each command manually
   git commit -am "chore: reorganize files into standard layout"
   git push -u origin reorg/proposed
   Open a PR on GitHub and request review.

Goals of reorganization
- Move docs to docs/
- Move scripts to scripts/
- Place source files under src/ or language-specific folders (cmd/, pkg/, internal/)
- Remove or consolidate duplicate files
- Add CI and formatting rules in a follow-up

If you paste the output of scripts/repo_inventory.sh here I will generate a targeted move plan and a proposed PR description you can use.

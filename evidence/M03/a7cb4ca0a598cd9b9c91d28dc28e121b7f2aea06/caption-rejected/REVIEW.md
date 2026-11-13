# V001 paused English layout — rejected

Independent reviewer `/root/v001_review` inspected the official live e316 artifact. At 1100×850, the English native paused status pushes the `auto` grid column wide enough to collapse the paper caption into a near one-letter column. The original full-page image is 1100×4612, versus 1100×3770 in Chinese. This material UI defect invalidates final M03 acceptance until corrected and rendered again.

[Unmodified original PNG](live-paper-light-en.png). Source: deployed `a7cb4ca0a598cd9b9c91d28dc28e121b7f2aea06`, reviewed candidate `8fa4e8bcb86748fb100a10fd5a07904761e3c933` has identical application files. The passing stage-only freeze checks did not detect caption layout outside the GPU stage. Existing 320/390/768/1440 layout coverage missed this 1100px paused English state.

Author has been instructed in the existing visible V001 production chat to repair only the caption/control layout. New candidate verification will assert caption width/line count, hero height through running/pause/resume, and 200% text zoom, retaining all previous GPU and customer-flow gates. No score is raised to conceal this failure. V002/V003 bilingual live imagery showed no material visual regression in this review.

# Publish the playable game

The normal branch-based Pages deployment can serve Git LFS pointer text instead of model bytes. The included `.github/workflows/pages.yml` downloads the LFS objects, checks every required GLB header/length, then uploads the actual site files to Pages.

1. Commit and push the workflow, `build-pages.mjs`, and `.gitignore` changes to `main`.
2. In the GitHub repository, open **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**.
3. In **Actions**, select **Deploy playable game to Pages** and run it on `main` if the push-triggered run did not deploy successfully.
4. Wait for the Deploy step to finish, then reload https://l-star29.github.io/F1Local/.

The build publishes five revised car models and eight active tracks. Original duplicate car exports, Austria, recordings, analysis output, and server code are excluded from the site, but remain in the repository. The build refuses pointer files or incomplete GLBs and enforces a 950 MB safety budget below the Pages 1 GB site limit.

Run `node build-pages.mjs --check` locally to validate without copying assets, or `node build-pages.mjs` to generate the ignored `dist-pages` folder. The workflow needs available Git LFS download quota and all referenced objects uploaded to the repository. If LFS download fails, resolve that failure rather than publishing pointers.

Pages serves practice only. Private races require the Node server; a static Pages deployment cannot run it. Large track downloads still take time even after deployment is fixed.

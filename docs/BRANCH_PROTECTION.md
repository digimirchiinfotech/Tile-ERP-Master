# Branch Protection Rules

To maintain the security and stability of the Tile ERP application, the following branch protection rules **must** be enforced on the `master` and `main` branches in your GitHub repository settings.

## Required Settings

1. **Require a pull request before merging**
   - **Require approvals**: Set to at least 1 approval.
   - **Dismiss stale pull request approvals when new commits are pushed**: Enable this so that code changes post-approval must be reviewed again.
   - **Require review from Code Owners**: Enable this to ensure specific teams review specific code paths (e.g., security team for auth changes).

2. **Require status checks to pass before merging**
   - **Require branches to be up to date before merging**: Enable this to prevent stale PRs from breaking the build.
   - **Status checks that are required**:
     - `build-and-test` (from `ci.yml` pipeline)
     - `secret-scan` (from TruffleHog pipeline)
     - `dependency-audit` (from npm audit pipeline)

3. **Require conversation resolution before merging**
   - Ensures all comments are addressed before a PR can be merged.

4. **Do not allow bypassing the above settings**
   - Apply these rules to administrators as well, preventing force-pushes and unreviewed commits to production branches.

## How to Configure in GitHub

1. Navigate to your repository on GitHub.
2. Click on **Settings** > **Branches**.
3. Under **Branch protection rules**, click **Add rule**.
4. Set the **Branch name pattern** to `main` (and create another for `master` if you use both).
5. Check the boxes corresponding to the settings listed above.
6. Click **Save changes**.

By enforcing these rules, we guarantee that all code deployed to the live environment has passed our strict linting, security scanning, and unit testing gates.

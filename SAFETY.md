# S-Craft Tools release safety

Private upload and public distribution are different steps. A private GitHub repository still transfers files to GitHub and is accessible to its owner and anyone granted access. Do not add collaborators or publish a preview as part of a private backup. Keep GitHub Pages disabled.

## Before a private backup and testing upload

1. Prepare a separate clean copy with a fresh Git history. Include only the website, local application source and tests, build files, project license, third-party notices and required assets. Exclude local review notes, original Git history, private documents, user media, screenshots, installed applications, caches, signing files and credentials. Verify the support link and QR are intentional.
2. Review every file, hidden file, asset metadata and commit to be sent. Check author and committer details. Run a secret scanner on the exact commit and history, and inspect its findings; fix genuine secrets before upload. Scan generated website files as well. Git ignore rules do not remove previously committed data.
3. Run the build, local API security and relevant tests from the exact commit. Record results and unresolved problems locally. Retain the project and third-party license notices. Verify the destination account and private repository visibility before any push. Do not push without the owner's instruction.


## Before public sharing or preview publication

Keep project-owned code under AGPL-3.0-only and preserve applicable third-party licenses and notices. Private status does not settle licensing for sharing with other people. Before inviting collaborators, distributing files, publishing a preview, or making the repository public, assess the applicable licenses and complete the following:

- Resolve the documented PDFCraft and Mazanoke source-provenance questions. The PDFCraft signature scanner is included code; the scope of other adaptations still needs investigation.
- Verify the corresponding source, build materials and notices for the exact FFmpeg browser core and every bundled codec. The replacement recipe pins its sources; older repository history refers to a core whose exact source remains unresolved. Confirm the prepared source bundle and its permanent public delivery before distribution. Verify the source-built QPDF replacement and its notices for the intended release.
- Review the exact release commit, branches and built assets again for secrets, personal data, licenses and metadata. Check all output artifacts and any releases or CI artifacts that would become accessible.
- Recheck desktop and phone layouts, Safari and representative physical phones, PDF/image/audio/video exports, input limits, errors and network traffic during processing. Verify the proposed host, response headers, file-size limits and hosted downloads before claiming support.

No public preview, public repository, or Pages deployment is authorized by preparing a private backup. After separate authorization, deploy only the reviewed website files and record the exact commit and deployment URL.

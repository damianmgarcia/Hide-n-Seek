# **Hide n' Seek: Hide Promoted Jobs & Companies**

![A promotional marquee. The logo and name are featured on the left side of the marquee. The logo is a simple drawing of a briefcase, bisected diagonally, with one side a light-brown color and the other side a black color. The face of a black cat with yellow eyes is partially visible as it peeks around the brown edge of the diagonal bisection. A "before and after" diagram on the right side of the marquee shows how the extension hides jobs and is titled "View the jobs you seek. Hide the ones you don't"](/images/promotional-marquee-2-normalized.svg)

## **Description**

**Hide n' Seek** lets you easily remove promoted job postings and companies from your search results on LinkedIn, Indeed, and Glassdoor.

[**Check it out on YouTube**](https://youtu.be/zhh7mI7bgRg)

<a href="https://youtu.be/zhh7mI7bgRg" target="_blank">
 <img src="images/hide-n-seek-youtube-thumbnail-github-readme-normalized.svg" alt="Check it out on YouTube" width="50%" />
</a>

## **How It Works**

“Block” buttons are added next to every listing. If you see a listing you don’t like, simply click the button to hide it. By default, the listing will be hidden under an overlay. Alternatively, you can completely eliminate it from search results by enabling the “Do not display hidden jobs” option.

To hide promoted jobs, click the “block” button on any promoted listing and then activate the “Promoted” toggle.

For easy management, you can view a list of everything you've hidden by clicking the Hide n’ Seek button on your browser’s toolbar.

## **Usage**

- Get started by clicking the Hide n' Seek button on the browser's toolbar. Select a job board, enter a job name, and then click the search button. You may also go directly to a supported job board's website to perform your search if you prefer.

<img src="/images/usage-job-search-normalized.svg" width="73.449131513647642679900744416873%" alt="A diagram that shows a job search in the extension's popup" /><br><br>

- Click a job's "block" button and all jobs by that company will be hidden behind an overlay.

<img src="/images/usage-hide-job-normalized.svg" width="100%" alt='A "before and after" diagram shows the effect of hiding a job' /><br><br>

- Click a job's "unblock" button to remove the overlays.

<img src="/images/usage-unhide-job-normalized.svg" width="100%" alt='A "before and after" diagram shows the effect of unhiding a job' /><br><br>

- Click the toolbar button for additional options:
  - Block jobs by keyword (or a regular expression)
  - Scroll through your list of hidden jobs and click a hidden job's name to remove it
  - Click the "Unhide all jobs" button to reset your hidden jobs list. This action can be undone by clicking the "Undo" button
  - Click the "Do not display hidden jobs" button to remove hidden jobs from display, rather than hide them behind overlays
  - Click the settings button where you can backup and restore your data

<img src="/images/usage-unhide-all-jobs-normalized.svg" width="73.449131513647642679900744416873%" alt="A diagram of the extension's toolbar button, along with the options panel, shows a list of hidden jobs and controls for managing the list." /><br><br>

## **Supported Job Boards**

- Glassdoor
- Indeed
- LinkedIn

## **Privacy Policy**

Your data remains completely private and is never shared. All data is stored locally on your device and may sync across your devices if browser synchronization is enabled.

## **Permissions**

The following permissions are required:

- "Read and change your data on all indeed.com sites and all linkedin.com sites"
  - Enables the addition of "Block" buttons and other UI elements to listings.
- "Read your browsing history"
  - Enables the detection of LinkedIn, Indeed, and Glassdoor so the extension can look for listings.

Note that the above permissions are written exactly as Chrome displays them to the user during installation. Other browsers will ask for the same permissions, but the wording may vary.

## **Download**

- [Chrome Web Store **(Recommended)**](https://chromewebstore.google.com/detail/hide-n-seek-hide-promoted/agghbaheofcoecndkbflbnggdjcmiaml)
- [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/hide-n-seek/lnfbapfcdippajlhlmefaabhkdbmgiog)
- [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/hide-n-seek/)

Edge users: I recommend that you download from the Chrome Web Store because it releases extension updates much faster than Edge Add-ons (1-2 days versus 2–4 weeks).

## **How It Was Made**

Hide n' Seek was written in HTML, CSS, and JavaScript. No libraries or frameworks were used.

Graphic artwork was drawn with BoxySVG.

The promotional video was created with a combination of Adobe After Effects and Adobe Premiere Pro.

## **Release Notes**

- 6.0.0
  - Release date
    - 2025-11-03
  - New features
    - Block by keyword
      - You can now block jobs by keyword. Just open the popup, enter a keyword, and press Enter! You can also block jobs with regular expressions. For example, you could block /part[\s-]?time/i to block many variations of part time: part-time, parttime, part time, Part-Time
    - Donate to Charm
      - If you're able to support Hide n' Seek by feeding Charm, that would be super appreciated!
- 5.1.3
  - Release date
    - 2024-12-20
  - Bug fix
    - Fixes maximum call stack issue with very large exports. Many thanks to [wchen342](https://github.com/wchen342) for discovering and contributing this fix!
  - Improvement
    - Improves compatibility with the inDoors extension. Many thanks to [wchen342](https://github.com/wchen342) for discovering and contributing this improvement!
- 5.1.2
  - Release date
    - 2024-11-28
  - Patch
    - Glassdoor recently updated their website code, which affected the extension's ability to detect company names. This update fixes this issue.
- 5.1.1
  - Release date
    - 2024-11-25
  - Bug fix
    - In the Firefox version of Hide n' Seek, company names were previously not being detected due to a change in LinkedIn's company name selector.
    - Many thanks to [alexmerm](https://github.com/alexmerm) for reporting this issue!
- 5.1.0
  - Release date
    - 2024-11-02
  - Improvements
    - Updated data storage strategy so that many more jobs can be blocked. Previously, a few hundred jobs could be blocked before the extension's sync storage quota would have been exceeded. Now, users can block thousands of jobs.
    - A notification now shows when a user exceeds the sync storage quota for the extension. Users who exceed the sync storage quota will still be able to block jobs, but the blocked jobs won't sync.
    - Many thanks to [wchen342](https://github.com/wchen342) for contributing this fix!
    - This update resolves [#40](https://github.com/damianmgarcia/Hide-n-Seek/issues/40).
- 5.0.5
  - Release date
    - 2024-10-06
  - Improvement
    - Removed web_accessible_resources from the manifest
- 5.0.4
  - Release date
    - 2024-09-15
  - Bug fix
    - Updated the LinkedIn job detection heuristic. Many thanks to [wchen342](https://github.com/wchen342) for contributing this fix!
- 5.0.3
  - Release date
    - 2024-09-06
  - Bug fix
    - Unable to block promoted jobs on non-English versions of LinkedIn
      - Updated the LinkedIn promoted job detection heuristic
- 5.0.2
  - Release date
    - 2024-08-28
  - Bug fix
    - Backup fails when the blocked jobs list includes company names with non-ASCII characters
      - Added support for non-ASCII characters in company names. This change resolves [#34](https://github.com/damianmgarcia/Hide-n-Seek/issues/34). Once again, many thanks to [Matej9937](https://github.com/Matej9937) for discovering this issue, documenting it with incredible attention to detail, and using amazing problem solving skills to help find a solution!
- 5.0.1
  - Release date
    - 2024-08-11
  - Patch
    - Add support for a new LinkedIn job listing format
      - Added support for a new LinkedIn job listing format where the company name is separated by its location with a middle dot instead of being on a separate line. This change resolves [#32](https://github.com/damianmgarcia/Hide-n-Seek/issues/32). Many thanks to [Matej9937](https://github.com/Matej9937) for discovering this issue, documenting it with incredible attention to detail, and using amazing problem solving skills to help find a solution!
      - Updated promoted job detection algorithm
- 5.0.0
  - Release date
    - 2024-07-28
  - New features
    - Backup and Restore
      - You can now backup your settings and hidden jobs to a file on your device, and then restore them later when you need to. The backup file does not include any personal data, so you can freely share it with others as a way of sharing your hidden jobs list with them.
- 4.3.3
  - Release date
    - 2024-04-01
  - Bug fixes
    - Chrome: Fixed bug in which popup job searches get stuck on "Searching..." after starting a search. This appears to be caused by a [Chromium bug](https://issues.chromium.org/issues/40288048)
    - Fixed a bug caused by pointer events bubbling through block buttons, leading to jobs opening in Glassdoor when clicking a block button
    - Added permission notifications in Firefox and permission requests in Chrome and Edge when permissions are missing when attempting to perform a job search with the popup
- 4.3.2
  - Release date
    - 2024-03-31
  - Bug fixes
    - Firefox: Fixed buttons in popup list missing the remove icon
- 4.3.1
  - Release date
    - 2024-03-30
  - Bug fixes
    - Firefox: Fixed popup search getting stuck on "Searching..." after starting a search
- 4.3.0
  - Release date
    - 2024-03-30
  - Improvements
    - Added support for Firefox
    - Added support for Glassdoor
- 4.2.8
  - Release date
    - 2023-12-27
  - Improvements
    - Small UI improvements
      - The "x" remove icons on hidden job buttons in the popup list now become red when you hover over them.
      - A job attribute's title text now shows when you hover over any part of the job attribute toggle button, not just when you hover over the job attribute title itself.
  - Bug fixes
    - Incorrect pointer priority in popup hidden jobs list
      - An element below the hidden jobs list that was negatively affecting scroll and click behavior has been fixed.
- 4.2.7
  - Release date
    - 2023-11-01
  - Bug fixes
    - Companies on Indeed being detected as "Unknown Company"
      - Indeed's recent website update broke company name detection, but this is now resolved.
- 4.2.6
  - Release date
    - 2023-09-02
  - Bug fixes
    - Duplicated hidden job overlays on the Indeed job feed with Chrome
      - The caching of job listings has been adjusted to prevent the duplication of hidden job overlays on previously-loaded job listings. This issue specifically occurred whenever the Indeed job feed lazy-loaded new listings, and only with Chrome (not Edge).
- 4.2.5
  - Release date
    - 2023-08-28
  - Bug fixes
    - Not optimized for discoverability by search engines
      - Updated the name in the manifest to improve discoverability by search engines.
- 4.2.4
  - Release date
    - 2023-08-24
  - Bug fixes
    - False positive job listings on certain pages of the signed-out version of LinkedIn
      - Job listing detection has been adjusted to eliminate false positives on certain pages of the signed-out version of LinkedIn.
    - Missing extension button badge after pressing back/forward buttons on Indeed
      - The extension is now able to detect when this happens and updates the badge accordingly.
- 4.2.3
  - Release date
    - 2023-08-20
  - Bug fixes
    - UI not showing on Indeed
      - Changes to Indeed's code prevented detection of job listings. This update resolves this issue by taking into account these changes.
- 4.2.2
  - Release date
    - 2023-05-14
  - Improvements
    - Added support for all non-US versions of Indeed
      - The extension now works with all non-US versions of Indeed. This update resolves [#14](https://github.com/damianmgarcia/Hide-n-Seek/issues/14).
    - Added network connectivity handling to the job search popup
      - The job search popup now automatically disables itself when your device is offline, and it also lets you know if it is unable to connect to a job board's site before submitting your job search query.
- 4.1.2
  - Release date
    - 2023-04-18
  - Bug fixes
    - UI not showing
      - Some code optimizations seem to have reduced the frequency of [this issue](https://github.com/damianmgarcia/Hide-n-Seek/issues/11). However, the [source of this bug may be Chrome itself](https://bugs.chromium.org/p/chromium/issues/detail?id=1426461).
    - Popup scrollbar not visible when page zoom is greater than 100%
      - Previously, the popup's main (body) scrollbar, which is only necessary when page zoom is greater than 100%, was available, but not visible, because it was black on top of a black background. Now the scrollbar is visible so that users with a page zoom greater than 100% can easily use it.
- 4.1.1
  - Release date
    - 2023-02-24
  - Bug fixes
    - UI not showing
      - See details [here](https://github.com/damianmgarcia/Hide-n-Seek/pull/5)
- 4.1.0
  - Release date
    - 2023-02-19
  - Improvements
    - Added support for the signed-out version of LinkedIn's job search
      - The extension is now compatible with the signed-out version of LinkedIn's job search.
- 4.0.0
  - Release date
    - 2023-02-14
  - New features
    - Start a job search from the popup
      - If you are not already searching for jobs, the option panel now displays a search box that lets you start a job search.
  - Improvements
    - Support for LinkedIn job collections and Indeed job feed
      - The extension now detects and adds "hide" buttons to jobs in LinkedIn job collections and Indeed job feeds.
    - Popup keyboard accessibility
      - Tabbing through the popup is now a consistent and reliable experience for keyboard users.
  - Bug fixes
    - UI not showing on LinkedIn after clicking browser's back or forward buttons
      - A MutationObserver for detecting jobs would sometimes stop working during back/forward web navigation on LinkedIn because LinkedIn would remove the element that the observer was observing. This issue has been resolved.
- 3.1.0
  - Release date
    - 2023-02-03
  - Improvements
    - Added Firefox support
      - Firefox 109, released 2023-01-17, added support for Manifest Version 3 (MV3) extensions.
      - [Firefox's handling of permissions for MV3 extensions is broken](https://github.com/w3c/webextensions/issues/119#issuecomment-965799707). Unlike other browsers, Firefox does not ask users to grant permissions during installation, nor does it make it obvious enough to users that permissions are needed even when they search for jobs on a supported job board. Instead, users must take additional steps after installation to grant necessary permissions. This is an unfortunate user experience. Therefore, publication to Firefox Add-ons has been suspended until Firefox resolves this issue.
- 3.0.0
  - Release date
    - 2023-02-01
  - New features
    - View and manage hidden jobs from popup
      - The extension's browser button popup includes a new list of hidden jobs. It allows you to easily see and remove jobs that you have hidden.
  - Improvements
    - Refined user interface and user experience
      - The behaviors, colors, and animations of user interface elements have been updated.
- 2.0.1
  - Release date
    - 2023-01-23
  - Bug fixes
    - UI not showing on LinkedIn
      - A MutationObserver was called to observe for mutations on an element that, sometimes, did not yet exist in the DOM. This was fixed with the help of a function that waits for the necessary element to populate the DOM before observing it.
- 2.0.0
  - Release date
    - 2023-01-21
  - New features
    - Remove hidden jobs from display
      - The extension's browser button popup includes a new toggle button, "Do not display hidden jobs", that lets you remove hidden jobs from view, rather than hide them behind overlays.
    - Hidden jobs tally
      - The toolbar button now includes a tally of hidden jobs. The tally increases or decreases by 1 each time a company is hidden or unhidden, respectively. It also increases or decreases by 1 if promoted or sponsored jobs are hidden or unhidden, respectively. A simple breakdown of the tally is displayed when your cursor hovers over the extension's browser button.
  - Improvements
    - No more delay when unhiding all jobs
      - Clicking the "Unhide all jobs" button (or its "Undo" button) now produces instantaneous results across all active tabs and windows. Previously, there was a short delay.
  - Bug fixes
    - Multiple content-script and CSS injections
      - A new script-check mechanism prevents multiple injections of content-scripts and stylesheets, which would occasionally lead to a "doubling" effect of the UI.
- 1.0.0
  - Release date
    - 2023-01-02

# **Hide n' Seek**

![A promotional marquee for the Hide n' Seek browser extension. The Hide n' Seek logo and name are featured on the left side of the marquee. The logo is a simple drawing of a briefcase, bisected diagonally, with one side a light-brown color and the other side a black color. The face of a black cat with yellow eyes is partially visible as it peeks around the brown edge of the diagonal bisection. A "before and after" diagram on the right side of the marquee shows how Hide n' Seek hides jobs and is titled "View the jobs you seek. Hide the ones you don't"](/images/promotional-marquee-normalized.svg)

## **Description**

Hide n' Seek browser extension lets users hide jobs _by company name_ on job boards such as LinkedIn and Indeed.

It also lets users hide _sponsored jobs_.

## **Usage**

- Get started by clicking the Hide n' Seek browser button to open the popup. Select a job board, enter a job name, and then click the search button. You may also go directly to a supported job board's website to perform your search if you prefer. Hide n' Seek will work either way.

<img src="/images/usage-job-search-normalized.svg" width="73.449131513647642679900744416873%" alt="A diagram that shows a job search in the Hide n' Seek popup" /><br><br>

- Click a job's "hide" button and all jobs by that company will be hidden behind an overlay.

<img src="/images/usage-hide-job-normalized.svg" width="100%" alt='A "before and after" diagram shows the effect of hiding a job' /><br><br>

- Click a job's "unhide" button to remove the overlays.

<img src="/images/usage-unhide-job-normalized.svg" width="100%" alt='A "before and after" diagram shows the effect of unhiding a job' /><br><br>

- Click the Hide n' Seek browser button for additional options:
  - Scroll through your list of hidden jobs and click a hidden job's name to remove it.
  - Click the "Unhide all jobs" button to reset your hidden jobs list. This action can be undone by clicking the "Undo" button.
  - Click the "Do not display hidden jobs" button to remove hidden jobs from display, rather than hide them behind overlays.

<img src="/images/usage-unhide-all-jobs-normalized.svg" width="73.449131513647642679900744416873%" alt="A diagram of Hide n' Seek's browser button, along with its popup, shows a list of hidden jobs and controls for managing the list." /><br><br>

## **Supported Job Boards**

- LinkedIn
- Indeed

## **Privacy Policy**

Nobody has access to Hide n' Seek data except for the users of the device that Hide n' Seek is installed on. Data is not shared or sold.

All data required for Hide n' Seek to function, such as remembering which jobs to hide, is stored on the user's device.

Hide n' Seek data may be synced with the user's other devices if their browser has extension data synchronization enabled.

## **Permissions**

Hide n' Seek needs the following permissions to work:

- Read and change your data on all indeed.com sites and all linkedin.com sites
  - Hide n' Seek needs this permission to add its UI elements, such as "hide" buttons and job overlays, to the job board's website.
- Read your browsing history
  - Hide n' Seek needs this permission to detect when the user is searching for jobs on a supported job board's website so that it knows when to run.

Note that the above permissions are written exactly as Chrome displays them to the user during installation of Hide n' Seek. Other browsers will ask for the same permissions, but the wording may vary.

### **Firefox Permissions**

Unlike Chrome and Edge, Firefox does not ask for the permissions that Hide n' Seek needs during installation.

Firefox incorrectly labels the permissions that Hide n' Seek needs as "Optional permissions for added functionality."

**_However, these permissions must be granted or Hide n' Seek will not work._**

To grant the permissions that Hide n' Seek needs, Firefox users must perform the following steps:

1. Click the menu button
2. Click "Add-ons and themes"

<img src="/images/firefox-permissions-setup-1-normalized.svg" width="28.188585607940446650124069478908%" alt="A screenshot of Firefox that corresponds with step 1 and step 2" /><br><br>

3. Click "Extensions"
4. Click the "..." button
5. Click "Manage"

<img src="/images/firefox-permissions-setup-2-normalized.svg" width="100%" alt="A screenshot of Firefox that corresponds with step 3, step 4, and step 5" /><br><br>

6. Click "Permissions"
7. Turn on "Access your data for sites in the [Job Board URL] domain" for the job boards that you want Hide n' Seek to work on

<img src="/images/firefox-permissions-setup-3-normalized.svg" width="67.344913151364764267990074441687%" alt="A screenshot of Firefox that corresponds with step 6 and step 7" /><br><br>

Once finished, perform a job search on LinkedIn or Indeed. **_If you do not see the Hide n' Seek "hide" buttons on your job search list, reload the page by clicking Firefox's reload button._**

## **Releases**

- [Chrome](https://chrome.google.com/webstore/detail/hide-n-seek/agghbaheofcoecndkbflbnggdjcmiaml)
- [Edge](https://microsoftedge.microsoft.com/addons/detail/hide-n-seek/lnfbapfcdippajlhlmefaabhkdbmgiog)

## **Release Notes**

- 4.1.1
  - Release date
    - 2023-02-24
  - Bug fixes
    - Hide n' Seek UI not showing
      - See details [here](https://github.com/damianmgarcia/Hide-n-Seek/pull/5)
- 4.1.0
  - Release date
    - 2023-02-19
  - Improvements
    - Added support for the signed-out version of LinkedIn's job search
      - Hide n' Seek is now compatible with the signed-out version of LinkedIn's job search.
- 4.0.0
  - Release date
    - 2023-02-14
  - New features
    - Start a job search from the popup
      - If you are not already searching for jobs, the Hide n' Seek browser button popup now displays a search box that lets you start a job search.
  - Improvements
    - Support for LinkedIn job collections and Indeed job feed
      - Hide n' Seek now detects and adds "hide" buttons to jobs in LinkedIn job collections and Indeed job feeds.
    - Popup keyboard accessibility
      - Tabbing through the popup is now a consistent and reliable experience for keyboard users.
  - Bug fixes
    - Hide n' Seek UI not showing on LinkedIn after clicking browser's back or forward buttons
      - A MutationObserver for detecting jobs would sometimes stop working during back/forward web navigation on LinkedIn because LinkedIn would remove the element that the observer was observing. This issue has been resolved.
- 3.1.0
  - Release date
    - 2023-02-03
  - Improvements
    - Added Firefox support
      - Firefox 109, released 2023-01-17, added support for Manifest Version 3 (MV3) extensions, such as Hide n' Seek.
      - [Firefox's handling of permissions for MV3 extensions, such as Hide n' Seek, is broken](https://github.com/w3c/webextensions/issues/119#issuecomment-965799707). Unlike other browsers, Firefox does not ask users to grant the permissions that Hide n' Seek needs during installation, nor does it make it obvious enough to users that permissions are needed even when they search for jobs on a supported job board. [Instead, users must take additional steps after installation of Hide n' Seek to grant the permissions that Hide n' Seek needs](#firefox-permissions). This is an unfortunate user experience. Therefore, the publication of Hide n' Seek to Firefox Add-ons has been suspended until Firefox resolves this issue.
- 3.0.0
  - Release date
    - 2023-02-01
  - New features
    - View and manage hidden jobs from popup
      - The Hide n' Seek browser button popup includes a new list of hidden jobs. It allows you to easily see and remove jobs that you have hidden.
  - Improvements
    - Refined user interface and user experience
      - The behaviors, colors, and animations of user interface elements have been updated.
- 2.0.1
  - Release date
    - 2023-01-23
  - Bug fixes
    - Hide n' Seek UI not showing on LinkedIn
      - A MutationObserver was called to observe for mutations on an element that, sometimes, did not yet exist in the DOM. This was fixed with the help of a function that waits for the necessary element to populate the DOM before observing it.
- 2.0.0
  - Release date
    - 2023-01-21
  - New features
    - Remove hidden jobs from display
      - The Hide n' Seek browser button popup includes a new toggle button, "Do not display hidden jobs", that lets you remove hidden jobs from view, rather than hide them behind overlays.
    - Hidden jobs tally
      - Hide n' Seek now keeps a tally of what has been hidden next to the Hide n' Seek browser button. The tally increases or decreases by 1 each time a company is hidden or unhidden, respectively. It also increases or decreases by 1 if promoted or sponsored jobs are hidden or unhidden, respectively. A simple breakdown of the tally is displayed when your cursor hovers over the Hide n' Seek browser button.
  - Improvements
    - No more delay when unhiding all jobs
      - Clicking the "Unhide all jobs" button (or its "Undo" button) now produces instantaneous results across all active tabs and windows. Previously, there was a short delay.
  - Bug fixes
    - Multiple content-script and CSS injections
      - A new script-check mechanism prevents multiple injections of content-scripts and stylesheets, which would occasionally lead to a "doubling" effect of the UI.
- 1.0.0
  - Release date
    - 2023-01-02

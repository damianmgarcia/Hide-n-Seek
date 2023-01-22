# **Hide n' Seek**

![A promotional marquee for the Hide n' Seek browser extension. The Hide n' Seek logo and name are featured on the left side of the marquee. The logo is a simple drawing of a briefcase, bisected diagonally, with one side a light-brown color and the other side a black color. The face of a black cat with yellow eyes is partially visible as it peeks around the brown edge of the diagonal bisection. A "before and after" diagram on the right side of the marquee shows how Hide n' Seek hides jobs and is titled "View the jobs you seek. Hide the ones you don't"](/images/promotional-marquee-normalized.svg)

## **Description**

Hide n' Seek browser extension lets users hide jobs _by company name_ on job boards such as LinkedIn and Indeed.

It also lets users hide _sponsored jobs_.

## **Usage**

- Click a job's "hide" button and all jobs by that company will be hidden behind an overlay.

<img src="/images/usage-hide-job-normalized.svg" width="100%" alt='A "before and after" diagram shows the effect of hiding a job' /><br><br>

- Click a job's "unhide" button to remove the overlays.

<img src="/images/usage-unhide-job-normalized.svg" width="100%" alt='A "before and after" diagram shows the effect of unhiding a job' /><br><br>

- Click the Hide n' Seek browser button for some additional options:
  - Click the "Do not display hidden jobs" button to remove hidden jobs from display, rather than hide them behind overlays.
  - Click the "Unhide all jobs" button to reset your hidden jobs list. This action can be undone by clicking the "Undo" button.

<img src="/images/usage-unhide-all-jobs-normalized.svg" width="73.449131513647642679900744416873%" alt="A diagram of Hide n' Seeks browser button, along with its popup, shows several buttons: &quot;Do not display hidden jobs&quot;, as well as a set of buttons below for unhiding all jobs, &quot;Unhide all jobs&quot;, and its undo button, &quot;Undo&quot;" /><br><br>

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

## **Releases**

- [Chrome](https://chrome.google.com/webstore/detail/hide-n-seek/agghbaheofcoecndkbflbnggdjcmiaml)
- [Edge](https://microsoftedge.microsoft.com/addons/detail/hide-n-seek/lnfbapfcdippajlhlmefaabhkdbmgiog)

## **Release Notes**

### Chrome / Edge

- 2.0.0

  - Release date
    - 2023-01-21
  - New features
    - Remove hidden jobs from display
      - The Hide n' Seek browser button popup includes a new toggle button, "Do not display hidden jobs", that lets you remove hidden jobs from view, rather than hide them behind overlays.
    - Hidden jobs tally
      - Hide n' Seek now keeps a tally of what has been hidden next to the Hide n' Seek browser button. The tally increases or decreases by 1 each time a company is hidden or unhidden, respectively. It also increases or decreases by 1 if promoted or sponsored jobs are hidden or unhidden, respectively. A simple breakdown of the tally is displayed when your cursor hovers over the Hide n' Seek browser button.
    - No more delay when unhiding all jobs
      - Clicking the "Unhide all jobs" button (or its "Undo" button) now produces instantaneous results. Previously, there was a short delay.
  - Bug fixes
    - Multiple content-script and CSS injections
      - A new script-check mechanism prevents multiple injections of content-scripts and stylesheets, which would occasionally lead to a "doubling" effect of the UI.

- 1.0.0
  - Release date
    - 2023-01-02

const jobBoards = (() => {
  const commonProcessors = {
    trim: {
      process: "replace",
      pattern: "^\\s+|\\s+$",
      flags: "gm",
      replacement: "",
    },
    subtractHnsText: {
      process: "subtract",
      selector: ".hns-container",
    },
  };

  const commonAttributes = {
    keyword: {
      name: "Keyword",
      id: "keyword",
      removableValues: true,
      match: "pattern",
      processors: [commonProcessors.subtractHnsText],
    },
  };

  const jobBoards = [
    {
      id: "glassdoor",
      name: "Glassdoor",
      defaultUrl: "https://glassdoor.com",
      listingPaths: ["/"],
      listingSelector: "li[data-test='jobListing']",
      logo: {
        src: "/assets/images/glassdoor-logo.svg",
        alt: "Glassdoor's logo",
        brandColor: "#00A264",
      },
      attributes: [
        commonAttributes.keyword,
        {
          name: "Company",
          id: "companyName",
          removableValues: false,
          match: "exact",
          selector: `
            .EmployerProfile_compactEmployerName__LE242,
            .EmployerProfile_compactEmployerName__9MGcV,
            [class*=EmployerProfile_compactEmployerName__]`,
          processors: [commonProcessors.trim],
          default: true,
        },
      ],
    },
    {
      id: "indeed",
      name: "Indeed",
      defaultUrl: "https://indeed.com",
      listingPaths: ["/"],
      listingSelector: "li:has(.result:not([aria-hidden='true']))",
      logo: {
        src: "/assets/images/indeed-logo.svg",
        alt: "Indeed's logo",
        brandColor: "#003A9B",
      },
      attributes: [
        commonAttributes.keyword,
        {
          name: "Company",
          id: "companyName",
          removableValues: false,
          match: "exact",
          selector: ".companyName, [data-testid='company-name']",
          processors: [commonProcessors.trim],
          default: true,
        },
        {
          name: "Status",
          id: "promotionalStatus",
          removableValues: false,
          match: "exact",
          selector: ".sponsoredJob",
          processors: [
            {
              process: "replace",
              pattern: ".*",
              flags: "s",
              replacement: "Promoted",
            },
          ],
        },
      ],
    },
    {
      id: "linkedIn",
      name: "LinkedIn",
      defaultUrl: "https://linkedin.com",
      listingPaths: ["/jobs/"],
      listingSelector: `
        li:has(.job-card-container, .job-search-card, .job-card-job-posting-card-wrapper, [data-job-id]),
        div > [data-view-name='job-card'] > a,
        div:has(> [data-view-name='job-search-job-card']),
        [data-component-type=LazyColumn] :is(div:has(+ hr, + a), hr + div:last-child):has(figure) > div:not(:has(> a)),
        [data-component-type=LazyColumn] :is(div:has(+ hr, + a), hr + div:last-child):has(figure) > div > a,
        [data-component-type=LazyColumn] :is(div:has(+ hr, + a), hr + div:last-child):has(figure) > a`,
      logo: {
        src: "/assets/images/linkedin-logo.svg",
        alt: "LinkedIn's logo",
        brandColor: "#0a66c2",
      },
      attributes: [
        commonAttributes.keyword,
        {
          name: "Company",
          id: "companyName",
          removableValues: false,
          selector: `
            .job-card-container__primary-description,
            .job-card-container__company-name,
            .base-search-card__subtitle,
            .artdeco-entity-lockup__subtitle > *:not(.visually-hidden),
            div > [data-view-name='job-card'] figure + div > div:first-child p + div > p:first-child,
            div > [data-view-name='job-search-job-card'] p + div > p,
            [data-component-type=LazyColumn] :is(div:has(+ hr, + a), hr + div:last-child):has(figure) > div:not(:has(> a)) figure + div > div:first-child * + *:nth-child(2):has(> p),
            [data-component-type=LazyColumn] :is(div:has(+ hr, + a), hr + div:last-child):has(figure) > div > a figure + div > div:first-child * + *:nth-child(2):has(> p),
            [data-component-type=LazyColumn] :is(div:has(+ hr, + a), hr + div:last-child):has(figure) > a figure + div > div:first-child * + *:nth-child(2):has(> p)`,
          match: "exact",
          processors: [
            commonProcessors.trim,
            {
              process: "replace",
              pattern: "\\s*[·•]\\s*.*$",
              flags: "gm",
              replacement: "",
            },
          ],
          default: true,
        },
        {
          name: "Status",
          id: "promotionalStatus",
          removableValues: false,
          selector: `
            .job-card-list__footer-wrapper,
            .job-card-container__footer-wrapper,
            div > [data-view-name='job-card'] figure + div > div:last-child`,
          match: "exact",
          processors: [
            {
              process: "match",
              pattern: [
                "الترويج" /* Arabic */,
                "প্রমোটেড" /* Bangla */,
                "推广" /* Chinese (Simplified) */,
                "已宣傳" /* Chinese (Traditional) */,
                "Propagováno" /* Czech */,
                "Promoveret" /* Danish */,
                "Gepromoot" /* Dutch */,
                "Promoted" /* English */,
                "Mainostettu" /* Finnish */,
                "Promu\\(e\\)" /* French */,
                "Anzeige" /* German */,
                "Προωθημένη" /* Greek */,
                "प्रमोट किया गया" /* Hindi */,
                "Kiemelt" /* Hungarian */,
                "Dipromosikan" /* Indonesian */,
                "Promosso" /* Italian */,
                "プロモーション" /* Japanese */,
                "프로모션" /* Korean */,
                "Dipromosikan" /* Malay */,
                "प्रमोट केले" /* Marathi */,
                "Promotert" /* Norwegian */,
                "Promowana oferta pracy" /* Polish */,
                "Promovida" /* Portuguese */,
                "ਪ੍ਰੋਮੋਟ ਕੀਤਾ" /* Punjabi */,
                "Promovat" /* Romanian */,
                "Продвигается" /* Russian */,
                "Promocionado" /* Spanish */,
                "Marknadsfört" /* Swedish */,
                "Na-promote" /* Tagalog */,
                "ప్రమోట్ చేయబడింది" /* Telugu */,
                "โปรโมทแล้ว" /* Thai */,
                "Tanıtıldı" /* Turkish */,
                "Просувається" /* Ukrainian */,
                "Được quảng bá" /* Vietnamese */,
              ].join("|"),
            },
          ],
        },
      ],
    },
  ];

  const optionalHostPermissions =
    chrome.runtime.getManifest().optional_host_permissions;
  for (const jobBoard of jobBoards) {
    const origins = optionalHostPermissions.filter((origin) =>
      new RegExp(jobBoard.id, "i").test(origin),
    );
    const listingPages = [];
    for (const origin of origins) {
      for (const listingPath of jobBoard.listingPaths) {
        listingPages.push(origin.replace(/\/\*$/, `${listingPath}*`));
      }
    }
    jobBoard.matchPatterns = { origins, listingPages };
  }

  return jobBoards;
})();

const matchPatterns = {
  listingPages: jobBoards.flatMap(
    (jobBoard) => jobBoard.matchPatterns.listingPages,
  ),
};

const getJobBoardByUrl = (url) => {
  if (!URL.canParse(url)) return;
  const { hostname, pathname } = new URL(url);
  for (const jobBoard of jobBoards) {
    for (const listingPage of jobBoard.matchPatterns.listingPages) {
      const match = /^https:\/\/\*\.(?<domain>[^/]+)(?<path>[^*]+)\*$/.exec(
        listingPage,
      );
      if (
        match &&
        match.groups.domain &&
        match.groups.path &&
        (hostname.endsWith(`.${match.groups.domain}`) ||
          hostname === match.groups.domain) &&
        pathname.startsWith(match.groups.path)
      )
        return jobBoard;
    }
  }
};

const getJobBoardById = (() => {
  const jobBoardById = Object.fromEntries(
    jobBoards.map((jobBoard) => [jobBoard.id, jobBoard]),
  );
  return (id) => jobBoardById[id];
})();

const getJobBoardTabs = async (filters = {}) => {
  const tabs = await chrome.tabs.query({
    url:
      filters.matchPatterns ||
      (filters.jobBoardId &&
        getJobBoardById(filters.jobBoardId)?.matchPatterns.listingPages) ||
      matchPatterns.listingPages,
    windowType: "normal",
  });

  return tabs.filter((tab) => getJobBoardByUrl(tab.url));
};

export {
  jobBoards,
  matchPatterns,
  getJobBoardByUrl,
  getJobBoardById,
  getJobBoardTabs,
};

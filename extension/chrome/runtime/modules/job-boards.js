const jobBoards = (() => {
  const getTrimProcessor = () => ({
    process: "replace",
    pattern: "^\\s+|\\s+$",
    flags: "gm",
    replacement: "",
  });

  const getSubtractHnsProcessor = () => ({
    process: "subtract",
    selector: ".hns-container",
  });

  const getAddTextProcessor = (textToAdd) => ({
    process: "addText",
    textToAdd,
  });

  const getKeywordAttribute = (extras = {}) => ({
    name: "Keyword",
    id: "keyword",
    blockButton: false,
    removableValues: true,
    valueMatch: "pattern",
    valueComposition: [{ processors: [getSubtractHnsProcessor()] }],
    ...extras,
  });

  const getCompanyAttribute = (extras = {}) => ({
    name: "Company",
    id: "company",
    blockButton: true,
    removableValues: false,
    valueMatch: "exact",
    ...extras,
  });

  const getPromotedAttribute = (extras = {}) => ({
    name: "Status",
    id: "promoted",
    blockButton: false,
    removableValues: false,
    valueMatch: "exact",
    ...extras,
  });

  const jobAttributeSeparator = ": ";
  const getJobAttribute = (extras = {}) => {
    const jobAttribute = {
      name: "Job",
      id: "job",
      blockButton: true,
      removableValues: false,
      valueMatch: "exact",
      ...extras,
    };
    jobAttribute.valueComposition[0].processors.push(
      getAddTextProcessor(jobAttributeSeparator),
    );
    return jobAttribute;
  };

  const glassdoorCompanySelector =
    "[class*=EmployerProfile_compactEmployerName__]";
  const indeedCompanySelector = ".companyName, [data-testid='company-name']";
  const linkedInCompanySelector =
    ".job-card-container__primary-description," +
    ".job-card-container__company-name," +
    ".base-search-card__subtitle," +
    ".artdeco-entity-lockup__subtitle > *:not(.visually-hidden)," +
    "div > [data-view-name='job-card'] figure + div > div:first-child p + div > p:first-child," +
    "div > [data-view-name='job-search-job-card'] p + div > p," +
    "[data-component-type=LazyColumn] :is(div:has(+ hr, + a), hr + div:last-child):has(figure) > div:not(:has(> a)) figure + div > div:first-child * + *:nth-child(2):has(> p)," +
    "[data-component-type=LazyColumn] :is(div:has(+ hr, + a), hr + div:last-child):has(figure) > div > a figure + div > div:first-child * + *:nth-child(2):has(> p)," +
    "[data-component-type=LazyColumn] :is(div:has(+ hr, + a), hr + div:last-child):has(figure) > a figure + div > div:first-child * + *:nth-child(2):has(> p)";

  const jobBoards = [
    {
      id: "glassdoor",
      name: "Glassdoor",
      defaultUrl: "https://glassdoor.com",
      isSPA: false,
      listingPaths: ["/"],
      listingSelector: "li[data-test='jobListing']",
      logo: {
        src: "/assets/images/glassdoor-logo.svg",
        alt: "Glassdoor's logo",
        brandColor: "#00A264",
      },
      attributes: [
        getKeywordAttribute(),
        getCompanyAttribute({
          valueComposition: [
            {
              selector: glassdoorCompanySelector,
              processors: [getTrimProcessor()],
            },
          ],
        }),
        getJobAttribute({
          valueComposition: [
            {
              selector: glassdoorCompanySelector,
              processors: [getTrimProcessor()],
            },
            {
              selector: "[data-test='job-title']",
              processors: [getTrimProcessor()],
            },
          ],
        }),
      ],
    },
    {
      id: "indeed",
      name: "Indeed",
      defaultUrl: "https://indeed.com",
      isSPA: false,
      listingPaths: ["/"],
      listingSelector: "li:has(.result:not([aria-hidden='true']))",
      logo: {
        src: "/assets/images/indeed-logo.svg",
        alt: "Indeed's logo",
        brandColor: "#003A9B",
      },
      attributes: [
        getKeywordAttribute(),
        getCompanyAttribute({
          valueComposition: [
            {
              selector: indeedCompanySelector,
              processors: [getTrimProcessor()],
            },
          ],
        }),
        getJobAttribute({
          valueComposition: [
            {
              selector: indeedCompanySelector,
              processors: [getTrimProcessor()],
            },
            {
              selector: ".jobTitle",
              processors: [getTrimProcessor()],
            },
          ],
        }),
        getPromotedAttribute({
          valueComposition: [
            {
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
        }),
      ],
    },
    {
      id: "linkedIn",
      name: "LinkedIn",
      defaultUrl: "https://linkedin.com",
      isSPA: true,
      listingPaths: ["/jobs/"],
      listingSelector:
        "li:has(.job-card-container, .job-search-card, .job-card-job-posting-card-wrapper, [data-job-id])," +
        "div > [data-view-name='job-card'] > a," +
        "div:has(> [data-view-name='job-search-job-card'])," +
        "[data-component-type=LazyColumn] :is(div:has(+ hr, + a), hr + div:last-child):has(figure) > div:not(:has(> a))," +
        "[data-component-type=LazyColumn] :is(div:has(+ hr, + a), hr + div:last-child):has(figure) > div > a," +
        "[data-component-type=LazyColumn] :is(div:has(+ hr, + a), hr + div:last-child):has(figure) > a",
      logo: {
        src: "/assets/images/linkedin-logo.svg",
        alt: "LinkedIn's logo",
        brandColor: "#0a66c2",
      },
      attributes: [
        getKeywordAttribute(),
        getCompanyAttribute({
          valueComposition: [
            {
              selector: linkedInCompanySelector,
              processors: [
                getTrimProcessor(),
                {
                  process: "replace",
                  pattern: "\\s*[·•]\\s*.*$",
                  flags: "gm",
                  replacement: "",
                },
              ],
            },
          ],
        }),
        getJobAttribute({
          valueComposition: [
            {
              selector: linkedInCompanySelector,
              processors: [
                getTrimProcessor(),
                {
                  process: "replace",
                  pattern: "\\s*[·•]\\s*.*$",
                  flags: "gm",
                  replacement: "",
                },
              ],
            },
            {
              selector:
                "[data-component-type=LazyColumn] :is(div:has(+ hr, + a), hr + div:last-child):has(figure) > div:not(:has(> a)) figure + div > div:first-child div:first-child > p > span:nth-child(2)," +
                "[data-component-type=LazyColumn] :is(div:has(+ hr, + a), hr + div:last-child):has(figure) > div > a figure + div > div:first-child *:nth-child(1):has(> p) > p > span:nth-child(2)," +
                "[data-component-type=LazyColumn] :is(div:has(+ hr, + a), hr + div:last-child):has(figure) > a figure + div > div:first-child *:nth-child(1):has(> p) > p > span:nth-child(2)",
              processors: [getTrimProcessor()],
            },
          ],
        }),
        getPromotedAttribute({
          valueComposition: [
            {
              selector:
                ".job-card-list__footer-wrapper," +
                ".job-card-container__footer-wrapper," +
                "div > [data-view-name='job-card'] figure + div > div:last-child",
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
        }),
      ],
    },
  ];

  const addMatchPatterns = (() => {
    const optionalHostPermissions =
      chrome.runtime.getManifest().optional_host_permissions;
    return (jobBoard) => {
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
    };
  })();

  const addAttributeKeys = (jobBoard) => {
    for (const attribute of jobBoard.attributes) {
      attribute.storageKey = `${jobBoard.id}.${attribute.id}.blocked`;
      attribute.backupStorageKey = `${attribute.storageKey}.backup`;
    }
  };

  jobBoards.forEach(addMatchPatterns);
  jobBoards.forEach(addAttributeKeys);

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

export { jobBoards, matchPatterns, getJobBoardByUrl, getJobBoardById };

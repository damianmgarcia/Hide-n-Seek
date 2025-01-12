const jobBoards = (() => {
  const trim = {
    type: "replace",
    pattern: "^\\s+|\\s+$",
    flags: "gm",
    replacement: "",
  };

  return [
    {
      hostname: "glassdoor.com",
      id: "glassdoor",
      name: "Glassdoor",
      listingSelector: "li[data-test='jobListing']",
      attributes: [
        {
          name: "Company Name",
          id: "companyName",
          selector:
            ".EmployerProfile_compactEmployerName__LE242, .EmployerProfile_compactEmployerName__9MGcV",
          processing: [trim],
        },
      ],
    },
    {
      hostname: "indeed.com",
      id: "indeed",
      name: "Indeed",
      listingSelector: "li:has(.result)",
      attributes: [
        {
          name: "Company Name",
          id: "companyName",
          selector: ".companyName, [data-testid='company-name']",
          processing: [trim],
        },
        {
          name: "Promoted",
          id: "promotionalStatus",
          selector: ".sponsoredJob",
          processing: [
            {
              type: "replace",
              pattern: ".*",
              flags: "s",
              replacement: "Promoted",
            },
          ],
        },
      ],
    },
    {
      hostname: "linkedin.com",
      id: "linkedIn",
      name: "LinkedIn",
      listingSelector:
        "li:has(.job-card-container, .job-search-card, .job-card-job-posting-card-wrapper, [data-job-id])",
      attributes: [
        {
          name: "Company Name",
          id: "companyName",
          selector:
            ".job-card-container__primary-description, .job-card-container__company-name, .base-search-card__subtitle, .artdeco-entity-lockup__subtitle > span",
          processing: [
            trim,
            {
              type: "replace",
              pattern: "\\s·\\s.*$",
              flags: "gm",
              replacement: "",
            }, // test this to make sure it matches and removes the LinkedIn notation: [company name] · Something else
          ],
        },
        {
          name: "Promoted",
          id: "promotionalStatus",
          selector:
            ".job-card-list__footer-wrapper, .job-card-container__footer-wrapper",
          processing: [
            trim,
            {
              type: "replace",
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
              replacement: "Promoted",
            },
          ],
        },
      ],
    },
  ];
})();

const getJobBoardByHostname = (hostname) =>
  jobBoards.find(
    (jobBoard) =>
      hostname.endsWith(`.${jobBoard.hostname}`) ||
      hostname === jobBoard.hostname
  );

const getJobBoardIds = () => {
  return jobBoards.map((jobBoard) => jobBoard.id);
};

const getJobBoardTabs = (() => {
  const urlMatchPatterns =
    chrome.runtime.getManifest().content_scripts[0].matches;

  return async (forJobBoardId = "") => {
    const tabs = await chrome.tabs.query({
      url: urlMatchPatterns,
      windowType: "normal",
    });

    return tabs.filter((tab) =>
      jobBoards.some(
        (jobBoard) =>
          tab.url.includes(jobBoard.hostname) &&
          (!forJobBoardId || jobBoard.id === forJobBoardId)
      )
    );
  };
})();

export { getJobBoardByHostname, getJobBoardIds, getJobBoardTabs };

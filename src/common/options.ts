interface FeatureOption {
  enabled: boolean;
  [key: string]: unknown
}

interface Options {
  features: {
    [key: string]: FeatureOption;
  };
}

const defaultValue: Options = {
  features: {
    'all-pages-remove-force-download': {
      enabled: true,
    },
    'all-pages-replace-header-course-name': {
      enabled: true,
    },
    'all-pages-replace-navigation-texts': {
      enabled: true,
    },
    'dashboard-events-countdown': {
      enabled: true,
    },
    'dashboard-quick-course-view': {
      enabled: true,
    },
    'scorm-collapse-toc': {
      enabled: true,
    },
  },
};

export type { Options, FeatureOption };

export { defaultValue };

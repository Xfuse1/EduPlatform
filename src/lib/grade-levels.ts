export type EducationStage = "PRIMARY" | "PREPARATORY" | "SECONDARY" | "UNIVERSITY";

export type GradeLevelSelection = {
  stage: EducationStage;
  year: number;
};

type EducationStageConfig = {
  value: EducationStage;
  label: string;
  formattedLabel: string;
  prefixLabel: string;
  yearCount: number;
  aliases: string[];
};

type EducationYearOption = {
  value: number;
  label: string;
};

const YEAR_LABELS: Record<number, string> = {
  1: "الأولى",
  2: "الثانية",
  3: "الثالثة",
  4: "الرابعة",
  5: "الخامسة",
  6: "السادسة",
};

export const EDUCATION_STAGE_OPTIONS: EducationStageConfig[] = [
  {
    value: "PRIMARY",
    label: "ابتدائي",
    formattedLabel: "الابتدائي",
    prefixLabel: "الصف",
    yearCount: 6,
    aliases: ["ابتدائي"],
  },
  {
    value: "PREPARATORY",
    label: "إعدادي",
    formattedLabel: "الإعدادي",
    prefixLabel: "الصف",
    yearCount: 3,
    aliases: ["اعدادي", "إعدادي"],
  },
  {
    value: "SECONDARY",
    label: "ثانوي",
    formattedLabel: "الثانوي",
    prefixLabel: "الصف",
    yearCount: 3,
    aliases: ["ثانوي"],
  },
  {
    value: "UNIVERSITY",
    label: "جامعة",
    formattedLabel: "الجامعية",
    prefixLabel: "الفرقة",
    yearCount: 4,
    aliases: ["جامعه", "جامعة", "جامعي", "جامعية", "فرقة", "فرقه"],
  },
];

const educationStageByValue = Object.fromEntries(
  EDUCATION_STAGE_OPTIONS.map((option) => [option.value, option]),
) as Record<EducationStage, EducationStageConfig>;

const normalizedWordToYear = new Map<string, number>([
  ["الاولي", 1],
  ["الاول", 1],
  ["اولي", 1],
  ["اول", 1],
  ["الثانيه", 2],
  ["الثاني", 2],
  ["ثانيه", 2],
  ["ثاني", 2],
  ["الثالثه", 3],
  ["الثالث", 3],
  ["ثالثه", 3],
  ["ثالث", 3],
  ["الرابعه", 4],
  ["الرابع", 4],
  ["رابعه", 4],
  ["رابع", 4],
  ["الخامسه", 5],
  ["الخامس", 5],
  ["خامسه", 5],
  ["خامس", 5],
  ["السادسه", 6],
  ["السادس", 6],
  ["سادسه", 6],
  ["سادس", 6],
]);

function normalizeArabicDigits(value: string) {
  return value.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function normalizeArabicText(value: string) {
  return normalizeArabicDigits(value)
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ");
}

function extractYear(normalizedValue: string) {
  const numericMatch = normalizedValue.match(/(^|\s)([1-6])(\s|$)/);

  if (numericMatch) {
    return Number(numericMatch[2]);
  }

  for (const [word, year] of normalizedWordToYear.entries()) {
    if (normalizedValue.includes(word)) {
      return year;
    }
  }

  return null;
}

export function getEducationYears(stage: EducationStage): EducationYearOption[] {
  const stageConfig = educationStageByValue[stage];

  return Array.from({ length: stageConfig.yearCount }, (_, index) => {
    const year = index + 1;

    return {
      value: year,
      label: YEAR_LABELS[year],
    };
  });
}

export function formatGradeLevel(stage: EducationStage, year: number) {
  const stageConfig = educationStageByValue[stage];

  if (!stageConfig || year < 1 || year > stageConfig.yearCount) {
    return "";
  }

  return `${stageConfig.prefixLabel} ${YEAR_LABELS[year]} ${stageConfig.formattedLabel}`;
}

export function parseGradeLevel(value?: string | null): Partial<GradeLevelSelection> {
  if (!value) {
    return {};
  }

  const normalizedValue = normalizeArabicText(value);
  const stage = EDUCATION_STAGE_OPTIONS.find((option) =>
    option.aliases.some((alias) => normalizedValue.includes(normalizeArabicText(alias))),
  )?.value;

  if (!stage) {
    return {};
  }

  const year = extractYear(normalizedValue);
  const stageConfig = educationStageByValue[stage];

  if (!year || year > stageConfig.yearCount) {
    return { stage };
  }

  return {
    stage,
    year,
  };
}

export function getGradeLevelKey(value?: string | null) {
  if (!value) {
    return null;
  }

  const parsedGradeLevel = parseGradeLevel(value);

  if (parsedGradeLevel.stage && parsedGradeLevel.year) {
    return `${parsedGradeLevel.stage}:${parsedGradeLevel.year}`;
  }

  return normalizeArabicText(value);
}

export function isSameGradeLevel(left?: string | null, right?: string | null) {
  const leftKey = getGradeLevelKey(left);
  const rightKey = getGradeLevelKey(right);

  if (!leftKey || !rightKey) {
    return false;
  }

  return leftKey === rightKey;
}

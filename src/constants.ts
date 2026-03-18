const RESULT_TO_STR: Readonly<Record<string, string>> = {
  '0': '0-1',
  '0.5': '1/2-1/2',
  '1': '1-0',
  '?': '*',
};

const STR_TAGS = [
  'Black',
  'Date',
  'Event',
  'Result',
  'Round',
  'Site',
  'White',
] as const;

export { RESULT_TO_STR, STR_TAGS };

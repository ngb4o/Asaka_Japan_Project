export const OBJECT_ID_RULE = /^[0-9a-fA-F]{24}$/
export const OBJECT_ID_RULE_MESSAGE = 'Your string fails to match the Object Id pattern!'

/** Allow any TLD (incl. .local) for internal CRM emails */
export const EMAIL_JOI_OPTIONS = { tlds: { allow: false } }
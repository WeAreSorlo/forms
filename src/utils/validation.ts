export interface ValidationResponse {
  isValid: boolean | undefined
  messages: Array<string>
  value: any
}

export interface ValidationResponseReset extends ValidationResponse {
  isValid: undefined
}

export interface ValidationResponseError extends ValidationResponse {
  isValid: false
}

export interface ValidationResponseSuccess extends ValidationResponse {
  isValid: true
}

export function validationReset(value: any, message: string | Array<string>): ValidationResponseReset {
  return {
    isValid: undefined,
    messages: Array.isArray(message) ? message : message ? [message] : [],
    value: value,
  }
}

export function validationError(value: any, message: string | Array<string>): ValidationResponseError {
  return {
    isValid: false,
    messages: Array.isArray(message) ? message : message ? [message] : [],
    value: value,
  }
}

export function validationSuccess(value: any, message?: string | Array<string>): ValidationResponseSuccess {
  return {
    isValid: true,
    messages: Array.isArray(message) ? message : message ? [message] : [],
    value: value,
  }
}

// Check whether a value is considered empty, note that 0 and false are not empty
export function isEmptyValue(value: any) {
  if (Array.isArray(value)) return value.length === 0
  return value === '' || value === null || value === undefined
}

// Check whether a value is a valid http(s) URL
export function isUrl(url: string) {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

// Check whether a value looks like a phone number, allowing common formatting
export function isTel(tel: string) {
  const digits = tel.replace(/[\s().-]/g, '')
  return /^\+?\d{5,15}$/.test(digits)
}

export function isEmail(email: string) {
  const pattern =
    /^[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/

  const emailParts = email.split('@')

  if (emailParts.length !== 2) return false

  const [account, address] = emailParts

  if (account.length > 64) {
    return false
  } else if (address.length > 255) {
    return false
  }

  const domainParts = address.split('.')

  if (domainParts.some((part) => part.length > 63)) {
    return false
  }

  return pattern.test(email)
}

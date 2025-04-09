export interface ValidationResponse {
  isValid: boolean
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

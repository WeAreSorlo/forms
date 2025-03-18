export interface ValidationResponseError {
  isValid: false
  messages: Array<string>
  validatedValue: never
}

export interface ValidationResponseSuccess {
  isValid: true
  messages: never
  validatedValue: any
}

export function validationResponse<
  IsValid extends boolean, // Ensures proper type inference for `isValid`
  T extends Record<string, any>,
>(isValid: IsValid, data: T): { isValid: IsValid } & T {
  return {
    isValid,
    ...data,
  }
}

export function validationError(message?: string | Array<string>): ValidationResponseError {
  return validationResponse(false, {
    messages: Array.isArray(message) ? message : message ? [message] : [],
    validatedValue: undefined as never,
  })
}

export function validationSuccess(value: any): ValidationResponseSuccess {
  return validationResponse(true, {
    messages: undefined as never,
    validatedValue: value,
  })
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

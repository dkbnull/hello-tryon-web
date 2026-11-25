/** 通用校验规则（前后端同规则：≥8 位，四类字符至少 3 类） */

/** 密码字符类别数：大写 / 小写 / 数字 / 特殊字符 */
export function countCharKinds(pwd: string): number {
  return [
    /[A-Z]/.test(pwd),
    /[a-z]/.test(pwd),
    /\d/.test(pwd),
    /[^A-Za-z0-9]/.test(pwd),
  ].filter(Boolean).length
}

/** 密码强度：≥8 位且大写/小写/数字/特殊字符至少 3 类 */
export function checkPasswordStrength(pwd: string): boolean {
  return pwd.length >= 8 && countCharKinds(pwd) >= 3
}

export const PASSWORD_TIP = '至少 8 位，含大写/小写/数字/特殊字符中的 3 类'

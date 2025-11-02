export function formatPhoneNumber(input: string, defaultCountryCode: string = "+1"): string {
  const digits = input.replace(/\D/g, "");
  
  if (!digits) {
    return "";
  }
  
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }
  
  if (digits.length === 10) {
    if (digits.startsWith("6") || digits.startsWith("7") || digits.startsWith("8") || digits.startsWith("9")) {
      return `+91${digits}`;
    }
    return `+1${digits}`;
  }
  
  if (digits.length > 12) {
    return `+${digits}`;
  }
  
  return `${defaultCountryCode}${digits}`;
}

export function isValidPhoneNumber(phoneNumber: string): boolean {
  const formatted = formatPhoneNumber(phoneNumber);
  
  const phoneRegex = /^\+\d{10,15}$/;
  return phoneRegex.test(formatted);
}

export function displayPhoneNumber(phoneNumber: string): string {
  const formatted = formatPhoneNumber(phoneNumber);
  
  if (formatted.startsWith("+1") && formatted.length === 12) {
    const digits = formatted.slice(2);
    return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  if (formatted.startsWith("+91") && formatted.length === 13) {
    const digits = formatted.slice(3);
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  
  if (formatted.length > 12) {
    return formatted.replace(/(\+\d{1,3})(\d{3})(\d{3})(\d+)/, "$1 $2 $3 $4");
  }
  
  return formatted;
}

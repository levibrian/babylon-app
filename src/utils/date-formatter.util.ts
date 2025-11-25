/**
 * Utility functions for formatting dates in the application.
 */

/**
 * Formats a date string to "dd mmm" format (e.g., "17 Nov")
 * @param date - Date string in ISO format or Date object
 * @returns Formatted date string
 */
export function formatDateShort(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const day = dateObj.getDate().toString().padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[dateObj.getMonth()];
  return `${day} ${month}`;
}


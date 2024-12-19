/**
 * Kiểm tra thời gian có định dạng hh:mm hợp lệ hay không
 * @param {string} time - Thời gian dưới dạng chuỗi 'hh:mm'
 * @returns {boolean} Trả về true nếu hợp lệ, ngược lại là false
 */
export const isValidTime = (time) => {
  if (!time) return false;
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/; // Định dạng hh:mm (00:00 đến 23:59)
  return timeRegex.test(time);
};

/**
 * Kiểm tra xem thời gian có trễ hơn ngưỡng không
 * @param {string} time - Thời gian dưới dạng chuỗi 'hh:mm'
 * @param {number} threshold - Ngưỡng thời gian tính bằng phút (ví dụ: 7:15 là 7 * 60 + 15 = 435 phút)
 * @returns {boolean} Trả về true nếu thời gian vượt ngưỡng, ngược lại là false
 */
export const isLate = (time, threshold) => {
  if (!isValidTime(time)) return false; // Kiểm tra xem thời gian có hợp lệ hay không
  const [hours, minutes] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes;
  return totalMinutes > threshold;
};

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
 * Kiểm tra xem thời gian có được coi là trễ hay không (xử lý riêng cho C2)
 * @param {string} time - Thời gian dưới dạng chuỗi 'hh:mm'
 * @param {string} column - Cột đang kiểm tra ('S1', 'S2', 'C1', 'C2')
 * @returns {boolean} Trả về true nếu thời gian là trễ, ngược lại là false
 */
export const isLate = (time, column) => {
  if (!isValidTime(time)) return false;

  const [hours, minutes] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes;

  const MORNING_START = 435; // 07:15
  const MORNING_END = 675;   // 11:15
  const AFTERNOON_START = 780; // 13:00
  const AFTERNOON_END = 1015;  // 17:15

  // Xử lý riêng cho C2
  if (column === "C2") {
    return totalMinutes > AFTERNOON_END; // Trễ nếu < 17:15
  }

  // Sáng: Trễ nếu > 07:15 và <= 11:15
  if (totalMinutes > MORNING_START && totalMinutes <= MORNING_END) {
    return true;
  }

  // Chiều: Trễ nếu > 13:00
  if (totalMinutes > AFTERNOON_START) {
    return true;
  }

  return false; // Không trễ
};

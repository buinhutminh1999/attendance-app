import React, { useState, useEffect, useCallback, memo, forwardRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Box,
} from "@mui/material";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useSnackbar } from "notistack";
import { isTimeString, isLate, isEarly } from "../utils/timeUtils";

// Collection chứa lý do trễ
const LATE_COLLECTION = "lateReasons";
// Tên các ngày trong tuần
const WEEKDAY = ["Chủ Nhật", "Hai", "Ba", "Tư", "Năm", "Sáu", "Bảy"];

// Chuyển "dd/MM/yyyy" thành JS Date
const parseDate = (s) => {
  const [dd, mm, yyyy] = s.split("/").map(Number);
  return new Date(yyyy, mm - 1, dd);
};
// Chuyển "HH:mm" thành phút
const toMinutes = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/**
 * Một hàng attendance, memoized để chỉ render lại khi props thay đổi
 */
const AttendanceRow = memo(
  function AttendanceRow({
    idx,
    row,
    includeSaturday,
    reason,
    editing,
    onStartEdit,
    onSave,
  }) {
    const dateObj = parseDate(row.Ngày);
    const weekday = WEEKDAY[dateObj.getDay()];
    const isSaturday = dateObj.getDay() === 6;
    const hideSat = isSaturday && !includeSaturday;

    // Gom S1,S2,C1,C2, lọc chuỗi giờ, sort tăng dần (dùng cho S2 highlight)
    const allTimes = [row.S1, row.S2, row.C1, row.C2]
      .filter(isTimeString)
      .sort((a, b) => toMinutes(a) - toMinutes(b));

    // Tính S2 (giờ về sáng hoặc giờ cuối nếu Thứ 7)
    const S2calc = hideSat
      ? (allTimes.length ? allTimes[allTimes.length - 1] : "❌")
      : (row.S2 || "❌");

    // *** Tính C1, C2: LUÔN lấy từ row.C1/row.C2
    let C1calc, C2calc;
    if (isSaturday && !includeSaturday) {
      // Thứ 7 & không in  → show “—”
      C1calc = C2calc = "—";
    } else {
      // Mọi trường hợp khác → in thẳng dữ liệu gốc (hoặc ❌ nếu trống)
      C1calc = row.C1 || "❌";
      C2calc = row.C2 || "❌";
    }

    // Render ô lý do editable hoặc hiển thị logic
    const renderReasonCell = (field) => {
      if (field === "afternoon" && hideSat) {
        return <TableCell>—</TableCell>;
      }
      const isActive =
        editing?.rowId === row.id && editing.field === field;
      return (
        <TableCell
          sx={{
            cursor: "pointer",
            backgroundColor: isActive ? "#eef" : "inherit",
          }}
          onDoubleClick={() => onStartEdit(row.id, field, reason[field] || "")}
        >
          {isActive ? (
            <TextField
              size="small"
              autoFocus
              fullWidth
              defaultValue={editing.value}
              onBlur={(e) => onSave(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
          ) : (
            field === "afternoon"
              ? (hideSat ? "—" : (reason.afternoon || ""))
              : (reason.morning || "")
          )}
        </TableCell>
      );
    };

    // Helper highlight
    const cellSx = (timeStr, checkFn, threshold) => ({
      backgroundColor:
        isTimeString(timeStr) && checkFn(timeStr, threshold)
          ? "#FFCCCC"
          : "inherit",
    });

    return (
      <TableRow>
        <TableCell>{idx + 1}</TableCell>
        <TableCell>{row["Tên nhân viên"]}</TableCell>
        <TableCell>{row["Tên bộ phận"]}</TableCell>
        <TableCell>{row.Ngày}</TableCell>
        <TableCell>{weekday}</TableCell>

        {/* S1 */}
        <TableCell sx={cellSx(row.S1, isLate, 7 * 60 + 15)}>
          {row.S1 || "❌"}
        </TableCell>

        {/* S2 */}
        <TableCell sx={cellSx(S2calc, isEarly, 11 * 60 + 15)}>
          {S2calc}
        </TableCell>

        {/* Lý do trễ (Sáng) */}
        {renderReasonCell("morning")}

        {/* C1 */}
        <TableCell sx={hideSat ? {} : cellSx(C1calc, isLate, 13 * 60)}>
          {C1calc}
        </TableCell>

        {/* C2 */}
        <TableCell sx={hideSat ? {} : cellSx(C2calc, isEarly, 17 * 60)}>
          {C2calc}
        </TableCell>

        {/* Lý do trễ (Chiều) */}
        {renderReasonCell("afternoon")}
      </TableRow>
    );
  },
  (prev, next) =>
    prev.row === next.row &&
    prev.reason === next.reason &&
    !prev.editing &&
    !next.editing
);

/**
 * Component chính
 */
export default forwardRef(function AttendanceTable(
  { rows = [], includeSaturday = false, onReasonSave },
  ref
) {
  const [reasons, setReasons] = useState({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState({ rowId: null, field: null, value: "" });
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { enqueueSnackbar } = useSnackbar();

  // Load lý do từ Firestore
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, LATE_COLLECTION));
        const map = {};
        snap.forEach((d) => (map[d.id] = d.data()));
        setReasons(map);
      } catch {
        enqueueSnackbar("Lỗi khi tải lý do", { variant: "error" });
      } finally {
        setLoading(false);
      }
    })();
  }, [enqueueSnackbar]);

  // Lưu lý do mới
  const saveReason = useCallback(
    async (newVal) => {
      const { rowId, field } = editing;
      if (!rowId || !field) return;
      setReasons((prev) => ({
        ...prev,
        [rowId]: { ...prev[rowId], [field]: newVal },
      }));
      onReasonSave?.(rowId, field, newVal);
      setEditing({ rowId: null, field: null, value: "" });
      try {
        await setDoc(
          doc(db, LATE_COLLECTION, rowId),
          { [field]: newVal },
          { merge: true }
        );
        enqueueSnackbar("Lưu lý do thành công", { variant: "success" });
      } catch {
        enqueueSnackbar("Lỗi khi lưu lý do", { variant: "error" });
      }
    },
    [editing, enqueueSnackbar, onReasonSave]
  );

  if (loading) {
    return (
      <Box sx={{ textAlign: "center", my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table size={isMobile ? "small" : "medium"}>
        <TableHead>
          <TableRow>
            <TableCell>STT</TableCell>
            <TableCell>Tên nhân viên</TableCell>
            <TableCell>Tên bộ phận</TableCell>
            <TableCell>Ngày</TableCell>
            <TableCell>Thứ</TableCell>
            <TableCell>S1</TableCell>
            <TableCell>S2</TableCell>
            <TableCell>Lý do trễ (Sáng)</TableCell>
            <TableCell>C1</TableCell>
            <TableCell>C2</TableCell>
            <TableCell>Lý do trễ (Chiều)</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, i) => (
            <AttendanceRow
              key={r.id}
              idx={i}
              row={r}
              includeSaturday={includeSaturday}
              reason={reasons[r.id] || {}}
              editing={editing.rowId === r.id ? editing : null}
              onStartEdit={(rowId, field, val) =>
                setEditing({ rowId, field, value: val })
              }
              onSave={saveReason}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
});

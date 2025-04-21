import React, {
  useState,
  useEffect,
  useCallback,
  memo,
  forwardRef,
} from "react";
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
} from "@mui/material";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useSnackbar } from "notistack";
import {
  isTimeString,
  isLate,
  isEarly,
} from "../utils/timeUtils";

// Tên collection lưu lý do
const LATE_COLLECTION = "lateReasons";
// Thứ trong tuần
const WEEKDAY = ["Chủ Nhật", "Hai", "Ba", "Tư", "Năm", "Sáu", "Bảy"];

// parse "dd/MM/yyyy" → JS Date
const parseDate = (s) => {
  const [dd, mm, yyyy] = s.split("/").map(Number);
  return new Date(yyyy, mm - 1, dd);
};

/**
 * Một hàng attendance, memoized để chỉ render lại khi props thay đổi
 */
const AttendanceRow = memo(
  function AttendanceRow({
    idx,
    row,
    reason,
    editing,
    onStartEdit,
    onSave,
  }) {
    const dateObj = parseDate(row.Ngày);
    const weekday = WEEKDAY[dateObj.getDay()];
    const isSaturday = dateObj.getDay() === 6;

    // render ô lý do editable
    const renderReasonCell = (field) => {
      const isActive =
        editing?.rowId === row.id && editing.field === field;
      return (
        <TableCell
          sx={{
            cursor:
              field === "afternoon" && isSaturday
                ? "default"
                : "pointer",
            backgroundColor: isActive ? "#eef" : "inherit",
          }}
          onDoubleClick={() => {
            if (field === "afternoon" && isSaturday) return;
            onStartEdit(row.id, field, reason[field] || "");
          }}
        >
          {isActive ? (
            <TextField
              size="small"
              autoFocus
              fullWidth
              defaultValue={editing.value}
              onBlur={(e) => onSave(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && e.currentTarget.blur()
              }
            />
          ) : (
            reason[field] || ""
          )}
        </TableCell>
      );
    };

    // helper highlight
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

        {/* S1: highlight nếu sau 07:15 */}
        <TableCell
          sx={cellSx(row.S1, isLate, 7 * 60 + 15)}
        >
          {row.S1}
        </TableCell>

        {/* S2: highlight nếu trước 11:15 */}
        <TableCell
          sx={cellSx(row.S2, isEarly, 11 * 60 + 15)}
        >
          {row.S2}
        </TableCell>

        {/* Lý do trễ (Sáng) */}
        {renderReasonCell("morning")}

        {/* C1: thứ 7 hiện —, khác thì highlight nếu sau 13:00 */}
        <TableCell
          sx={
            isSaturday
              ? {}
              : cellSx(row.C1, isLate, 13 * 60)
          }
        >
          {isSaturday ? "—" : row.C1}
        </TableCell>

        {/* C2: thứ 7 hiện —, khác thì highlight nếu trước 17:00 */}
        <TableCell
          sx={
            isSaturday
              ? {}
              : cellSx(row.C2, isEarly, 17 * 60)
          }
        >
          {isSaturday ? "—" : row.C2}
        </TableCell>

        {/* Lý do trễ (Chiều), thứ 7 không cho sửa */}
        {isSaturday ? (
          <TableCell >
            —
          </TableCell>
        ) : (
          renderReasonCell("afternoon")
        )}
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
  { rows = [], onReasonSave },
  ref
) {
  const [reasons, setReasons] = useState({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState({
    rowId: null,
    field: null,
    value: "",
  });
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { enqueueSnackbar } = useSnackbar();

  // Load lý do từ Firestore
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, LATE_COLLECTION));
        const map = {};
        snap.forEach((d) => {
          map[d.id] = d.data();
        });
        setReasons(map);
      } catch {
        enqueueSnackbar("Lỗi khi tải lý do", {
          variant: "error",
        });
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
      // Cập nhật local
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
        enqueueSnackbar("Lưu lý do thành công", {
          variant: "success",
        });
      } catch {
        enqueueSnackbar("Lỗi khi lưu lý do", {
          variant: "error",
        });
      }
    },
    [editing, enqueueSnackbar, onReasonSave]
  );

  if (loading) {
    return (
      <CircularProgress
        sx={{ display: "block", mx: "auto", my: 4 }}
      />
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
              reason={reasons[r.id] || {}}
              editing={
                editing.rowId === r.id ? editing : null
              }
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

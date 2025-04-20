// src/components/AttendanceTable.js
import React, {
  useState,
  useEffect,
  useCallback,
  memo,
  forwardRef,
  useImperativeHandle,
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
import { isLate } from "../utils/timeUtils";   // ← import isLate

const LATE_COLLECTION = "lateReasons";
const WEEKDAY = ["Chủ Nhật","Hai","Ba","Tư","Năm","Sáu","Bảy"];

// helper parse "dd/MM/yyyy" → Date
const parseDate = (s) => {
  const [dd, mm, yyyy] = s.split("/").map(Number);
  return new Date(yyyy, mm - 1, dd);
};

/**
 * Một row memoized để tránh re-render hàng loạt khi gõ
 */
const AttendanceRow = memo(function AttendanceRow({
  idx,
  row,
  reason = {},
  editing,
  onStartEdit,
  onChangeValue,
  onSave,
}) {
  const dateObj = parseDate(row.Ngày);
  const weekday = WEEKDAY[dateObj.getDay()];
  const isSat = dateObj.getDay() === 6;

  // giá trị C1/C2 trên thứ 7 là "—"
  const c1Val = isSat ? "—" : row.C1 || "❌";
  const c2Val = isSat ? "—" : row.C2 || "❌";

  // cell có thể edit
  const renderEditable = (field, val) => {
    const isActive =
      editing?.rowId === row.id && editing.field === field;
    return (
      <TableCell
        onClick={() => {
          if (field === "afternoon" && isSat) return;
          onStartEdit(row.id, field, val);
        }}
        sx={{
          cursor:
            field === "afternoon" && isSat ? "default" : "pointer",
          backgroundColor: isActive ? "#eef" : "inherit",
        }}
      >
        {isActive ? (
          <TextField
            size="small"
            autoFocus
            fullWidth
            value={editing.value}
            onChange={(e) => onChangeValue(e.target.value)}
            onBlur={() => onSave(editing.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSave(editing.value);
            }}
          />
        ) : (
          val
        )}
      </TableCell>
    );
  };

  return (
    <TableRow>
      <TableCell>{idx + 1}</TableCell>
      <TableCell>{row["Tên nhân viên"]}</TableCell>
      <TableCell>{row["Tên bộ phận"]}</TableCell>
      <TableCell>{row.Ngày}</TableCell>
      <TableCell>{weekday}</TableCell>

      {/* ★ Highlight S1 nếu sau 07:15 */}
      <TableCell
        sx={{
          backgroundColor:
            row.S1 && isLate(row.S1, 7 * 60 + 15)
              ? "#FFCCCC"
              : "inherit",
        }}
      >
        {row.S1 || "❌"}
      </TableCell>

      <TableCell>{row.S2 || "❌"}</TableCell>

      {/* lý do trễ sáng */}
      {renderEditable("morning", reason.morning || "")}

      {/* ★ Highlight C1 nếu sau 13:00 */}
      <TableCell
        sx={{
          backgroundColor:
            c1Val !== "—" && isLate(c1Val, 13 * 60)
              ? "#FFCCCC"
              : "inherit",
        }}
      >
        {c1Val}
      </TableCell>

      <TableCell>{c2Val}</TableCell>

      {/* lý do trễ chiều (bỏ edit thứ 7) */}
      {isSat ? (
        <TableCell>—</TableCell>
      ) : (
        renderEditable("afternoon", reason.afternoon || "")
      )}
    </TableRow>
  );
},
// chỉ re-render khi chính row này hoặc editing/values thay đổi
(prev, next) => {
  return (
    prev.row === next.row &&
    prev.reason === next.reason &&
    !prev.editing &&
    !next.editing
  );
});

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

  // load lý do từ Firestore
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(
          collection(db, LATE_COLLECTION)
        );
        const map = {};
        snap.forEach((d) => (map[d.id] = d.data()));
        setReasons(map);
      } catch (err) {
        enqueueSnackbar("Lỗi khi tải lý do", {
          variant: "error",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [enqueueSnackbar]);

  // save 1 lý do
  const saveReason = useCallback(
    async (newVal) => {
      const { rowId, field } = editing;
      if (!rowId || !field) return;
      // 1) cập nhật local
      setReasons((r) => ({
        ...r,
        [rowId]: { ...r[rowId], [field]: newVal },
      }));
      // 2) báo Home cập nhật ngay để in được
      onReasonSave?.(rowId, field, newVal);
      // 3) clear editing
      setEditing({ rowId: null, field: null, value: "" });
      // 4) lưu lên Firestore
      try {
        await setDoc(
          doc(db, LATE_COLLECTION, rowId),
          { [field]: newVal },
          { merge: true }
        );
        enqueueSnackbar("Lưu lý do thành công!", {
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
              onStartEdit={(rid, field, val) =>
                setEditing({ rowId: rid, field, value: val })
              }
              onChangeValue={(v) =>
                setEditing((p) => ({ ...p, value: v }))
              }
              onSave={saveReason}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
});

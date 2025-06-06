// src/components/AttendanceTable.jsx

import React, {
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useMemo,
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
  Box,
  Typography,
  Tooltip,
  IconButton,
  useTheme,
  useMediaQuery,
  TablePagination,
} from "@mui/material";
import { Edit as EditIcon } from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { isTimeString, isLate, isEarly } from "../utils/timeUtils";

// Danh sách tên ngày trong tuần
const WEEKDAY = [
  "Chủ Nhật",
  "Hai",
  "Ba",
  "Tư",
  "Năm",
  "Sáu",
  "Bảy",
];

// parse "DD/MM/YYYY" -> Date object
const parseDate = (s) => {
  const [dd, mm, yyyy] = s.split("/").map(Number);
  return new Date(yyyy, mm - 1, dd);
};

// convert "HH:MM" -> minutes
const toMinutes = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

function AttendanceRow({
  idx,
  row,
  includeSaturday,
  reason,
  editing,
  onStartEdit,
  onSave,
  isMobile,
}) {
  const theme = useTheme();
  const dateObj = parseDate(row.Ngày);
  const weekday = WEEKDAY[dateObj.getDay()];
  const isSaturday = dateObj.getDay() === 6;
  const hideSat = isSaturday && !includeSaturday;

  // Tính S2 / C1 / C2
  const S2calc = row.S2 || "❌";
  let C1calc, C2calc;
  if (isSaturday && !includeSaturday) {
    C1calc = C2calc = "—";
  } else {
    C1calc = row.C1 || "❌";
    C2calc = row.C2 || "❌";
  }

  // Style cho ô giờ: nếu trễ/sớm thì đổi nền
  const cellSx = (timeStr, checkFn, threshold) => ({
    backgroundColor:
      isTimeString(timeStr) && checkFn(timeStr, threshold)
        ? theme.palette.error.light
        : "inherit",
    px: 1,
    py: isMobile ? 0.5 : 1,
    minWidth: 80,
    textAlign: "center",
  });

  // Style cho ô "Lý do" (cho phép wrap dòng, giới hạn max-width)
  const reasonCellSx = {
    px: 1,
    py: isMobile ? 0.5 : 1,
    minWidth: 120,
    wordBreak: "break-word",
    whiteSpace: "normal",
    maxWidth: 140,
    cursor: "pointer",
  };

  // Hàm render ô lý do (morning hoặc afternoon)
  const renderReasonCell = (field) => {
    // Nếu là chiều thứ 7 mà không hiển thị thứ 7, hiển thị dấu —
    if (field === "afternoon" && hideSat) {
      return (
        <TableCell
          align="center"
          sx={{ px: 1, py: isMobile ? 0.5 : 1, minWidth: 120 }}
        >
          —
        </TableCell>
      );
    }

    const isActive = editing?.rowId === row.id && editing.field === field;
    const currentReason = reason[field] || "";

    // Nếu không đang edit, hiển thị Tooltip + text + icon edit
    if (!isActive) {
      return (
        <TableCell
          aria-label={`Lý do trễ ${
            field === "morning" ? "sáng" : "chiều"
          } của ${row["Tên nhân viên"]} ngày ${row.Ngày}`}
          sx={reasonCellSx}
          onClick={() => onStartEdit(row.id, field, currentReason)}
        >
          <Box display="flex" alignItems="center">
            <Tooltip
              title={currentReason || "Nhấn để thêm lý do"}
              placement="top"
              arrow
            >
              <Typography
                variant="body2"
                sx={{
                  flex: 1,
                  mr: 0.5,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {currentReason || <em style={{ color: "#999" }}>Chưa có</em>}
              </Typography>
            </Tooltip>
            <IconButton
              size="small"
              onClick={() => onStartEdit(row.id, field, currentReason)}
            >
              <EditIcon
                fontSize="small"
                color={currentReason ? "primary" : "disabled"}
              />
            </IconButton>
          </Box>
        </TableCell>
      );
    }

    // Nếu đang edit, hiển thị TextField để gõ lý do
    return (
      <TableCell sx={reasonCellSx}>
        <TextField
          size="small"
          autoFocus
          fullWidth
          defaultValue={editing.value}
          onBlur={(e) => onSave(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
            if (e.key === "Escape") {
              // Nếu nhấn Esc, hủy edit (gui giá trị cũ)
              onSave(editing.value);
            }
          }}
          sx={{ fontSize: "0.875rem" }}
        />
      </TableCell>
    );
  };

  return (
    <TableRow
      hover
      sx={{
        "&:nth-of-type(odd)": {
          backgroundColor: "#fafafa",
        },
        "&:hover": {
          backgroundColor: "#e3f2fd",
        },
      }}
    >
      {/* STT (sticky) */}
      <TableCell
        align="center"
        sx={{
          position: "sticky",
          left: 0,
          backgroundColor: theme.palette.background.paper,
          zIndex: 10,
          px: 1,
          py: isMobile ? 0.5 : 1,
          minWidth: 40,
        }}
      >
        <Typography variant="body2">{idx + 1}</Typography>
      </TableCell>

      {/* Tên nhân viên (sticky) */}
      <TableCell
        sx={{
          position: "sticky",
          left: 40,
          backgroundColor: theme.palette.background.paper,
          zIndex: 9,
          px: 1,
          py: isMobile ? 0.5 : 1,
          minWidth: 120,
        }}
      >
        <Typography variant="body2" noWrap>
          {row["Tên nhân viên"]}
        </Typography>
      </TableCell>

      {/* Tên bộ phận */}
      <TableCell sx={{ px: 1, py: isMobile ? 0.5 : 1, minWidth: 120 }}>
        <Typography variant="body2" noWrap>
          {row["Tên bộ phận"]}
        </Typography>
      </TableCell>

      {/* Ngày */}
      <TableCell
        align="center"
        sx={{ px: 1, py: isMobile ? 0.5 : 1, minWidth: 100 }}
      >
        <Typography variant="body2">{row.Ngày}</Typography>
      </TableCell>

      {/* Thứ */}
      <TableCell
        align="center"
        sx={{ px: 1, py: isMobile ? 0.5 : 1, minWidth: 80 }}
      >
        <Typography variant="body2">{weekday}</Typography>
      </TableCell>

      {/* S1 */}
      <TableCell sx={cellSx(row.S1, isLate, 7 * 60 + 15)}>
        <Typography variant="body2">{row.S1 || "❌"}</Typography>
      </TableCell>

      {/* S2 */}
      <TableCell sx={cellSx(S2calc, isEarly, 11 * 60 + 15)}>
        <Typography variant="body2">{S2calc}</Typography>
      </TableCell>

      {/* Lý do trễ (Sáng) */}
      {renderReasonCell("morning")}

      {/* C1 */}
      <TableCell
        sx={
          isSaturday && !includeSaturday
            ? { px: 1, py: isMobile ? 0.5 : 1, minWidth: 80 }
            : cellSx(C1calc, isLate, 13 * 60)
        }
      >
        <Typography variant="body2">{C1calc}</Typography>
      </TableCell>

      {/* C2 */}
      <TableCell
        sx={
          isSaturday && !includeSaturday
            ? { px: 1, py: isMobile ? 0.5 : 1, minWidth: 80 }
            : cellSx(C2calc, isEarly, 17 * 60)
        }
      >
        <Typography variant="body2">{C2calc}</Typography>
      </TableCell>

      {/* Lý do trễ (Chiều) */}
      {renderReasonCell("afternoon")}
    </TableRow>
  );
}

export default forwardRef(function AttendanceTable(
  {
    rows = [],
    includeSaturday = false,
    onReasonSave,
    reasons = {},
    isMobile = false,
  },
  ref
) {
  const theme = useTheme();
  // matchesSm dùng chỉ để giảm font/padding, không ẩn cột
  const matchesSm = useMediaQuery(theme.breakpoints.down("sm"));
  const effectiveMobile = isMobile || matchesSm;

  const { enqueueSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState({
    rowId: null,
    field: null,
    value: "",
  });

  // State cho pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  // Sort rows theo ngày tăng dần
  const sortedRows = useMemo(() => {
    const tmp = [...rows];
    tmp.sort((a, b) => parseDate(a.Ngày) - parseDate(b.Ngày));
    return tmp;
  }, [rows]);

  // Tính visibleRows mỗi khi page hoặc rowsPerPage đổi
  const visibleRows = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedRows.slice(start, start + rowsPerPage);
  }, [sortedRows, page, rowsPerPage]);

  const count = sortedRows.length;

  // Vì Home đã truyền `reasons`, ta chỉ cần setLoading(false)
  useEffect(() => {
    setLoading(false);
  }, []);

  // Hàm lưu lý do (gọi callback onReasonSave từ Home)
  const saveReason = useCallback(
    async (newVal) => {
      const { rowId, field } = editing;
      if (!rowId || !field) return;

      const oldVal = reasons[rowId]?.[field] || "";
      if (newVal.trim() === oldVal.trim()) {
        setEditing({ rowId: null, field: null, value: "" });
        return;
      }
      try {
        await onReasonSave(rowId, field, newVal.trim());
      } catch {
        // ignore nếu Home không ném lỗi
      } finally {
        setEditing({ rowId: null, field: null, value: "" });
      }
    },
    [editing, onReasonSave, reasons]
  );

  // Nếu đang loading, hiển thị spinner
  if (loading) {
    return (
      <Box sx={{ textAlign: "center", my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Nếu trong mobile nhỏ (<= 600px), chuyển sang Card View
  if (matchesSm) {
    return (
      <Box>
        {visibleRows.map((r, i) => {
          const dateObj = parseDate(r.Ngày);
          const weekday = WEEKDAY[dateObj.getDay()];
          const isSaturday = dateObj.getDay() === 6;
          const hideSat = isSaturday && !includeSaturday;

          // Tính S2/C1/C2 để show trên Card
          const S2calc = r.S2 || "❌";
          let C1calc, C2calc;
          if (isSaturday && !includeSaturday) {
            C1calc = C2calc = "—";
          } else {
            C1calc = r.C1 || "❌";
            C2calc = r.C2 || "❌";
          }

          return (
            <Paper
              key={r.id}
              sx={{
                mb: 2,
                p: 1,
                backgroundColor: "#fafafa",
              }}
              elevation={1}
            >
              <Typography variant="subtitle2" gutterBottom>
                {page * rowsPerPage + i + 1}. {r["Tên nhân viên"]}
              </Typography>

              <Typography variant="body2">
                <strong>Phòng ban:</strong> {r["Tên bộ phận"]}
              </Typography>

              <Typography variant="body2">
                <strong>Ngày:</strong> {r.Ngày} (Thứ {weekday})
              </Typography>

              <Typography variant="body2">
                <strong>S1:</strong> {r.S1 || "❌"}{" "}
                <strong>S2:</strong> {S2calc}
              </Typography>

              <Box display="flex" flexWrap="wrap" alignItems="center" sx={{ mt: 0.5 }}>
                <Typography
                  variant="body2"
                  sx={{
                    wordBreak: "break-word",
                    whiteSpace: "normal",
                    maxWidth: 200,
                    mr: 0.5,
                  }}
                >
                  <strong>Lý do trễ (Sáng):</strong> {reasons[r.id]?.morning || "-"}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => setEditing({ rowId: r.id, field: "morning", value: reasons[r.id]?.morning || "" })}
                >
                  <EditIcon
                    fontSize="small"
                    color={reasons[r.id]?.morning ? "primary" : "disabled"}
                  />
                </IconButton>
              </Box>

              <Typography variant="body2" sx={{ mt: 0.5 }}>
                <strong>C1:</strong> {C1calc}{" "}
                <strong>C2:</strong> {C2calc}
              </Typography>

              <Box display="flex" flexWrap="wrap" alignItems="center" sx={{ mt: 0.5 }}>
                <Typography
                  variant="body2"
                  sx={{
                    wordBreak: "break-word",
                    whiteSpace: "normal",
                    maxWidth: 200,
                    mr: 0.5,
                  }}
                >
                  <strong>Lý do trễ (Chiều):</strong>{" "}
                  {hideSat ? "—" : reasons[r.id]?.afternoon || "-"}
                </Typography>
                {!hideSat && (
                  <IconButton
                    size="small"
                    onClick={() => setEditing({ rowId: r.id, field: "afternoon", value: reasons[r.id]?.afternoon || "" })}
                  >
                    <EditIcon
                      fontSize="small"
                      color={reasons[r.id]?.afternoon ? "primary" : "disabled"}
                    />
                  </IconButton>
                )}
              </Box>
            </Paper>
          );
        })}

        {/* Pagination ở cuối Card List */}
        <TablePagination
          rowsPerPageOptions={[10, 20, 50]}
          component="div"
          count={count}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Box>
    );
  }

  // Nếu không phải mobile nhỏ, hiển thị Table như bình thường
  return (
    <TableContainer
      component={Paper}
      sx={{
        overflowX: "auto",
        maxHeight: effectiveMobile ? "none" : 600,
        "& .MuiTableCell-head": {
          position: "sticky",
          top: 0,
          backgroundColor: theme.palette.background.paper,
          zIndex: 8,
        },
      }}
    >
      <Table size={effectiveMobile ? "small" : "medium"} stickyHeader>
        <TableHead>
          <TableRow>
            {/* STT (sticky) */}
            <TableCell
              align="center"
              sx={{
                position: "sticky",
                left: 0,
                backgroundColor: theme.palette.background.paper,
                zIndex: 10,
                minWidth: 40,
                px: 1,
                py: effectiveMobile ? 0.5 : 1,
              }}
            >
              STT
            </TableCell>

            {/* Tên nhân viên (sticky) */}
            <TableCell
              sx={{
                position: "sticky",
                left: 40,
                backgroundColor: theme.palette.background.paper,
                zIndex: 9,
                minWidth: 120,
                px: 1,
                py: effectiveMobile ? 0.5 : 1,
              }}
            >
              Tên nhân viên
            </TableCell>

            {/* Các cột còn lại */}
            <TableCell sx={{ minWidth: 120, px: 1, py: effectiveMobile ? 0.5 : 1 }}>
              Tên bộ phận
            </TableCell>
            <TableCell
              align="center"
              sx={{ minWidth: 100, px: 1, py: effectiveMobile ? 0.5 : 1 }}
            >
              Ngày
            </TableCell>
            <TableCell
              align="center"
              sx={{ minWidth: 80, px: 1, py: effectiveMobile ? 0.5 : 1 }}
            >
              Thứ
            </TableCell>
            <TableCell
              align="center"
              sx={{ minWidth: 80, px: 1, py: effectiveMobile ? 0.5 : 1 }}
            >
              S1
            </TableCell>
            <TableCell
              align="center"
              sx={{ minWidth: 80, px: 1, py: effectiveMobile ? 0.5 : 1 }}
            >
              S2
            </TableCell>
            <TableCell
              align="center"
              sx={{ minWidth: 120, px: 1, py: effectiveMobile ? 0.5 : 1 }}
            >
              Lý do trễ (Sáng)
            </TableCell>
            <TableCell
              align="center"
              sx={{ minWidth: 80, px: 1, py: effectiveMobile ? 0.5 : 1 }}
            >
              C1
            </TableCell>
            <TableCell
              align="center"
              sx={{ minWidth: 80, px: 1, py: effectiveMobile ? 0.5 : 1 }}
            >
              C2
            </TableCell>
            <TableCell
              align="center"
              sx={{ minWidth: 120, px: 1, py: effectiveMobile ? 0.5 : 1 }}
            >
              Lý do trễ (Chiều)
            </TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {visibleRows.map((r, i) => (
            <AttendanceRow
              key={r.id}
              idx={page * rowsPerPage + i}
              row={r}
              includeSaturday={includeSaturday}
              reason={reasons[r.id] || {}}
              editing={editing.rowId === r.id ? editing : null}
              onStartEdit={(rowId, field, val) =>
                setEditing({ rowId, field, value: val })
              }
              onSave={saveReason}
              isMobile={effectiveMobile}
            />
          ))}
        </TableBody>
      </Table>

      <TablePagination
        rowsPerPageOptions={[10, 20, 50]}
        component="div"
        count={count}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(e, newPage) => setPage(newPage)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
      />
    </TableContainer>
  );
});
